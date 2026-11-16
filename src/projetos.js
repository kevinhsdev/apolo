// Biblioteca de projetos da Apolo: os dados ficam aqui, num lugar só.
// Para cada site novo: adicione um item e grave a capa e o vídeo com
//   node fonte/scripts/gravar_projetos.mjs <slug>   (depois de pôr o slug e a url lá também)
// O que faltar para completar a vitrine aparece como vaga "em breve".
import { linkConversa, WHATSAPP } from './contato.js';

export const PROJETOS = [
  { slug: 'rumo', nome: 'Rumo', categoria: 'Agência de viagens', url: 'https://kevinhsdev.github.io/rumo/',
    capa: '/projetos/rumo.jpg', video: '/projetos/rumo.mp4',
    resumo: 'Viagens sob medida: voos, hotéis e passeios num roteiro só, com um especialista pelo WhatsApp.' },
  { slug: 'kevinhs', nome: 'Kevin Henrique', categoria: 'Portfólio', url: 'https://www.kevinhs.dev/pt',
    capa: '/projetos/kevinhs.jpg', video: '/projetos/kevinhs.mp4',
    resumo: 'Portfólio de engenharia de software, com a trajetória contada num globo 3D enquanto se rola.' },
];

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const dominioDe = p => p.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/(pt)?\/?$/, '');

// cartão: capa parada; com o mouse em cima (ou ao aparecer, no celular) o vídeo do site rolando toca
export function cartao(p) {
  return `<button type="button" class="pj" data-projeto="${esc(p.slug)}">
    <span class="pj-tela"><span class="pj-barra" aria-hidden="true"><i></i><i></i><i></i><em>${esc(dominioDe(p))}</em></span>
      <span class="pj-midia"><img src="${esc(p.capa)}" alt="" loading="lazy">${p.video ? `<video muted loop playsinline preload="none" poster="${esc(p.capa)}" src="${esc(p.video)}" aria-hidden="true"></video>` : ''}</span>
      <span class="pj-ver">Ver ao vivo <svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg></span></span>
    <span class="pj-info"><b>${esc(p.nome)}</b><span>${esc(p.categoria)}</span></span>
  </button>`;
}

export function iniciarVideos(raiz = document) {
  const toque = matchMedia('(hover: none)').matches;
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches;
  raiz.querySelectorAll('.pj').forEach(c => {
    const v = c.querySelector('video');
    if (!v || parado) return;
    const tocar = () => { c.classList.add('is-tocando'); v.play().catch(() => {}); };
    const parar = () => { c.classList.remove('is-tocando'); v.pause(); };
    if (toque) new IntersectionObserver(([e]) => (e.intersectionRatio > 0.6 ? tocar() : parar()), { threshold: [0, 0.6] }).observe(c);
    else {
      c.addEventListener('pointerenter', tocar);
      c.addEventListener('pointerleave', parar);
      c.addEventListener('focus', tocar);
      c.addEventListener('blur', parar);
    }
  });
}

