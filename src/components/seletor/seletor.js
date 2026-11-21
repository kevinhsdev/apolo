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
    </button>`).join('')}</div>
    <p class="isel__dica" aria-hidden="true"><span>Deslize para ver os outros →</span><span class="isel__pontos">${itens.map(() => '<i></i>').join('')}</span></p>`;

  const opcoes = [...raiz.querySelectorAll('.isel__option')];
  const lista = raiz.querySelector('.isel__list');
  const pontos = [...raiz.querySelectorAll('.isel__pontos i')];
  // no celular a lista vira um carrossel que rola de lado
  const carrossel = () => getComputedStyle(lista).overflowX === 'auto';
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ativo = -1, visivel = false;

  function escolher(i, foco) {
    if (i === ativo) return;
    ativo = i;
    opcoes.forEach((o, k) => {
      o.setAttribute('aria-checked', String(k === i));
      o.tabIndex = k === i ? 0 : -1;
    });
    pontos.forEach((p, k) => p.classList.toggle('is-ativo', k === i));
    if (foco) opcoes[i].focus({ preventScroll: carrossel() });
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
    if (i !== ativo) {
      e.stopPropagation();
      if (carrossel()) { centralizar(i); if (!e.target.closest('[data-projeto]')) return; o.querySelector('[data-projeto]').click(); return; }
      escolher(i); return;
    }
    if (!e.target.closest('[data-projeto]')) o.querySelector('[data-projeto]').click();
  }, true);
  raiz.addEventListener('keydown', e => {
    const n = opcoes.length;
    const mapa = { ArrowRight: ativo + 1, ArrowDown: ativo + 1, ArrowLeft: ativo - 1, ArrowUp: ativo - 1, Home: 0, End: n - 1 };
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opcoes[ativo].querySelector('[data-projeto]').click(); return; }
    if (!(e.key in mapa)) return;
    e.preventDefault();
    escolher((mapa[e.key] + n) % n, true);
    if (carrossel()) centralizar(ativo);
  });

  function centralizar(i) {
    const o = opcoes[i];
    lista.scrollTo({ left: o.offsetLeft - (lista.clientWidth - o.offsetWidth) / 2, behavior: reduzido ? 'auto' : 'smooth' });
  }
  // carrossel: o cartão que para no meio vira o escolhido
  let pedido = 0;
  lista.addEventListener('scroll', () => {
    if (!carrossel()) return;
    cancelAnimationFrame(pedido);
    pedido = requestAnimationFrame(() => {
      const meio = lista.scrollLeft + lista.clientWidth / 2;
      let melhor = 0, dist = Infinity;
      opcoes.forEach((o, k) => { const d = Math.abs(o.offsetLeft + o.offsetWidth / 2 - meio); if (d < dist) { dist = d; melhor = k; } });
      escolher(melhor);
    });
  }, { passive: true });

  new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting;
    if (visivel) raiz.dataset.shown = '';
    tocar();
  }, { threshold: 0.15 }).observe(raiz);
  escolher(0);
}
