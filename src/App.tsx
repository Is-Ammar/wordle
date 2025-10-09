import React, { useEffect, useState } from 'react';

import { fetchSolutionFor, formatDateLocal } from './lib/words';

type LetterStatus = 'correct' | 'present' | 'absent' | undefined;

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function App() {
  const [solution, setSolution] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [allowed, setAllowed] = useState<Set<string> | null>(null);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(0);
  const [submittedRows, setSubmittedRows] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string>('');
  const [letterStatus, setLetterStatus] = useState<Record<string, LetterStatus>>({});
  const [guesses, setGuesses] = useState<string[]>(() => Array(MAX_GUESSES).fill(''));
  const [rowStatuses, setRowStatuses] = useState<Array<LetterStatus[] | null>>(
    () => Array(MAX_GUESSES).fill(null)
  );

  const [rowAnim, setRowAnim] = useState<Record<number, { reveal?: boolean; shake?: boolean; victory?: boolean; bounce?: boolean }>>({});
  const [revealMask, setRevealMask] = useState<Record<number, boolean[]>>({});
  const [completed, setCompleted] = useState<boolean>(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);

  type SavedState = {
    date: string;
    solution: string;
    guesses: string[];
    rowStatuses: Array<LetterStatus[] | null>;
    letterStatus: Record<string, LetterStatus>;
    currentRowIndex: number;
    submittedRows: number[];
    completed: boolean;
    result: 'win' | 'lose' | null;
  };

  const getSaveKey = () => `wordle-game-${formatDateLocal(new Date())}`;

  const saveGame = (override?: Partial<SavedState>) => {
    try {
      const payload: SavedState = {
        date: formatDateLocal(new Date()),
        solution,
        guesses,
        rowStatuses,
        letterStatus,
        currentRowIndex,
        submittedRows: Array.from(submittedRows),
        completed,
        result,
        ...override,
      } as SavedState;
      localStorage.setItem(getSaveKey(), JSON.stringify(payload));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const today = new Date();
        const sol = await fetchSolutionFor(today);
        setSolution(sol);
        const res = await fetch(`${import.meta.env.BASE_URL}allowed.txt`);
        if (res.ok) {
          const txt = await res.text();
          const list = txt.split('\n').map((w) => w.trim().toLowerCase()).filter((w) => w.length === 5);
          setAllowed(new Set(list));
        } else {
          console.warn('Failed to load allowed words list');
          setAllowed(new Set());
        }
        // Try to restore saved state for today
        try {
          const raw = localStorage.getItem(getSaveKey());
          if (raw) {
            const saved = JSON.parse(raw) as SavedState;
            if (saved?.solution === sol) {
              setGuesses(saved.guesses || Array(MAX_GUESSES).fill(''));
              setRowStatuses(saved.rowStatuses || Array(MAX_GUESSES).fill(null));
              setLetterStatus(saved.letterStatus || {});
              setCurrentRowIndex(saved.currentRowIndex || 0);
              setSubmittedRows(new Set(saved.submittedRows || []));
              setCompleted(!!saved.completed);
              setResult(saved.result ?? null);
              // Ensure revealed colors for submitted rows on load
              const mask: Record<number, boolean[]> = {};
              (saved.submittedRows || []).forEach((r) => { mask[r] = Array(WORD_LENGTH).fill(true); });
              setRevealMask(mask);
              if (saved.completed) {
                if (saved.result === 'lose') setMessage(`Game over! The word was ${sol}`);
                else setMessage('');
              }
            } else {
              // Different solution/day, clear old save
              localStorage.removeItem(getSaveKey());
            }
          }
        } catch {}
      } catch (e: any) {
        setLoadError(e?.message || 'Failed to load Wordle solution');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist on any meaningful state change for the current day
  useEffect(() => {
    if (!solution) return;
    // Avoid saving before initial load finishes
    if (loading || !!loadError) return;
    saveGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solution, guesses, rowStatuses, letterStatus, currentRowIndex, submittedRows, completed, result, loading, loadError]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (loading || loadError || !solution || !allowed || completed) return;
      if (submittedRows.has(currentRowIndex)) return;
      if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
        handleKeyPress(event.key.toLowerCase());
      } else if (event.key === 'Enter') {
        handleSubmitGuess();
      } else if (event.key === 'Backspace') {
        if (currentGuess.length > 0) {
          setCurrentGuess((g: string) => g.slice(0, -1));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentGuess, currentRowIndex, submittedRows, loading, loadError, solution, allowed, completed]);

  function handleKeyPress(key: string) {
    if (loading || loadError || !solution || !allowed || completed) return;
    setMessage('');
    setCurrentGuess((g: string) => (g.length < WORD_LENGTH ? g + key : g));
  }

  function scoreGuess(guess: string): LetterStatus[] {
    const statuses: LetterStatus[] = new Array(WORD_LENGTH).fill('absent');
    const solArr = solution.split('');
    const guessArr = guess.split('');
    const counts: Record<string, number> = {};
    for (const ch of solArr) counts[ch] = (counts[ch] || 0) + 1;
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === solArr[i]) {
        statuses[i] = 'correct';
        counts[guessArr[i]]!--;
      }
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (statuses[i] === 'correct') continue;
      const ch = guessArr[i];
      if (counts[ch] > 0) {
        statuses[i] = 'present';
        counts[ch]!--;
      }
    }
    return statuses;
  }

  function handleSubmitGuess() {
    if (loading || loadError || !solution || !allowed || completed) return;
    if (currentGuess.length !== WORD_LENGTH) {
      setMessage(`Not enough letters`);
      setRowAnim((prev) => ({ ...prev, [currentRowIndex]: { ...prev[currentRowIndex], shake: true } }));
      setTimeout(() => {
        setRowAnim((prev) => ({ ...prev, [currentRowIndex]: { ...prev[currentRowIndex], shake: false } }));
      }, 600);
      return;
    }
    if (allowed && !allowed.has(currentGuess)) {
      setMessage('Not in word list');
      setRowAnim((prev) => ({ ...prev, [currentRowIndex]: { ...prev[currentRowIndex], shake: true } }));
      setTimeout(() => {
        setRowAnim((prev) => ({ ...prev, [currentRowIndex]: { ...prev[currentRowIndex], shake: false } }));
      }, 600);
      return;
    }

    const statuses = scoreGuess(currentGuess);
    const isWin = statuses.every((s) => s === 'correct');
    const isLast = currentRowIndex === MAX_GUESSES - 1;
    // If win or last attempt, immediately mark completed to block further input
    if (isWin) {
      setCompleted(true);
      setResult('win');
    } else if (isLast) {
      setCompleted(true);
      setResult('lose');
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = currentGuess[i];
      const s = statuses[i]!;
      const delay = 200 * i + 250;
      setTimeout(() => {
        setLetterStatus((prev) => {
          const next = { ...prev } as Record<string, LetterStatus>;
          const prevStatus = next[letter];
          if (prevStatus === 'correct') return next;
          if (prevStatus === 'present' && s === 'absent') return next;
          next[letter] = s;
          return next;
        });
      }, delay);
    }
    setGuesses((prev: string[]) => {
      const next = [...prev];
      next[currentRowIndex] = currentGuess;
      return next;
    });
    setRowStatuses((prev: Array<LetterStatus[] | null>) => {
      const next = [...prev];
      next[currentRowIndex] = statuses;
      return next;
    });
    setSubmittedRows((prev: Set<number>) => new Set(prev).add(currentRowIndex));

    setRowAnim((prev) => ({
      ...prev,
      [currentRowIndex]: { ...prev[currentRowIndex], bounce: true, reveal: true },
    }));
    for (let i = 0; i < WORD_LENGTH; i++) {
      const delay = 200 * i + 250;
      setTimeout(() => {
        setRevealMask((prev) => {
          const row = prev[currentRowIndex] ? [...prev[currentRowIndex]] : Array(WORD_LENGTH).fill(false);
          row[i] = true;
          return { ...prev, [currentRowIndex]: row };
        });
      }, delay);
    }
    setTimeout(() => {
      setRowAnim((prev) => ({ ...prev, [currentRowIndex]: { ...prev[currentRowIndex], bounce: false } }));
    }, 120);

    if (isWin) {
      const revealTotal = 500 + (WORD_LENGTH - 1) * 200;
      setTimeout(() => {
        setRowAnim((prev) => ({ ...prev, [currentRowIndex]: { ...prev[currentRowIndex], victory: true } }));
        setMessage('');
      }, revealTotal);
      // Ensure save after marking victory
      saveGame({ completed: true, result: 'win' });
    } else if (currentRowIndex < MAX_GUESSES - 1 && !completed) {

      const revealTotal = 500 + (WORD_LENGTH - 1) * 200;
      setTimeout(() => {
        setCurrentRowIndex((i: number) => i + 1);
        setCurrentGuess('');
      }, revealTotal);
    } else {
      setMessage(`Game over! The word was ${solution}`);
      saveGame({ completed: true, result: 'lose' });
    }

    // Persist after every submission
    setTimeout(() => {
      saveGame();
    }, 0);
  }

  const keyboardRows: Array<Array<string>> = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['enter','z','x','c','v','b','n','m','back']
  ];

  const handleVirtualKey = (k: string) => {
    if (loading || loadError || !solution || !allowed || completed) return;
    if (submittedRows.has(currentRowIndex)) return;
    if (k === 'enter') return handleSubmitGuess();
    if (k === 'back') {
      if (submittedRows.has(currentRowIndex)) return;
      if (currentGuess.length > 0) setCurrentGuess((g) => g.slice(0, -1));
      return;
    }
    handleKeyPress(k);
  };

  return (
    <div id="game-container">
      <header id="header"><h1 className="title">WORDLE</h1></header>
      {loading && <div id="message">Loading {formatDateLocal(new Date())}…</div>}
      {loadError && <div id="message">{loadError}</div>}
      <main id="board">
      <div id="grid">
        {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className={
              'row' +
              (rowAnim[rowIdx]?.reveal ? ' reveal' : '') +
              (rowAnim[rowIdx]?.shake ? ' shake' : '') +
              (rowAnim[rowIdx]?.bounce ? ' bounce' : '') +
              (rowAnim[rowIdx]?.victory ? ' victory' : '')
            }
          >
            {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
              const isSubmitted = submittedRows.has(rowIdx);
              const guess = guesses[rowIdx] ?? '';
              let letter: string = '';
              if (isSubmitted) {
                letter = guess[colIdx] ?? '';
              } else if (rowIdx === currentRowIndex) {
                letter = currentGuess[colIdx] ?? '';
              } else {
                letter = guess[colIdx] ?? '';
              }
              let className = 'cell';
              const statusesForRow = rowStatuses[rowIdx];
              const revealed = revealMask[rowIdx]?.[colIdx];
              const s = isSubmitted && statusesForRow && revealed ? statusesForRow[colIdx] : undefined;
              if (s) className += ` ${s}`;
              return (
                <div key={colIdx} className={className}>
                  {letter ? letter.toUpperCase() : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div id="keyboard">
        {keyboardRows.map((row, idx) => (
          <div className="keyboard-row" key={idx}>
            {row.map((k) => (
              <button
                key={k}
                className={
                  'key' +
                  (k === 'enter' ? ' enter' : '') +
                  (k === 'back' ? ' back' : '') +
                  (' ' + (letterStatus[k] ?? ''))
                }
                onClick={() => handleVirtualKey(k)}
                disabled={loading || !!loadError || !solution || !allowed || submittedRows.has(currentRowIndex) || completed}
              >
                {k === 'enter' ? 'ENTER' : k === 'back' ? '⌫' : k.toUpperCase()}
              </button>
            ))}
          </div>
        ))}
      </div>
      {message && <div id="message" role="alert">{message}</div>}
      </main>
    </div>
  );
}

export default App;