// visualizador: janela de navegador com o site ao vivo (iframe), no computador ou no celular
export function iniciarVisor() {
  let dlg = document.querySelector('.visor');
  if (!dlg) {
    document.body.insertAdjacentHTML('beforeend', `<dialog class="visor" aria-label="Prévia do projeto">
      <div class="visor__topo"><div><b data-v-nome></b><span data-v-info></span></div>
        <div class="visor__aparelhos" role="group" aria-label="Ver em"><button type="button" data-v="pc" aria-pressed="true">Computador</button><button type="button" data-v="cel" aria-pressed="false">Celular</button></div>
        <button type="button" class="visor__fechar" data-v-fechar aria-label="Fechar">×</button></div>
      <div class="visor__palco"><div class="visor__janela" data-v-janela><div class="pj-barra"><i></i><i></i><i></i><em data-v-url></em></div><div class="visor__corpo" data-v-corpo></div></div></div>
      <div class="visor__base"><p data-v-resumo></p><div><a class="link" data-v-visitar target="_blank" rel="noopener">Abrir o site ↗</a>
        <a class="metal-btn" data-v-pedir target="_blank" rel="noopener"><span class="metal-btn__metal" aria-hidden="true"></span><span class="metal-btn__label">Quero um site assim</span><span class="metal-btn__orb" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div></div>
    </dialog>`);
    dlg = document.querySelector('.visor');
    const fechar = () => dlg.close();
    dlg.querySelector('[data-v-fechar]').addEventListener('click', fechar);
    dlg.addEventListener('click', e => { if (e.target === dlg) fechar(); });
    dlg.addEventListener('close', () => { dlg.querySelector('[data-v-corpo]').innerHTML = ''; document.documentElement.classList.remove('is-menu'); });
    dlg.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
      dlg.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      dlg.querySelector('[data-v-janela]').classList.toggle('is-cel', b.dataset.v === 'cel');
    }));
    dlg.querySelector('[data-v-pedir]').addEventListener('click', e => {
      if (!WHATSAPP) navigator.clipboard?.writeText(e.currentTarget.dataset.msg).catch(() => {});
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-projeto]');
    if (!b) return;
    const p = PROJETOS.find(x => x.slug === b.dataset.projeto);
    if (!p) return;
    dlg.querySelector('[data-v-nome]').textContent = p.nome;
    dlg.querySelector('[data-v-info]').textContent = p.categoria;
    dlg.querySelector('[data-v-url]').textContent = dominioDe(p);
    dlg.querySelector('[data-v-resumo]').textContent = p.resumo;
    dlg.querySelector('[data-v-corpo]').innerHTML = `<iframe src="${esc(p.url)}" title="${esc(p.nome)}"></iframe>`;
    dlg.querySelector('[data-v-visitar]').href = p.url;
    const msg = `Olá, Apolo! Vi o projeto ${p.nome} no site de vocês e quero um site assim para o meu negócio.`;
    const pedir = dlg.querySelector('[data-v-pedir]');
    pedir.href = linkConversa(msg);
    pedir.dataset.msg = msg;
    document.documentElement.classList.add('is-menu');
    dlg.showModal();
  });
}

// vitrine: projetos reais primeiro; o que faltar até `total` vira vaga "em breve"
export function montarVitrine(raiz, total, pacotesHref = '#pacotes') {
  const reais = PROJETOS.slice(0, total);
  raiz.innerHTML = reais.map(cartao).join('') + htmlVagas(total - reais.length, reais.length);
  iniciarVideos(raiz);
  iniciarVisor();
  if (total > reais.length) chamadaVagas(raiz, pacotesHref);
}

// tela "em breve": vagas abertas na vitrine. Em cada uma, o esqueleto de um site se monta
// e um cursor vai até o botão laranja e clica, como o cliente do seu negócio faria.
// Tipos: h título, t texto, b botão (laranja), img imagem, card cartão. alvo = onde o cursor clica.
const PLANTAS = [
  { alvo: [40, 108], els: [
    ['h', 16, 14, 26, 6], ['t', 204, 15.5, 16, 3], ['t', 226, 15.5, 16, 3], ['t', 248, 15.5, 16, 3], ['b', 274, 11, 30, 11],
    ['h', 16, 44, 128, 10], ['h', 16, 59, 96, 10], ['t', 16, 78, 116, 4], ['t', 16, 87, 92, 4], ['b', 16, 101, 48, 14],
    ['img', 176, 40, 128, 82],
    ['card', 16, 138, 90, 48], ['card', 115, 138, 90, 48], ['card', 214, 138, 90, 48]] },
  { alvo: [160, 93], els: [
    ['t', 16, 15.5, 16, 3], ['t', 38, 15.5, 16, 3], ['h', 147, 14, 26, 6], ['b', 276, 11, 28, 11],
    ['h', 84, 40, 152, 10], ['h', 108, 55, 104, 10], ['t', 100, 74, 120, 4], ['b', 136, 86, 48, 14],
    ['img', 16, 114, 288, 72]] },
  { alvo: [198, 111], els: [
    ['h', 16, 14, 26, 6], ['t', 226, 15.5, 16, 3], ['t', 248, 15.5, 16, 3], ['b', 274, 11, 30, 11],
    ['h', 16, 40, 150, 10], ['t', 16, 58, 120, 4], ['t', 16, 67, 96, 4],
    ['img', 16, 84, 140, 102],
    ['card', 166, 84, 138, 48, 'curto'], ['b', 176, 105, 44, 12], ['card', 166, 138, 138, 48]] },
];

