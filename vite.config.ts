import { defineConfig } from 'vitest/config';

// `base: './'` makes the build work on GitHub Pages project URLs
// (https://user.github.io/repo/) and on Netlify drag-and-drop alike.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
