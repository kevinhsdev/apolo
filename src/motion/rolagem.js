// Um laço só de requestAnimationFrame para tudo que segue a rolagem.
// O Lenis suaviza a roda do mouse (o toque segue o nativo) e anda no mesmo laço; nada prende a página.
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// com movimento reduzido a rolagem fica a nativa, sem suavização
export const lenis = reduzido ? null : new Lenis({ autoRaf: false, lerp: 0.1, anchors: true });

/** rola até y (px): pelo Lenis quando ele está ligado */
export function rolarPara(y, imediato = false) {
  if (lenis) lenis.scrollTo(y, { immediate: imediato, force: true });
  else window.scrollTo({ top: y, behavior: imediato ? 'instant' : 'smooth' });
}

export const tela = {
  y: window.scrollY,
  w: document.documentElement.clientWidth || window.innerWidth,
  h: window.innerHeight,
  celular: (document.documentElement.clientWidth || window.innerWidth) <= 760,
};

const tarefas = new Set();
let ultimo = 0;

function quadro(agora) {
  const dt = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 1 / 60;
  ultimo = agora;
  lenis?.raf(agora);
  tela.y = window.scrollY;
  for (const f of tarefas) f(dt, agora / 1000);
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);

/** registra uma função chamada a cada quadro com (dt em s, tempo em s) */
export function aCadaQuadro(f) {
  tarefas.add(f);
  return () => tarefas.delete(f);
}

/** persegue o alvo com suavização exponencial (igual a 60 ou 120 Hz) */
export function amortecer(atual, alvo, lambda, dt) {
  return alvo + (atual - alvo) * Math.exp(-lambda * dt);
}

export const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const suave = t => t * t * (3 - 2 * t);
export const sairSuave = t => 1 - Math.pow(1 - t, 3);
export const misturar = (a, b, t) => a + (b - a) * t;
export const faixa = (v, a, b) => limitar((v - a) / (b - a));