function elemento([tipo, x, y, w, h, curto], i) {
  const st = `style="--i:${i}"`;
  if (tipo === 'img') {
    const sx = x + w * 0.72, sy = y + h * 0.32, r = Math.min(w, h) * 0.08;
    const m = `M${x} ${y + h}L${x + w * 0.34} ${y + h * 0.52}L${x + w * 0.52} ${y + h * 0.74}L${x + w * 0.68} ${y + h * 0.6}L${x + w} ${y + h}Z`;
    return `<g class="el el--img" ${st}><rect class="img__fundo" x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/><circle class="img__sol" cx="${sx}" cy="${sy}" r="${r}"/><path class="img__monte" d="${m}"/></g>`;
  }
  if (tipo === 'card') {
    return `<g class="el el--card" ${st}><rect class="card__fundo" x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/><rect class="sk sk--h" x="${x + 10}" y="${y + 11}" width="${w * 0.42}" height="5" rx="2.5"/>${curto ? '' : `<rect class="sk" x="${x + 10}" y="${y + 22}" width="${w * 0.7}" height="3" rx="1.5"/><rect class="sk" x="${x + 10}" y="${y + 30}" width="${w * 0.5}" height="3" rx="1.5"/>`}</g>`;
  }
  const cls = tipo === 'h' ? 'sk sk--h' : tipo === 'b' ? 'sk sk--b' : 'sk';
  return `<rect class="el ${cls}" ${st} x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
}

const CURSOR = '<path d="M0 0v13.5l3.4-3.2 2.4 5.4 2.3-1-2.4-5.3h4.7z"/>';

function planta(i) {
  const p = PLANTAS[i % PLANTAS.length];
  const [cx, cy] = p.alvo;
  return `<svg class="vaga__planta" viewBox="0 0 320 200" aria-hidden="true">${p.els.map(elemento).join('')}
    <circle class="vaga__onda" cx="${cx}" cy="${cy}" r="7"/>
    <g class="vaga__cursor" style="--cx:${cx}px;--cy:${cy}px">${CURSOR}</g></svg>`;
}

function htmlVagas(n, inicio) {
  return Array.from({ length: Math.max(0, n) }, (_, k) => {
    const i = inicio + k;
    return `
    <div class="vaga" style="--v:${k}">
      <div class="pj-tela vaga__tela"><span class="pj-barra" aria-hidden="true"><i></i><i></i><i></i><em>seunegocio.com.br</em></span>${planta(i)}</div>
      <div class="pj-info"><b>Vaga ${String(i + 1).padStart(2, '0')}</b><span class="vaga__selo"><i></i>Em breve</span></div>
    </div>`;
  }).join('');
}

function chamadaVagas(raiz, pacotesHref) {
  const msg = 'Olá, Apolo! Vi a vitrine de projetos e quero reservar uma vaga para o meu site.';
  const seta = '<svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ir = pacotesHref === '#pacotes' ? ' data-ir-plano="orbita"' : '';
  raiz.classList.add('is-vagas');
  raiz.insertAdjacentHTML('afterend', `<div class="vagas__chamada">
    <p><strong>Os próximos sites da vitrine estão em produção.</strong> A próxima vaga pode ser do seu negócio.</p>
    <div class="vagas__acoes">
      <a class="link" href="${pacotesHref}"${ir}>Ver os pacotes</a>
      <a class="metal-btn" data-vaga-pedir href="${linkConversa(msg)}" target="_blank" rel="noopener"><span class="metal-btn__metal" aria-hidden="true"></span><span class="metal-btn__label">Reservar uma vaga</span><span class="metal-btn__orb" aria-hidden="true">${seta}${seta}</span></a>
    </div>
  </div>`);
  raiz.parentElement.querySelector('[data-vaga-pedir]').addEventListener('click', () => {
    if (!WHATSAPP) navigator.clipboard?.writeText(msg).catch(() => {});
  });
  new IntersectionObserver(([e]) => raiz.classList.toggle('is-rodando', e.isIntersecting), { rootMargin: '100px' }).observe(raiz);
}
