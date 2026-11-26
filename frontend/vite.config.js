import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000';
  const apiProxy = {
    '/api': {
      target: backendTarget,
      changeOrigin: true
    },
    '/product-images': {
      target: backendTarget,
      changeOrigin: true
    }
  };
  return {
    plugins: [react()],
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy }
  };
});
