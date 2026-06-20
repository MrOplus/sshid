import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the web app runs on its own port and proxies API and
// public-resolver calls to the Fastify server, so cookies and WebAuthn share
// the same origin semantics as production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/healthz': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
