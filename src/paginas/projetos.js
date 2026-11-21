// Biblioteca de projetos em formato de catálogo: chips por nicho, busca, ordem e a grade com o vídeo
// de cada site rodando. Clicar no card abre o visor ao vivo (src/projetos.js).
import '@fontsource-variable/figtree';
import '../styles/tokens.css';
import '../styles/base.css';
import '../sections/projetos.css';
import './biblioteca.css';
import '../estilo.js';
import '../acessibilidade.js';
import { PROJETOS, iniciarVisor, dominioDe } from '../projetos.js';
import { iniciarMetal } from '../motion/metal.js';
import { precoPix, ofertaNoAr, brl } from '../precos.js';

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sem = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);

$('[data-total]').textContent = PROJETOS.length;

// chips: "Todos" mais um por nicho, com a contagem
const nichos = [...new Set(PROJETOS.map(p => p.categoria))];
$('[data-chips]').innerHTML = ['Todos', ...nichos].map((n, i) => `<button type="button" aria-pressed="${!i}" data-nicho="${i ? esc(n) : ''}">${esc(n)}<span>${i ? PROJETOS.filter(p => p.categoria === n).length : PROJETOS.length}</span></button>`).join('');

// cards: mídia com o vídeo do site, nome e "tipo · nicho", e os dois atalhos
const grade = $('[data-grade]');
grade.innerHTML = PROJETOS.map(p => `
  <li class="bib-card" data-slug="${esc(p.slug)}">
    <button type="button" class="bib-card__midia" data-projeto="${esc(p.slug)}" aria-label="Abrir ${esc(p.nome)} ao vivo">
      <img src="${esc(p.capa)}" alt="" width="1280" height="800" loading="lazy">
      ${p.video ? `<video muted loop playsinline preload="none" poster="${esc(p.capa)}" src="${esc(p.video)}" aria-hidden="true"></video>` : ''}
      <span class="bib-card__ver" aria-hidden="true">Ver ao vivo</span>
    </button>
    <div class="bib-card__info">
      <div><h2>${esc(p.nome)}</h2><p>${p.categoria === 'App' ? 'Aplicativo web' : `Site · ${esc(p.categoria.toLowerCase())}`}</p></div>
      <div class="bib-card__atalhos">
        <button type="button" data-projeto="${esc(p.slug)}" aria-label="Ver ${esc(p.nome)} ao vivo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <a href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="Abrir ${esc(dominioDe(p))} em nova aba"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>
      </div>
    </div>
  </li>`).join('');
const cards = [...grade.children];

// filtro: nicho + busca (sem acento, por nome, nicho, resumo ou domínio) + ordem
let nicho = '';
const busca = $('[data-busca]'), ordem = $('[data-ordem]');
function filtrar() {
  const q = sem(busca.value.trim());
  const vistos = PROJETOS.filter(p => (!nicho || p.categoria === nicho) &&
    (!q || sem(`${p.nome} ${p.categoria} ${p.resumo} ${dominioDe(p)}`).includes(q)));
  if (ordem.value === 'az') vistos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  cards.forEach(c => c.hidden = true);
  vistos.forEach((p, i) => {
    const c = cards.find(x => x.dataset.slug === p.slug);
    c.hidden = false;
    c.style.order = i;
    c.style.setProperty('--i', i);
    c.classList.remove('is-entrando'); void c.offsetWidth; c.classList.add('is-entrando');
  });
  $('[data-contagem]').textContent = vistos.length === PROJETOS.length ? `${vistos.length} projetos` : `${vistos.length} de ${PROJETOS.length} projetos`;
  $('[data-vazio]').hidden = vistos.length > 0;
}
$('[data-chips]').addEventListener('click', e => {
  const b = e.target.closest('[data-nicho]');
  if (!b) return;
  nicho = b.dataset.nicho;
  $('[data-chips]').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  filtrar();
});
busca.addEventListener('input', filtrar);
ordem.addEventListener('change', filtrar);
$('[data-limpar]').addEventListener('click', () => {
  busca.value = ''; nicho = '';
  $('[data-chips]').querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(!i)));
  filtrar(); busca.focus();
});
// "/" leva à busca, como nos catálogos
addEventListener('keydown', e => {
  if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); busca.focus(); }
});
filtrar();

// vídeos: todos os cards visíveis rodam sozinhos (como uma vitrine), fora da tela pausam
if (!reduzido) {
  const tocar = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target.querySelector('video');
    if (!v) return;
    e.target.classList.toggle('is-tocando', e.isIntersecting);
    if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.35 });
  cards.forEach(c => tocar.observe(c));
}

$('[data-preco]').textContent =
  `Site sob medida com WhatsApp, mapa e Google prontos e o domínio do primeiro ano incluso. A partir de R$ ${brl(precoPix('decolagem'))} no Pix${ofertaNoAr() ? ', no preço de lançamento' : ''}, no ar em 7 dias úteis.`;

iniciarVisor();
iniciarMetal();
