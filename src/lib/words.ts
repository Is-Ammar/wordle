export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function fetchSolutionFor(date: Date): Promise<string> {
  const key = formatDateLocal(date);
  const cacheKey = `nyt-wordle-solution-${key}`;
  const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  if (cached) return cached;

  const baseUrl = `https://www.nytimes.com/svc/wordle/v2/${key}.json`;
  const tryFetch = async (u: string): Promise<string | null> => {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 5000);
      const resp = await fetch(u, { signal: ac.signal });
      clearTimeout(t);
      if (!resp.ok) return null;
      const data = await resp.json();
      const sol = (data?.solution as string)?.toLowerCase();
      return sol && sol.length === 5 ? sol : null;
    } catch {
      return null;
    }
  };

  let solution = await tryFetch(baseUrl);
  if (!solution) {
    const proxy1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;
    solution = await tryFetch(proxy1);
  }

  if (!solution) {
    const proxy2 = `https://r.jina.ai/http://www.nytimes.com/svc/wordle/v2/${key}.json`;
    solution = await tryFetch(proxy2);
  }

  if (!solution) throw new Error('Failed to fetch NYT Wordle');

  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(cacheKey, solution);
  } catch {}
  return solution;
}

export default {} as unknown as never;
