/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Relative base so the same build works at / locally and at /<repo>/vue/ on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: { port: 5174 },
  preview: { port: 4174, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
