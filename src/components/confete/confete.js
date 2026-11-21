// Botão de enviar com confete (base: Confetti Submit Button, ProfitizeBuild), convertido para JS puro.
// Estados: parado → carregando (pontinhos) → enviado (confete + visto) ou erro (tremor) → parado, sozinho.
// Uso: const b = montarConfete(botaoExistente, { enviado: 'Cupom aplicado', erro: 'Confira o código' });
//      b.status('loading' | 'success' | 'error' | 'idle')  — o formulário dirige, o botão só mostra.
// O botão original é trocado pelo componente; type, name e classes de layout vão junto para o novo <button>.
import './confete.css';

const STATES = ['idle', 'loading', 'success', 'error'];
const SHAPES = ['rect', 'rect', 'rect', 'rect', 'strip', 'strip', 'dot', 'dot', 'dot', 'ribbon'];
const SPRING_SHRINK = [420, 38];
const SPRING_GROW = [620, 48];
const reduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- a largura da pílula numa mola */
class WidthSpring {
  constructor(el) {
    this.el = el; this.x = 0; this.v = 0; this.to = 0; this.k = 400; this.c = 36;
    this.raf = 0; this.last = 0; this.tween = 0; this.from = 0; this.t0 = 0; this.onRest = null; this.max = Infinity;
    this.tick = this.tick.bind(this);
  }
  get running() { return this.raf !== 0; }
  go(to, k, c, tween, onRest) {
    if (!this.raf) { this.x = this.el.offsetWidth; this.v = 0; }
    Object.assign(this, { to, k, c, tween, from: this.x, t0: performance.now(), onRest });
    if (Math.abs(this.x - to) < 0.5 && Math.abs(this.v) < 1) { this.finish(); return; }
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  tick(now) {
    const dt = Math.min(1 / 30, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (this.tween) {
      const p = Math.min(1, Math.max(0, (now - this.t0) / this.tween));
      this.x = this.from + (this.to - this.from) * (1 - Math.pow(1 - p, 3));
      if (p >= 1) return this.finish();
    } else {
      for (let i = 0; i < 4; i++) {
        const h = dt / 4;
        const a = -this.k * (this.x - this.to) - this.c * this.v;
        this.v += a * h;
        this.x += this.v * h;
      }
      if (Math.abs(this.x - this.to) < 0.2 && Math.abs(this.v) < 4) return this.finish();
    }
    this.el.style.width = Math.min(this.x, this.max).toFixed(2) + 'px';
    this.raf = requestAnimationFrame(this.tick);
  }
  finish() {
    cancelAnimationFrame(this.raf); this.raf = 0; this.x = this.to; this.v = 0;
    this.el.style.width = Math.min(this.to, this.max) + 'px';
    this.onRest?.();
  }
}

/* ---------------------------------------------------------------- o confete: canvas 2D atrás da pílula */
const RECT = 0, STRIP = 1, DOT = 2, RIBBON = 3;
const KIND = { rect: RECT, strip: STRIP, dot: DOT, ribbon: RIBBON };
const TAU = Math.PI * 2;

class ConfettiField {
  constructor(root, canvas) {
    this.root = root; this.canvas = canvas; this.ctx = null; this.pieces = []; this.raf = 0; this.last = 0;
    this.ratio = 1; this.box = { x: 0, y: 0, w: 0, h: 0 }; this.dirty = null; this.g = 1000; this.s = 1; this.h = 52;
    this.tick = this.tick.bind(this);
  }
  // a caixa do voo, recortada pela parte visível: a tela e cada ancestral que corta o que transborda
  layout({ cx, cy, faceW, h }) {
    const want = { l: cx - faceW / 2 - 3.1 * h, r: cx + faceW / 2 + 3.1 * h, t: cy - 4.2 * h, b: cy + 5.2 * h };
    const rb = this.root.getBoundingClientRect();
    const scale = rb.height / (this.root.offsetHeight || 1) || 1;
    const de = document.documentElement;
    let vl = 0, vt = 0, vr = de.clientWidth, vb = de.clientHeight;
    for (let el = this.root.parentElement; el && el !== document.body && el !== de; el = el.parentElement) {
      const cs = getComputedStyle(el);
      const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || /paint|strict|content/.test(cs.contain || '');
      if (!clips) continue;
      const r = el.getBoundingClientRect();
      const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
      const l = r.left + el.clientLeft * k, t = r.top + el.clientTop * k;
      vl = Math.max(vl, l); vt = Math.max(vt, t);
      vr = Math.min(vr, l + el.clientWidth * k); vb = Math.min(vb, t + el.clientHeight * k);
    }
    const x = Math.ceil(Math.max(want.l, (vl - rb.left) / scale));
    const y = Math.ceil(Math.max(want.t, (vt - rb.top) / scale));
    const R = Math.floor(Math.min(want.r, (vr - rb.left) / scale - 1));
    const B = Math.floor(Math.min(want.b, (vb - rb.top) / scale - 1));
    if (R - x < 8 || B - y < 8) return null;
    const ratio = Math.min(3, Math.max(1, (window.devicePixelRatio || 1) * scale));
    return { box: { x, y, w: R - x, h: B - y }, ratio };
  }
  place(box, ratio) {
    const bw = Math.max(1, Math.round(box.w * ratio)), bh = Math.max(1, Math.round(box.h * ratio));
    const st = this.canvas.style;
    st.left = box.x + 'px'; st.top = box.y + 'px'; st.width = box.w + 'px'; st.height = box.h + 'px';
    const resized = this.canvas.width !== bw || this.canvas.height !== bh;
    if (this.canvas.width !== bw) this.canvas.width = bw;
    if (this.canvas.height !== bh) this.canvas.height = bh;
    const mudou = this.box.x !== box.x || this.box.y !== box.y || this.ratio !== ratio;
    if (!resized && mudou && this.ctx) { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, bw, bh); }
    if (mudou) this.dirty = null;
    this.box = box; this.ratio = ratio;
  }
  prepare(spec) {
    if (this.raf) return;
    const l = this.layout(spec);
    if (l) this.place(l.box, l.ratio);
  }
  burst(spec, opts) {
    const l = this.layout(spec);
    if (!l) return;
    this.place(l.box, l.ratio);
    const ctx = this.ctx || (this.ctx = this.canvas.getContext('2d'));
    if (!ctx) return;
    const s = (this.s = spec.h / 52);
    this.h = spec.h; this.g = 1000 * s;
    const tones = opts.colors.map(c => toneSet(ctx, c));
    const kinds = opts.shapes.map(k => KIND[k] ?? RECT);
    const count = Math.max(0, Math.min(300, Math.round(opts.count)));
    const R = Math.random;
    for (let i = 0; i < count; i++) {
      const xn = R() * 2 - 1;
      const ang = -Math.PI / 2 + xn * 0.42 + (R() - 0.5) * 0.72;
      const sp = (760 + R() * 480) * s * (1 - Math.abs(xn) * 0.16);
      const kind = kinds[Math.floor(R() * kinds.length)];
      const tone = tones[Math.floor(R() * tones.length)];
      let w, h;
      if (kind === STRIP) { w = (2.7 + R() * 1.2) * s; h = (12 + R() * 7) * s; }
      else if (kind === DOT) { w = h = (4.8 + R() * 2.8) * s; }
      else if (kind === RIBBON) { w = (14 + R() * 7) * s; h = (2 + R() * 0.6) * s; }
      else { w = (6.8 + R() * 4) * s; h = (9.5 + R() * 5) * s; }
      this.pieces.push({
        x: spec.cx + xn * spec.faceW * 0.36, y: spec.cy + (R() - 0.5) * spec.h * 0.36,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        rot: R() * TAU, vr: (R() < 0.5 ? -1 : 1) * (4 + R() * 8),
        flip: R() * TAU, vf: (R() < 0.5 ? -1 : 1) * (6 + R() * 9),
        sway: R() * TAU, vs: 3 + R() * 3, w, h, kind,
        k: (kind === DOT ? 3.4 : 4.4) * (0.78 + R() * 0.5),
        age: -(0.04 + R() * 0.07), life: 1.7 + R() * 0.7,
        light: tone[0], front: tone[1], back: tone[2],
      });
    }
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  }
  tick(now) {
    const ctx = this.ctx;
    if (!ctx) return;
    const dt = Math.min(1 / 30, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const r = this.ratio;
    const { x: bx, y: by, w: bw, h: bh } = this.box;
    const g = this.g, fadeEdge = 0.9 * this.h, swayMax = 7 * this.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.dirty) ctx.clearRect(this.dirty.x, this.dirty.y, this.dirty.w, this.dirty.h);
    ctx.lineCap = 'round';
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, alive = 0, dead = 0;
    const pieces = this.pieces;
    for (const p of pieces) {
      if (p.age < 0) { p.age += dt; alive++; continue; }
      p.age += dt;
      if (p.age >= p.life) { dead++; continue; }
      alive++;
      const c = Math.cos(p.flip);
      const face = p.kind === DOT ? 1 : Math.abs(c);
      const k = p.kind === DOT ? p.k : p.k * (0.62 + 0.55 * face);
      p.vx -= k * p.vx * dt;
      p.vy += (g - k * p.vy) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt; p.vr *= 1 - Math.min(1, 0.9 * dt);
      p.flip += p.vf * dt; p.sway += p.vs * dt;
      const swayIn = Math.min(1, Math.max(0, (p.age - 0.4) / 0.8));
      const px = p.x + Math.sin(p.sway) * swayMax * swayIn - bx;
      const py = p.y - by;
      const rem = p.life - p.age;
      let a = rem < 0.6 ? rem / 0.6 : 1;
      const edge = Math.min(px, py, bw - px, bh - py) / fadeEdge;
      if (edge < 1) a *= Math.max(0, edge);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      if (p.kind === DOT) {
        ctx.fillStyle = c > 0.7 ? p.light : p.front;
        ctx.setTransform(r, 0, 0, r, px * r, py * r);
        ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, TAU); ctx.fill();
      } else {
        const sy = Math.max(0.08, face), cs = Math.cos(p.rot), sn = Math.sin(p.rot);
        ctx.setTransform(cs * r, sn * r, -sn * sy * r, cs * sy * r, px * r, py * r);
        if (p.kind === RIBBON) {
          const half = p.w / 2, amp = p.w * 0.26 * Math.sin(p.sway * 1.7);
          ctx.strokeStyle = c > 0.3 ? p.light : p.front;
          ctx.lineWidth = p.h;
          ctx.beginPath(); ctx.moveTo(-half, 0); ctx.bezierCurveTo(-half / 3, -amp, half / 3, amp, half, 0); ctx.stroke();
        } else {
          ctx.fillStyle = c > 0.62 ? p.light : c > -0.12 ? p.front : p.back;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
      }
      const m = Math.max(p.w, p.h) * 0.8 + 2;
      x0 = Math.min(x0, px - m); y0 = Math.min(y0, py - m); x1 = Math.max(x1, px + m); y1 = Math.max(y1, py + m);
    }
    ctx.globalAlpha = 1;
    if (dead) this.pieces = pieces.filter(p => p.age < p.life);
    if (x0 < x1) {
      const dx = Math.max(0, Math.floor(x0 * r)), dy = Math.max(0, Math.floor(y0 * r));
      this.dirty = { x: dx, y: dy, w: Math.ceil(x1 * r) - dx + 1, h: Math.ceil(y1 * r) - dy + 1 };
    } else this.dirty = null;
    if (!alive) { this.raf = 0; this.release(); return; }
    this.raf = requestAnimationFrame(this.tick);
  }
  release() {
    if (this.raf) return;
    this.dirty = null;
    this.canvas.width = 0; this.canvas.height = 0;
    this.canvas.style.width = '0px'; this.canvas.style.height = '0px';
  }
}

// três tons de uma cor: o brilho, a frente e o verso
function toneSet(ctx, color) {
  ctx.fillStyle = '#000000';
  ctx.fillStyle = color;
  const value = String(ctx.fillStyle);
  const m = /^#([0-9a-f]{6})$/i.exec(value);
  if (!m) return [value, value, value];
  const n = parseInt(m[1], 16);
  const rgb = [n >> 16, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const mix = (to, t) => 'rgb(' + rgb.map(v => Math.round(v + (to - v) * t)).join(',') + ')';
  return [mix(255, lum > 0.3 ? 0.36 : 0.12), value, mix(0, 0.13)];
}

/* ---------------------------------------------------------------- ícones */
const SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
const AVIAO = `<svg class="csb-icon csb-icon--plane" ${SVG}><path d="M20.4 3.6 3.9 10.3l6.3 3.3 3.3 6.4z"/><path d="m10.2 13.6 4.6-4.6"/></svg>`;
const VISTO = `<svg class="csb-icon csb-icon--check" ${SVG.replace('stroke-width="2"', 'stroke-width="2.4"')}><path class="csb-draw" pathLength="1" d="m5.4 12.7 4.2 4.1 9-9.5"/></svg>`;
const DENOVO = `<svg class="csb-icon csb-icon--retry" ${SVG}><path class="csb-draw" pathLength="1" d="M18.8 14.5A7.2 7.2 0 1 1 17.5 7.4M17.5 3.6v3.8h-3.8"/></svg>`;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------------------------------------------------------- o botão */
export function montarConfete(original, {
  rotulo = original.textContent.trim(), carregando = 'Enviando', enviado = 'Enviado', erro = 'Tente de novo',
  icone = AVIAO, minLoading = 900, successDuration = 3000, errorDuration = 2600, tamanho = 'md', align = 'center',
  quantidade = 80, aoMudar,
} = {}) {
  const conteudo = {
    idle: `${icone || ''}<span class="csb-text">${esc(rotulo)}</span>`,
    loading: '<span class="csb-dots" aria-hidden="true"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i></span>',
    success: `${VISTO}<span class="csb-text">${esc(enviado)}</span>`,
    error: `${DENOVO}<span class="csb-text">${esc(erro)}</span>`,
  };
  const root = document.createElement('span');
  root.className = 'csb ' + [...original.classList].filter(c => c !== 'botao').join(' ');
  root.dataset.size = tamanho;
  root.dataset.align = align;
  root.innerHTML = `<canvas class="csb-canvas" width="0" height="0" aria-hidden="true"></canvas>
    <button class="csb-btn" type="${original.type || 'submit'}">
      <span class="csb-sizers" aria-hidden="true">${STATES.map(s => `<span class="csb-row csb-row--${s}" data-molde="${s}">${conteudo[s]}</span>`).join('')}</span>
      <span class="csb-face"><span class="csb-clip">${STATES.map(s => `<span class="csb-row csb-row--${s} csb-layer" data-camada="${s}">${conteudo[s]}${s === 'loading' ? `<span class="csb-sr">${esc(carregando)}</span>` : ''}</span>`).join('')}</span></span>
    </button>
    <span class="csb-sr" aria-live="polite" aria-atomic="true"></span>`;
  original.replaceWith(root);
  const btn = root.querySelector('.csb-btn');
  const face = root.querySelector('.csb-face');
  const live = root.querySelector('[aria-live]');
  const moldes = Object.fromEntries(STATES.map(s => [s, root.querySelector(`[data-molde="${s}"]`)]));
  const camadas = Object.fromEntries(STATES.map(s => [s, root.querySelector(`[data-camada="${s}"]`)]));
  const spring = new WidthSpring(face);
  const field = new ConfettiField(root, root.querySelector('canvas'));

  let shown = 'idle', prev = null, moved = false, requested = 'idle', loadingAt = 0, espera = 0, volta = 0, reserva = 0;
  const busy = () => shown === 'loading' || shown === 'success' || requested === 'loading';
  // os estados com rótulo ocupam o espaço todo; só o carregando encolhe para a largura do conteúdo
  const alvo = s => (s !== 'loading' ? btn.clientWidth : moldes[s].offsetWidth);

  function pintar() {
    root.dataset.state = shown;
    root.toggleAttribute('data-busy', busy());
    root.toggleAttribute('data-moved', moved);
    for (const s of STATES) {
      camadas[s].dataset.phase = !moved ? (s === shown ? 'rest' : 'wait') : s === shown ? 'in' : s === prev ? 'out' : 'wait';
      camadas[s].toggleAttribute('aria-hidden', s !== shown);
    }
    if (shown === 'loading') btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy');
    if (busy()) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled');
    live.textContent = shown === 'loading' ? carregando + '…' : shown === 'success' ? enviado : shown === 'error' ? erro : '';
  }

  function burstSpec() {
    const h = btn.offsetHeight, slot = btn.clientWidth, faceW = alvo('success');
    const left = align === 'start' ? 0 : align === 'end' ? slot - faceW : (slot - faceW) / 2;
    return { cx: btn.offsetLeft + left + faceW / 2, cy: btn.offsetTop + h / 2, faceW, h };
  }

  function trocar() {
    prev = shown; shown = requested; moved = true;
    if (shown === 'loading') loadingAt = performance.now();
    pintar();
    const red = reduzido();
    spring.max = btn.clientWidth || Infinity;
    spring.go(alvo(shown), ...(shown === 'loading' ? SPRING_SHRINK : SPRING_GROW), red ? 150 : 0, () => {
      if (shown !== 'loading') face.style.width = '';
    });
    clearTimeout(reserva);
    if (shown === 'success' && !red) {
      const tinta = getComputedStyle(root).getPropertyValue('--csb-bg').trim() || '#f4f4f2';
      field.burst(burstSpec(), { count: quantidade, colors: ['#ff5a1f', '#ff8a5c', '#ffd27a', '#63d69e', tinta], shapes: SHAPES });
    } else if (shown === 'loading' && !red) reserva = setTimeout(() => field.prepare(burstSpec()), 320);
    else field.release();
    clearTimeout(volta);
    if (shown === 'success' || shown === 'error') volta = setTimeout(() => status('idle'), shown === 'success' ? successDuration : errorDuration);
    aoMudar?.(shown);
  }

  // o carregando segura pelo menos minLoading
  function status(next) {
    requested = next;
    clearTimeout(espera);
    if (requested === shown) return;
    const wait = shown === 'loading' && requested !== 'idle' ? loadingAt + minLoading - performance.now() : 0;
    if (wait > 0) espera = setTimeout(trocar, wait);
    else trocar();
  }

  // ocupado: o clique (e o Enter num campo) não envia o formulário de novo
  btn.addEventListener('click', e => { if (busy()) e.preventDefault(); });
  const solta = () => btn.removeAttribute('data-sink');
  btn.addEventListener('pointerdown', () => { if (!busy()) btn.setAttribute('data-sink', ''); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, solta));
  new ResizeObserver(() => {
    spring.max = btn.clientWidth || Infinity;
    if (spring.running) spring.to = alvo(shown);
    else if (shown === 'loading') face.style.width = alvo(shown) + 'px';
  }).observe(btn);

  pintar();
  requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute('data-ready', '')));
  return { status, botao: btn, get estado() { return shown; } };
}
