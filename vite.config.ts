import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// GitHub Pages はリポジトリ名がパスに入るため base を固定する
export default defineConfig({
  base: '/kyouryuu-hakkutsu/',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        poc1: resolve(import.meta.dirname, 'poc/poc1/index.html'),
        poc2: resolve(import.meta.dirname, 'poc/poc2/index.html'),
        poc4: resolve(import.meta.dirname, 'poc/poc4/index.html'),
        poc5: resolve(import.meta.dirname, 'poc/poc5/index.html'),
        poc6: resolve(import.meta.dirname, 'poc/poc6/index.html'),
        poc7: resolve(import.meta.dirname, 'poc/poc7/index.html'),
      },
    },
  },
});
