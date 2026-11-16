import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './', // caminhos relativos: funciona em /apolo/ (GitHub Pages) e num domínio próprio
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacidade: resolve(import.meta.dirname, 'privacidade.html'),
        projetos: resolve(import.meta.dirname, 'projetos.html'),
        pagar: resolve(import.meta.dirname, 'pagar.html'),
        conta: resolve(import.meta.dirname, 'conta.html'),
        naoachado: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
});
