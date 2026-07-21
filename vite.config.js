import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',            // 상대 경로 — 루트·하위경로·iframe 어디서든 동작
  build: { outDir: 'dist' }
});
