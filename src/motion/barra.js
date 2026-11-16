// Barra de rolagem própria: polegar fino que aparece ao rolar, arrastável; clique no trilho rola até lá.
import { rolarPara, aCadaQuadro, tela } from './rolagem.js';

export function iniciarBarra() {
  if (window.matchMedia('(hover: none)').matches) return;
  const barra = document.querySelector('.barra');
  const pol = barra.querySelector('.barra__polegar');
  let timer = 0;
  let ultimoY = -1;
  let arrastando = false;
  let y0 = 0;
  let s0 = 0;

  const medidas = () => {
    const doc = document.documentElement.scrollHeight;
    const h = Math.max(40, (tela.h / doc) * tela.h);
    return { doc, h, curso: tela.h - h, max: doc - tela.h };
  };
  aCadaQuadro(() => {
    if (tela.y === ultimoY && !arrastando) return;
    ultimoY = tela.y;
    const m = medidas();
    pol.style.height = `${m.h}px`;
    pol.style.transform = `translate3d(0, ${(m.max ? (tela.y / m.max) * m.curso : 0).toFixed(1)}px, 0)`;
    barra.classList.add('is-ativa');
    clearTimeout(timer);
    timer = setTimeout(() => { if (!arrastando) barra.classList.remove('is-ativa'); }, 900);
  });
  pol.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    arrastando = true;
    y0 = e.clientY;
    s0 = tela.y;
    pol.setPointerCapture(e.pointerId);
    barra.classList.add('is-arrastando', 'is-ativa');
  });
  pol.addEventListener('pointermove', e => {
    if (!arrastando) return;
    const m = medidas();
    rolarPara(s0 + ((e.clientY - y0) / m.curso) * m.max, true);
  });
  const soltar = () => { arrastando = false; barra.classList.remove('is-arrastando'); };
  pol.addEventListener('pointerup', soltar);
  pol.addEventListener('pointercancel', soltar);
  barra.addEventListener('pointerdown', e => {
    if (e.target !== barra) return;
    const m = medidas();
    rolarPara(((e.clientY - m.h / 2) / m.curso) * m.max);
  });
}
