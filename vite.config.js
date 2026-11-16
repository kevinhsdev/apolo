import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacidade: resolve(import.meta.dirname, 'privacidade.html'),
        projetos: resolve(import.meta.dirname, 'projetos.html'),
        naoachado: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
});
