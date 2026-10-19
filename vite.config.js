import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed on Vercel at the domain root, so assets are served from "/".
// (For a GitHub Pages project site you would set base to '/<repo-name>/'.)
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: { manualChunks: { three: ['three'] } },
    },
  },
});
