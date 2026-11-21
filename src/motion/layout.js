// Medidas da página: ajusta as palavras gigantes à largura da tela e posiciona a Lua do hero. Roda no load, nas fontes e no resize.
import { tela } from './rolagem.js';

const docTop = el => el.getBoundingClientRect().top + window.scrollY;

// mede a palavra a 100 px: largura, linha de base e topo das letras altas
function medir(el) {
  const antes = el.style.fontSize;
  el.style.fontSize = '100px';
  const caixa = el.getBoundingClientRect();
  // a largura é a do texto (o elemento pode ser um bloco na largura toda)
  const faixaTexto = document.createRange();
  faixaTexto.selectNodeContents(el);
  // o espaçamento negativo da última letra encurta a caixa, mas o desenho dela vai até o fim
  const larguraTexto = faixaTexto.getBoundingClientRect().width - Math.min(0, parseFloat(getComputedStyle(el).letterSpacing) || 0);
  const sonda = document.createElement('span');
  sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  el.appendChild(sonda);
  const base = sonda.getBoundingClientRect().top - caixa.top;
  sonda.remove();
  const cs = getComputedStyle(el);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
  const m = ctx.measureText(el.textContent.trim());
  el.style.fontSize = antes;
  return { w: larguraTexto, base, alto: m.actualBoundingBoxAscent || 74 };
}

export const L = {};

export function ajustarPalavras() {
  // palavras gigantes de ponta a ponta (hero, rodapé)
  document.querySelectorAll('[data-palavra]').forEach(el => {
    const m = medir(el);
    const borda = Math.max(6, tela.w * 0.007);
    let f = ((tela.w - borda * 2) / m.w) * 100;
    el.style.fontSize = `${f.toFixed(2)}px`;
    el._medida = { f, base: (m.base * f) / 100, alto: (m.alto * f) / 100, w: (m.w * f) / 100 };
  });
  // nome do domínio no fecho: ocupa a largura útil, com teto
  document.querySelectorAll('[data-ajusta]').forEach(el => {
    el.style.fontSize = '100px';
    const faixaTexto = document.createRange();
    faixaTexto.selectNodeContents(el);
    const w = faixaTexto.getBoundingClientRect().width;
    const util = tela.w - 2 * Math.min(72, Math.max(20, tela.w * 0.039));
    const teto = tela.celular ? 64 : Math.min(tela.h * 0.2, 180);
    el.style.fontSize = `${Math.min(teto, (util / w) * 100).toFixed(2)}px`;
  });
}

export function medirHero() {
  // a Lua nasce à direita, cortada pela borda; no celular, embaixo, atrás da telemetria
  const hero = document.querySelector('.hero');
  const W = tela.w;
  const H = hero.getBoundingClientRect().height;
  let cx; let cy; let d;
  if (tela.celular) {
    d = W * 1.15;
    cx = W * 0.7;
    cy = H + d * 0.02;
  } else {
    d = Math.min(H * 0.86, W * 0.5);
    cx = W - d * 0.3;
    cy = H * 0.6;
  }
  hero.style.setProperty('--lua-x', `${cx.toFixed(1)}px`);
  hero.style.setProperty('--lua-y', `${cy.toFixed(1)}px`);
  hero.style.setProperty('--lua-d', `${d.toFixed(1)}px`);
  L.hero = { altura: H, cx, cy, d };
}

export function medirSecoes() {
  const rodape = document.querySelector('.rodape');
  L.rodape = { topo: docTop(rodape), altura: rodape.offsetHeight };
  L.doc = document.documentElement.scrollHeight;
}

export function medirTudo() {
  tela.w = document.documentElement.clientWidth || window.innerWidth;
  tela.h = window.innerHeight;
  tela.celular = tela.w <= 760;
  ajustarPalavras();
  medirHero();
  medirSecoes();
  L.w = tela.w;
  L.h = tela.h;
  L.celular = tela.celular;
}
