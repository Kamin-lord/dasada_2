import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // /s/<maktab>/ yo‘lida ham, o‘z domenida ham ishlaydi
  plugins: [react()],
  server: { port: 5173, open: true, proxy: { '/api': 'http://localhost:3001' } },
});
