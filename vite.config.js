import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

// <!-- partial:NOME --> no HTML vira o conteúdo de src/partials/NOME.html (rodapé, script do head...)
const partials = {
  name: 'partials',
  transformIndexHtml: html => html.replace(/<!-- partial:([\w-]+) -->/g, (_, nome) => {
    const arq = resolve(import.meta.dirname, 'src/partials', nome + '.html');
    if (!existsSync(arq)) throw new Error('partial inexistente: ' + nome);
    return readFileSync(arq, 'utf8');
  }),
};

export default defineConfig({
  plugins: [partials],
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
