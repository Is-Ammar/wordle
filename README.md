# Wordle Clone

A beautiful, fully-featured Wordle clone built with React, TypeScript, and Vite.

🎮 **Live Demo**: https://is-ammar.github.io/wordle/

## Features

- Daily word puzzles using real Wordle solutions
- Keyboard support (both physical and virtual)
- Letter status tracking with color coding
- Game state persistence using localStorage
- Smooth animations and transitions
- Responsive design
- GitHub Pages deployment ready

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to GitHub Pages

### Automatic Deployment (Recommended)

This project is configured for automatic deployment to GitHub Pages using GitHub Actions:

1. Push your code to the `main` branch
2. Go to your repository Settings → Pages
3. Set Source to "GitHub Actions"
4. The site will be automatically built and deployed on every push

### Manual Deployment

If you prefer manual deployment:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build and deploy:
   ```bash
   npm run deploy
   ```

## Configuration

The project is configured to work with GitHub Pages out of the box. The base path is automatically set to `/wordle/` for production builds (matching your repository name).

If you fork this project or rename your repository, update the base path in `vite.config.ts`:

```typescript
base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/',
```

## Technologies Used

- React 18
- TypeScript
- Vite
- CSS3 with animations
- GitHub Pages for hosting
- GitHub Actions for CI/CD

## Game Rules

- Guess the 5-letter word in 6 tries
- Green letters are correct and in the right position
- Yellow letters are in the word but in the wrong position  
- Gray letters are not in the word
- Each guess must be a valid 5-letter word

Enjoy playing Wordle!
