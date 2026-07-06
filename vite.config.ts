import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      external: ['trimble-connect-workspace-api'],
      output: {
        globals: {
          'trimble-connect-workspace-api': 'TrimbleConnectWorkspace',
        },
        manualChunks(id) {
          if (id.includes('@trimble-oss/modus')) return 'vendor-modus';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
