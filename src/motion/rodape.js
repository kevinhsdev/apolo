// Rodapé: as ações das colunas (abrir a aba certa, destacar o cartão, focar o campo)
// e a marca "apolo" em retícula: os pontos crescem e esquentam perto do mouse, e o clique solta uma onda.
import { rolarPara } from './rolagem.js';

const topoDe = el => el.getBoundingClientRect().top + window.scrollY;

function destacar(el) {
  el.classList.remove('is-destaque');
  void el.offsetWidth;
  el.classList.add('is-destaque');
}

export function iniciarAcoes() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ir-plano], [data-ir-medida], [data-ir-cupom], [data-ir-campo], [data-ir-topo]');
    if (!b) return;
    e.preventDefault();
    if (b.hasAttribute('data-ir-topo')) return rolarPara(0);
    if (b.dataset.irCampo) {
      const campo = document.getElementById(b.dataset.irCampo);
      rolarPara(topoDe(campo) - window.innerHeight * 0.4);
      setTimeout(() => campo.focus({ preventScroll: true }), 900);
      return;
    }
    let alvo;
    if (b.dataset.irPlano) {
      alvo = document.querySelector(`[data-cartao="${b.dataset.irPlano}"]`);
      const painel = alvo.closest('[role=tabpanel]');
      if (painel.hidden) document.querySelector(`[aria-controls="${painel.id}"]`).click();
    } else if (b.hasAttribute('data-ir-medida')) alvo = document.querySelector('.medida');
    else alvo = document.querySelector('[data-cupom]');
    if (!alvo || alvo.hidden) return;
    rolarPara(topoDe(alvo) - 170);
    setTimeout(() => destacar(alvo), 700);
  });
}

export function iniciarReticula() {
  const caixa = document.querySelector('.reticula');
  if (!caixa) return;
  const canvas = caixa.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pontos = [];
  let W = 0;
  let H = 0;
  let passo = 9;
  const mouse = { x: -999, y: -999 };
  const ondas = [];
  let visivel = false;
  let rodando = false;

  function montar() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = caixa.clientWidth;
    passo = W < 700 ? 6 : 9;
    // a palavra ocupa a largura toda e é cortada pela borda de baixo
    const off = document.createElement('canvas').getContext('2d');
    const fonte = `600 100px ${getComputedStyle(document.body).fontFamily}`;
    off.font = fonte;
    const largura = off.measureText('apolo').width;
    const tam = (W * 0.98 / largura) * 100;
    H = Math.round(tam * 0.78);
    caixa.style.height = `${H}px`;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = document.createElement('canvas');
    m.width = W; m.height = H;
    const mc = m.getContext('2d');
    mc.fillStyle = '#fff';
    mc.font = `600 ${tam}px ${getComputedStyle(document.body).fontFamily}`;
    mc.textAlign = 'center';
    mc.textBaseline = 'alphabetic';
    mc.fillText('apolo', W / 2, tam * 0.8);
    const dados = mc.getImageData(0, 0, W, H).data;
    pontos = [];
    for (let y = passo / 2; y < H; y += passo) {
      for (let x = passo / 2; x < W; x += passo) {
        const a = dados[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] / 255;
        if (a > 0.08) pontos.push({ x, y, a });
      }
    }
    desenhar(performance.now());
  }

  function desenhar(t) {
    ctx.clearRect(0, 0, W, H);
    const raio = passo * 9;
    for (let k = ondas.length - 1; k >= 0; k--) if (t - ondas[k].t > 1400) ondas.splice(k, 1);
    for (const p of pontos) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const perto = Math.max(0, 1 - Math.hypot(dx, dy) / raio);
      let onda = 0;
      for (const o of ondas) {
        const r = (t - o.t) * 0.9;
        const d = Math.abs(Math.hypot(p.x - o.x, p.y - o.y) - r);
        onda = Math.max(onda, Math.max(0, 1 - d / (passo * 3)) * (1 - (t - o.t) / 1400));
      }
      const calor = Math.min(1, perto + onda);
      const r = (passo / 2) * (0.28 + 0.5 * p.a + 0.55 * calor);
      // do cinza da marca ao laranja propulsão
      const cr = Math.round(40 + (255 - 40) * calor);
      const cg = Math.round(40 + (90 - 40) * calor);
      const cb = Math.round(40 + (31 - 40) * calor);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function quadro(t) {
    if (!visivel) { rodando = false; return; }
    desenhar(t);
    requestAnimationFrame(quadro);
  }
  const ligar = () => { if (!rodando && !parado) { rodando = true; requestAnimationFrame(quadro); } };

  new IntersectionObserver(([en]) => { visivel = en.isIntersecting; if (visivel) ligar(); }).observe(caixa);
  caixa.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  caixa.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
  caixa.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    ondas.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
  });
  document.fonts.ready.then(montar);
  let w0 = 0;
  window.addEventListener('resize', () => { if (caixa.clientWidth !== w0) { w0 = caixa.clientWidth; montar(); } });
}
