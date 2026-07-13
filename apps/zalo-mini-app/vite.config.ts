import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()], // Bạn có thể bỏ plugin legacy đi nếu dùng cách này
  base: './',
  build: {
    target: 'es2015',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',  // Ép buộc Rollup xuất ra định dạng IIFE thay vì ESM
        name: 'app',     // Tên biến global (bắt buộc phải khai báo khi dùng format iife)
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});