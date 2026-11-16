// Números grandes (img 8): chegam rápido, com desfoque só na horizontal, e assentam nítidos.
// Por tempo, uma vez, quando entram na tela. Um filtro SVG por número.
import { reduzido } from './rolagem.js';

const NS = 'http://www.w3.org/2000/svg';
const sair = t => 1 - Math.pow(1 - t, 4);

export function iniciarNumeros() {
  const svg = document.querySelector('svg.filtros');
  document.querySelectorAll('[data-numero]').forEach((bloco, k) => {
    const valor = bloco.querySelector('.numero__valor');
    if (reduzido) { bloco.classList.add('is-assentado'); return; }
    const filtro = document.createElementNS(NS, 'filter');
    filtro.setAttribute('id', `borrao-${k}`);
    filtro.setAttribute('x', '-30%');
    filtro.setAttribute('width', '160%');
    filtro.setAttribute('color-interpolation-filters', 'sRGB');
    const blur = document.createElementNS(NS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '0 0');
    filtro.append(blur);
    svg.append(filtro);

    bloco.addEventListener('revelou', () => {
      const inicio = performance.now();
      const dur = 1150;
      valor.style.filter = `url(#borrao-${k})`;
      const passo = agora => {
        const t = Math.min(1, (agora - inicio) / dur);
        const e = sair(t);
        blur.setAttribute('stdDeviation', `${(70 * (1 - e)).toFixed(2)} 0`);
        valor.style.opacity = String(Math.min(1, t * 3.2));
        valor.style.transform = `translate3d(${(5 * (1 - e)).toFixed(3)}%, 0, 0)`;
        if (t < 1) requestAnimationFrame(passo);
        else {
          valor.style.filter = '';
          valor.style.opacity = '';
          valor.style.transform = '';
          bloco.classList.add('is-assentado');
        }
      };
      requestAnimationFrame(passo);
    }, { once: true });
  });
}
