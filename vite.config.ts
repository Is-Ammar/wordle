import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Use relative paths in production so it works under any subpath (GitHub Pages)
  base: command === 'build' ? './' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}));
