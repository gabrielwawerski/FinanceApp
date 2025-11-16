import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@core': resolve(__dirname, 'src/core'),
      '@stores': resolve(__dirname, 'src/core/stores'),
      '@db': resolve(__dirname, 'src/core/database'),
      '@util': resolve(__dirname, 'src/core/util'),
      '@pages': resolve(__dirname, 'src/core/pages'),
      '@css': resolve(__dirname, 'src/css')
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: 'index.html'
    }
  },
  server: {
    port: 3000,
    open: true
  }
});