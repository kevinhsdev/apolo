// Medidas da página: ajusta as palavras gigantes à largura da tela e posiciona o hero
// (palavra, texto e globo) com as proporções do conceito. Roda no load, nas fontes e no resize.
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
    if (el.classList.contains('hero__palavra') && !tela.celular) {
      // em tela muito larga a palavra não passa de 36% da altura
      f = Math.min(f, (tela.h * 0.36) / (m.alto / 100));
    }
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
  const hero = document.querySelector('.hero');
  const palavra = hero.querySelector('.hero__palavra');
  const m = palavra._medida;
  const W = tela.w;
  const H = hero.getBoundingClientRect().height;
  const navH = tela.celular ? 64 : 96;
  let topoLetras;
  let d;
  let globoTopo;
  if (tela.celular) {
    const preco = hero.querySelector('.hero__preco');
    const lead = hero.querySelector('.hero__lead');
    const leadFim = lead.offsetTop + lead.offsetHeight;
    hero.style.setProperty('--preco-topo', `${Math.round(leadFim + 18)}px`);
    const precoFim = leadFim + 18 + preco.offsetHeight;
    topoLetras = Math.max(precoFim + 40, H * 0.355);
    d = W * 1.5;
    globoTopo = topoLetras + m.alto * 0.7;
  } else {
    topoLetras = Math.max(navH + 16, H * 0.137);
    d = Math.min(W * 0.515, H * 0.88);
    globoTopo = topoLetras + m.alto * 0.71;
  }
  const palavraTopo = topoLetras - (m.base - m.alto);
  const base = topoLetras + m.alto;
  hero.style.setProperty('--palavra-tam', `${m.f.toFixed(2)}px`);
  hero.style.setProperty('--palavra-topo', `${palavraTopo.toFixed(1)}px`);
  hero.style.setProperty('--base', `${base.toFixed(1)}px`);
  hero.style.setProperty('--globo-topo', `${globoTopo.toFixed(1)}px`);
  hero.style.setProperty('--globo-d', `${d.toFixed(1)}px`);
  L.hero = { altura: H, topoLetras, base, globoTopo, d };
}

export function medirSecoes() {
  // o globo das regiões: cabe entre as duas colunas de texto
  const margem = Math.min(72, Math.max(20, tela.w * 0.039));
  L.r1 = tela.celular ? tela.w * 0.5 : Math.min(tela.h * 0.37, (tela.w - 2 * margem) * 0.225);
  document.documentElement.style.setProperty('--globo-regioes', `${(L.r1 * 2).toFixed(1)}px`);
  const reg = document.querySelector('.regioes');
  const a = reg.querySelector('.regioes__bloco--a');
  const b = reg.querySelector('.regioes__bloco--b');
  L.regioes = {
    topo: docTop(reg),
    altura: reg.offsetHeight,
    a: { topo: docTop(a), altura: a.offsetHeight },
    b: { topo: docTop(b), altura: b.offsetHeight },
  };
  const campo = document.querySelector('.busca__campo');
  L.busca = { topo: docTop(campo), altura: campo.offsetHeight, esquerda: campo.getBoundingClientRect().left };
  L.dominio = { topo: docTop(document.querySelector('.dominio')) };
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
