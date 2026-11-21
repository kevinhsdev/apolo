// Placar do Padrão Apolo: conta de 0 a 30 quando aparece na tela (uma vez).
import { reduzido } from './rolagem.js';

export function iniciarPlacar() {
  const placar = document.querySelector('.padrao__placar');
  const n = placar?.querySelector('b');
  if (!n || reduzido) return;
  const alvo = Number(n.textContent);
  n.textContent = '0';
  placar.addEventListener('revelou', () => {
    const inicio = performance.now();
    const passo = agora => {
      const t = Math.min(1, (agora - inicio) / 1400);
      n.textContent = String(Math.round(alvo * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }, { once: true });
}
