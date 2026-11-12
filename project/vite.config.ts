import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  // base path สำหรับ GitHub Pages — ตรงกับชื่อ repo: /KMITL_SMART_GRID/
  base: '/KMITL_SMART_GRID/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  optimizeDeps: { exclude: ['lucide-react'] },
});
