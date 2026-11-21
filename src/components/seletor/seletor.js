// Faixa de projetos (base: Interactive Selector, ProfitizeBuild), convertida para JS puro.
// O escolhido abre com o vídeo do site rolando e os outros viram tiras; clicar no aberto abre o visor ao vivo.
// Para o teclado é um radiogroup: Tab entra no aberto, as setas trocam, Home e End vão às pontas.
import './seletor.css';

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

export function montarSeletor(raiz, itens, { rotulo = 'Projetos' } = {}) {
  raiz.classList.add('isel');
  raiz.innerHTML = `<div class="isel__list" role="radiogroup" aria-label="${esc(rotulo)}">${itens.map((p, i) => `
    <button type="button" class="isel__option" role="radio" aria-checked="false" tabindex="-1" style="--isel-i:${i}" data-indice="${i}">
      <img class="isel__img" src="${esc(p.capa)}" alt="" decoding="async" draggable="false">
      ${p.video ? `<video class="isel__img isel__video" muted loop playsinline preload="none" src="${esc(p.video)}" aria-hidden="true"></video>` : ''}
      <span class="isel__shade" aria-hidden="true"></span>
      <span class="isel__label">
        <span class="isel__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <span class="isel__info"><span class="isel__title">${esc(p.nome)}</span><span class="isel__desc">${esc(p.categoria)} · ${esc(p.resumo)}</span></span>
        <span class="isel__ver" data-projeto="${esc(p.slug)}">Ver ao vivo ${SETA}</span>
      </span>
    </button>`).join('')}</div>`;

  const opcoes = [...raiz.querySelectorAll('.isel__option')];
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ativo = -1, visivel = false;

  function escolher(i, foco) {
    if (i === ativo) return;
    ativo = i;
    opcoes.forEach((o, k) => {
      o.setAttribute('aria-checked', String(k === i));
      o.tabIndex = k === i ? 0 : -1;
    });
    if (foco) opcoes[i].focus();
    tocar();
  }
  function tocar() {
    opcoes.forEach((o, k) => {
      const v = o.querySelector('video');
      if (!v) return;
      const vai = !reduzido && visivel && k === ativo;
      o.classList.toggle('is-tocando', vai);
      if (vai) v.play().catch(() => {}); else v.pause();
    });
  }

  // fechado: abre; aberto: o clique cai no "Ver ao vivo" (data-projeto) e abre o visor
  raiz.addEventListener('click', e => {
    const o = e.target.closest('.isel__option');
    if (!o) return;
    const i = Number(o.dataset.indice);
    if (i !== ativo) { e.stopPropagation(); escolher(i); return; }
    if (!e.target.closest('[data-projeto]')) o.querySelector('[data-projeto]').click();
  }, true);
  raiz.addEventListener('keydown', e => {
    const n = opcoes.length;
    const mapa = { ArrowRight: ativo + 1, ArrowDown: ativo + 1, ArrowLeft: ativo - 1, ArrowUp: ativo - 1, Home: 0, End: n - 1 };
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opcoes[ativo].querySelector('[data-projeto]').click(); return; }
    if (!(e.key in mapa)) return;
    e.preventDefault();
    escolher((mapa[e.key] + n) % n, true);
  });

  new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting;
    if (visivel) raiz.dataset.shown = '';
    tocar();
  }, { threshold: 0.15 }).observe(raiz);
  escolher(0);
}
