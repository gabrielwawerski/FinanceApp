/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import { resolve } from 'path';
import eslint from 'vite-plugin-eslint';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  root: '.',
  base: '/FinanceApp/',
  appType: 'spa',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@core': resolve(__dirname, 'src/core'),
      '@stores': resolve(__dirname, 'src/core/stores'),
      '@db': resolve(__dirname, 'src/core/db'),
      '@util': resolve(__dirname, 'src/core/util'),
      '@views': resolve(__dirname, 'src/core/views'),
      '@css': resolve(__dirname, 'src/css'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: 'index.html',
    },
  },
  server: {
    port: 3001,
    open: true,
  },
  plugins: [eslint()],
});
