import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment
  // If deploying to https://username.github.io/repo-name/, set base to '/repo-name/'
  // If deploying to a custom domain or root, set to '/'
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    // Output directory
    outDir: 'dist',
    // Generate sourcemaps for production debugging (optional)
    sourcemap: false,
    // Optimize bundle size - use esbuild (default, faster)
    minify: 'esbuild',
  },
});