import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Çevresel değişkenleri yükle (Netlify veya .env dosyasından)
  // Fix: Cast process to any to avoid TypeScript error about 'cwd' missing on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    define: {
      // process.env.API_KEY kullanımını desteklemek için
      // Netlify'da tanımladığınız API_KEY veya VITE_API_KEY'i koda gömer.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || '')
    }
  };
});