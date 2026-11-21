// Arrastar para confirmar (base: Slide Confirm Button, ProfitizeBuild), convertido para JS puro.
// Uso: const d = montarDeslizar(botaoExistente, { rotulo, confirmado, onConfirm: async () => {...} });
// onConfirm devolve uma Promise: resolveu → visto e balão; rejeitou → tremor e o balão com err.message.
// d.rotulo(texto) troca o rótulo; d.reset() volta ao começo. É um <button> de verdade (Enter e Espaço confirmam).
import './deslizar.css';

const SPRING = {
  back: [15, 0.46], commit: [16.5, 0.58], glide: [11, 0.68], step: [22, 0.82], reset: [10, 0.72], nudge: [11.5, 0.32], calm: [26, 1],
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// o elástico do iOS: cede 55% no começo e nunca passa de dim
const rubber = (d, dim) => (1 - 1 / ((d * 0.55) / dim + 1)) * dim;

class SlideEngine {
  constructor(els, live, hooks) {
    Object.assign(this, {
      els, live, hooks, reduce: false, dead: false, phase: 'idle', bubbleOn: false,
      W: 0, K: 0, D: 0, pad: 0, labelLeft: 0, x: 0, vx: 0, goal: 0, spring: SPRING.back,
      t: 0, vt: 0, sq: 1, vsq: 0, ts: 1, vts: 0, shakeAt: -1,
      pid: null, startX: 0, x0: 0, scale: 1, moved: false, armed: false, touch: false, lastUp: -1e9, lastNudge: -1e9, samples: [],
      run: 0, pending: false, pendingAt: 0, result: null, timers: [], raf: 0, last: 0,
    });
    for (const m of ['frame', 'pointerMove', 'pointerUp', 'cancelDrag', 'escapeDrag']) this[m] = this[m].bind(this);
  }
  measure() {
    const { root, groove, knob, label } = this.els;
    this.W = groove.clientWidth;
    this.K = knob.offsetWidth;
    this.D = Math.max(1, this.W - this.K);
    this.pad = Math.max(0, (root.offsetHeight - groove.clientHeight) / 2);
    this.labelLeft = label.offsetLeft;
    if (this.phase === 'busy' || this.phase === 'done') this.x = this.goal = this.D;
    this.render(performance.now());
  }
  setPhase(p) { if (this.phase === p) return; this.phase = p; this.hooks.phase(p); }
  setBubble(show, kind = 'done') { this.bubbleOn = show; this.hooks.bubble({ show, kind }); }
  later(fn, ms) {
    const id = setTimeout(() => { this.timers = this.timers.filter(t => t !== id); fn(); }, ms);
    this.timers.push(id);
  }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
  vibrate(pattern) { if (this.touch) try { navigator.vibrate?.(pattern); } catch { /* sem vibração */ } }
  springTo(goal, name) { this.goal = goal; this.spring = SPRING[this.reduce ? 'calm' : name]; this.kick(); }

  kick() { if (this.raf || this.dead) return; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  frame(now) {
    this.raf = 0;
    const dt = clamp((now - this.last) / 1000, 0, 1 / 30);
    this.last = now;
    for (let i = 0; i < 4; i++) this.integrate(dt / 4);
    this.finishIfArrived(now);
    this.render(now);
    if (this.moving(now)) this.raf = requestAnimationFrame(this.frame);
  }
  integrate(h) {
    const dragging = this.pid !== null, rm = this.reduce;
    if (!dragging) {
      const [w, z] = this.spring;
      const before = this.x;
      this.vx += (-w * w * (this.x - this.goal) - 2 * z * w * this.vx) * h;
      this.x += this.vx * h;
      if (!rm && before < this.D && this.x >= this.D && this.vx > 0) this.vts += Math.min(0.55, this.vx * 0.00026);
    }
    const tg = rm ? 0 : clamp(this.vx * 0.0042, -this.pad * 0.7, this.K * 0.14);
    this.vt += (-484 * (this.t - tg) - 18.5 * this.vt) * h;
    this.t += this.vt * h;
    const tension = this.phase === 'busy' || this.phase === 'done' ? 0 : clamp(this.x / this.D, 0, 1);
    let sg = 1 - 0.06 * Math.pow(tension, 1.4) - Math.min(0.05, Math.abs(this.vx) * 0.000024);
    if (this.x < 0) sg += (rubber(-this.x, this.K * 0.2) / this.K) * 0.3;
    if (rm) sg = 1;
    this.vsq += (-676 * (this.sq - sg) - 26 * this.vsq) * h;
    this.sq += this.vsq * h;
    const pg = dragging && !rm ? 0.976 : 1;
    this.vts += (-576 * (this.ts - pg) - 24 * this.vts) * h;
    this.ts += this.vts * h;
  }
  moving(now) {
    if (this.pid !== null || this.shakeAt >= 0) return true;
    if (this.phase === 'busy' && this.result !== null) return true;
    const still = Math.abs(this.x - this.goal) < 0.05 && Math.abs(this.vx) < 1 && Math.abs(this.t) < 0.02 && Math.abs(this.vt) < 0.2
      && Math.abs(this.sq - 1) < 0.0005 && Math.abs(this.vsq) < 0.005 && Math.abs(this.ts - 1) < 0.0005 && Math.abs(this.vts) < 0.005;
    if (!still) return true;
    this.x = this.goal;
    this.vx = this.t = this.vt = this.vsq = this.vts = 0;
    this.sq = this.ts = 1;
    this.render(now);
    return false;
  }
  render(now) {
    const { band, knob, label, track } = this.els;
    const { W, K, D } = this;
    if (!W || !K) return;
    const rm = this.reduce, x = this.x;
    const head = clamp(x, 0, D);
    const squash = x < 0 ? rubber(-x, K * 0.2) : 0;
    const push = x > D && !rm ? rubber(x - D, Math.max(10, W * 0.04)) : 0;
    const left = rm ? 0 : clamp(this.t, -this.pad * 0.7, K * 0.14);
    const right = K + head - squash + Math.min(push * 0.3, this.pad * 0.5);
    const bw = Math.max(K * 0.5, right - left);
    band.style.width = bw.toFixed(2) + 'px';
    band.style.transform = `translate3d(${left.toFixed(2)}px,0,0) scaleY(${(rm ? 1 : this.sq).toFixed(4)})`;
    knob.style.transform = `translate3d(${(left + bw / 2 - K / 2).toFixed(2)}px,0,0)`;
    label.style.setProperty('--scb-e', (right - this.labelLeft).toFixed(1) + 'px');
    label.style.setProperty('--scb-f', Math.min(32, head * 0.9).toFixed(1) + 'px');
    label.style.opacity = clamp(1 - 0.32 * (head / D), 0, 1).toFixed(3);
    let lean = 0;
    if (!rm) {
      lean = push * 0.55 - squash * 0.25;
      if (this.shakeAt >= 0) {
        const s = (now - this.shakeAt) / 1000;
        if (s > 0.5) this.shakeAt = -1;
        else lean += Math.sin(s * Math.PI * 2 * 8.5) * 6.5 * Math.exp(-s * 7.5);
      }
    }
    track.style.transform = `translate3d(${lean.toFixed(2)}px,0,0) scale(${(rm ? 1 : this.ts).toFixed(4)})`;
  }

  pointerDown(e) {
    if (this.live().disabled || this.pid !== null || e.button !== 0) return;
    if (this.phase !== 'idle' && this.phase !== 'error') return;
    if (this.phase === 'error') this.toIdle();
    this.measure();
    const rect = this.els.root.getBoundingClientRect();
    this.scale = rect.width / (this.els.root.offsetWidth || rect.width || 1) || 1;
    this.pid = e.pointerId;
    this.touch = e.pointerType === 'touch';
    this.startX = e.clientX;
    this.x0 = this.x;
    this.vx = 0;
    this.moved = false;
    this.samples = [{ t: performance.now(), x: this.x }];
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* evento de script */ }
    addEventListener('pointermove', this.pointerMove);
    addEventListener('pointerup', this.pointerUp);
    addEventListener('pointercancel', this.pointerUp);
    addEventListener('keydown', this.escapeDrag);
    addEventListener('blur', this.cancelDrag);
    this.kick();
  }
  pointerMove(e) {
    if (e.pointerId !== this.pid) return;
    const now = performance.now();
    const dx = (e.clientX - this.startX) / (this.scale * this.ts);
    if (!this.moved && Math.abs(dx) > 3) { this.moved = true; this.setPhase('drag'); }
    this.x = this.x0 + dx;
    this.samples.push({ t: now, x: this.x });
    while (this.samples.length > 2 && now - this.samples[0].t > 100) this.samples.shift();
    const s0 = this.samples[0];
    if (now - s0.t > 8) this.vx = (this.x - s0.x) / ((now - s0.t) / 1000);
    const thr = this.live().threshold * this.D;
    if (!this.armed && this.x >= thr) this.arm(true);
    else if (this.armed && this.x < thr - this.D * 0.05) this.arm(false);
  }
  pointerUp(e) {
    if (e.pointerId !== this.pid) return;
    const cancelled = e.type === 'pointercancel';
    const now = performance.now();
    const v = this.releaseVelocity(now);
    const moved = this.moved;
    this.lastUp = now;
    this.endDrag();
    if (!moved) {
      this.setPhase('idle');
      if (!cancelled && this.goal === 0) this.nudge(this.reduce ? 0 : 440);
      return;
    }
    this.x = clamp(this.x, -this.K * 0.6, this.D + Math.max(10, this.W * 0.04) * 3);
    this.vx = clamp(v, -4000, 4000);
    const thr = this.live().threshold * this.D;
    if (!cancelled && (this.x >= thr || v >= 700 || (v > 250 && this.x + v * 0.28 >= thr))) this.commit(true);
    else { this.setPhase('idle'); this.springTo(0, 'back'); }
  }
  releaseVelocity(now) {
    const s = this.samples, last = s[s.length - 1];
    if (!last || now - last.t > 70) return 0;
    let first = last;
    for (let i = s.length - 1; i >= 0; i--) { if (now - s[i].t > 110) break; first = s[i]; }
    const dt = (last.t - first.t) / 1000;
    return dt > 0.012 ? (last.x - first.x) / dt : this.vx;
  }
  endDrag() {
    const { track } = this.els;
    if (this.pid !== null) try { if (track.hasPointerCapture(this.pid)) track.releasePointerCapture(this.pid); } catch { /* já solto */ }
    this.pid = null;
    this.arm(false);
    removeEventListener('pointermove', this.pointerMove);
    removeEventListener('pointerup', this.pointerUp);
    removeEventListener('pointercancel', this.pointerUp);
    removeEventListener('keydown', this.escapeDrag);
    removeEventListener('blur', this.cancelDrag);
    this.kick();
  }
  cancelDrag() { if (this.pid === null) return; this.endDrag(); this.setPhase('idle'); this.springTo(0, 'back'); }
  escapeDrag(e) { if (e.key !== 'Escape' || this.pid === null) return; e.preventDefault(); this.cancelDrag(); }
  arm(on) {
    if (this.armed === on) return;
    this.armed = on;
    this.els.root.toggleAttribute('data-armed', on);
    if (on) this.vibrate(8);
  }
  nudge(v) { this.spring = SPRING[this.reduce ? 'calm' : 'nudge']; this.goal = 0; this.vx += v; this.kick(); }
  hover(e) {
    if (e.pointerType !== 'mouse' || this.live().disabled || this.pid !== null || this.reduce) return;
    if (this.phase !== 'idle' || this.goal !== 0 || Math.abs(this.x) > 2) return;
    const now = performance.now();
    if (now - this.lastNudge < 700) return;
    this.lastNudge = now;
    this.measure();
    this.nudge(240);
  }
  keyDown(e) {
    if (this.live().disabled) return;
    const k = e.key;
    const free = (this.phase === 'idle' || this.phase === 'error') && this.pid === null;
    if (k === 'Enter' || k === ' ' || k === 'Spacebar') { e.preventDefault(); if (free && !e.repeat) this.commit(); return; }
    if (k === 'Escape') { if (free && this.goal > 0) { e.preventDefault(); this.springTo(0, 'back'); } return; }
    if (!free) return;
    this.measure();
    const step = this.D * 0.2;
    if (k === 'ArrowRight') { e.preventDefault(); if (this.goal + step >= this.D - 1) this.commit(); else this.springTo(this.goal + step, 'step'); }
    else if (k === 'ArrowLeft') { e.preventDefault(); this.springTo(Math.max(0, this.goal - step), 'step'); }
    else if (k === 'Home') { e.preventDefault(); this.springTo(0, 'step'); }
    else if (k === 'End') { e.preventDefault(); this.commit(); }
  }
  keyUp(e) { if (e.key === ' ' || e.key === 'Spacebar') e.preventDefault(); }
  blur() { if (this.pid === null && this.phase === 'idle' && this.goal > 0) this.springTo(0, 'back'); }
  // o clique depois de um arrasto não confirma; um clique sem ponteiro antes é o do leitor de tela: confirma
  click() {
    if (this.live().disabled || this.pid !== null) return;
    if (performance.now() - this.lastUp < 600) return;
    if (this.phase === 'idle' || this.phase === 'error') { this.touch = false; this.commit(); }
  }
  commit(byHand = false) {
    if (this.dead || this.live().disabled) return;
    if (this.phase === 'busy' || this.phase === 'done') return;
    this.clearTimers();
    if (this.bubbleOn) this.setBubble(false, 'error');
    this.measure();
    this.setPhase('busy');
    this.arm(false);
    this.springTo(this.D, byHand ? 'commit' : 'glide');
    if (byHand && !this.reduce) this.vx = Math.max(this.vx, 700);
    this.result = null;
    const run = ++this.run;
    let out;
    try { out = this.live().onConfirm?.(); } catch (err) { console.error(err); this.result = false; this.kick(); return; }
    if (out && typeof out.then === 'function') {
      this.pending = true;
      this.pendingAt = performance.now();
      this.els.root.setAttribute('data-pending', '');
      this.hooks.announce(this.live().loadingLabel);
      out.then(() => this.settle(run, true), () => this.settle(run, false));
    } else this.result = true;
    this.kick();
  }
  settle(run, ok) { if (this.dead || run !== this.run) return; this.result = ok; this.kick(); }
  finishIfArrived(now) {
    if (this.phase !== 'busy' || this.result === null) return;
    if (Math.abs(this.x - this.D) > 6 || Math.abs(this.vx) > 240) return;
    if (this.pending) {
      const shown = now - this.pendingAt;
      if (shown > 150 && shown < 600) return;
      this.pending = false;
      this.els.root.removeAttribute('data-pending');
    }
    if (this.result) this.succeed(); else this.fail(now);
  }
  succeed() {
    const live = this.live();
    this.setPhase('done');
    this.setBubble(true, 'done');
    this.hooks.announce(live.confirmedLabel);
    this.vibrate(14);
    if (live.resetAfter > 0) this.later(() => this.reset(), live.resetAfter);
  }
  fail(now) {
    const live = this.live();
    this.setPhase('error');
    this.setBubble(true, 'error');
    this.hooks.announce(live.errorLabel);
    this.vibrate([10, 40, 10]);
    this.shakeAt = this.reduce ? -1 : now;
    this.springTo(0, 'back');
    this.later(() => this.toIdle(), 2400);
  }
  toIdle() { this.clearTimers(); if (this.bubbleOn) this.setBubble(false, 'error'); this.setPhase('idle'); this.hooks.announce(''); }
  reset() {
    if (this.dead) return;
    this.clearTimers();
    this.run++;
    this.result = null;
    this.pending = false;
    this.els.root.removeAttribute('data-pending');
    if (this.pid !== null) this.endDrag();
    const hadBubble = this.bubbleOn;
    if (hadBubble) this.setBubble(false, this.phase === 'error' ? 'error' : 'done');
    this.setPhase('idle');
    this.hooks.announce('');
    if (hadBubble && !this.reduce) this.later(() => this.springTo(0, 'reset'), 110);
    else this.springTo(0, 'reset');
    this.kick();
  }
}

const DRAG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle class="scb-dot scb-dot--1" cx="3.6" cy="12" r="1.15" fill="currentColor"/><circle class="scb-dot scb-dot--2" cx="8.3" cy="12" r="1.45" fill="currentColor"/><path d="M13.2 6.4 18.8 12l-5.6 5.6" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SPIN = '<svg class="scb-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M12 4.2a7.8 7.8 0 1 1-7.8 7.8" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path class="scb-check" d="M5.4 12.6 9.9 17 18.6 7.6" pathLength="1" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let uid = 0;

export function montarDeslizar(original, {
  rotulo = original.textContent.trim(), confirmado = 'Confirmado', carregando = 'Confirmando…', erro = 'Não deu certo. Tente de novo.',
  dica = 'Arraste até o fim ou aperte Enter para confirmar.', onConfirm, resetAfter, threshold = 0.8,
} = {}) {
  const id = 'scb-' + ++uid;
  const root = document.createElement('div');
  root.className = 'scb';
  root.dataset.tone = 'brasa';
  root.dataset.state = 'idle';
  root.innerHTML = `<button type="button" class="scb-track" aria-describedby="${id}">
      <span class="scb-groove">
        <span class="scb-label"><span class="scb-label__text"></span><span class="scb-shine" aria-hidden="true"><span class="scb-shine__copy"><span class="scb-label__text"></span></span></span></span>
        <span class="scb-band" aria-hidden="true"></span>
        <span class="scb-knob" aria-hidden="true"><span class="scb-icon scb-icon--drag">${DRAG}</span><span class="scb-icon scb-icon--load">${SPIN}</span><span class="scb-icon scb-icon--done">${CHECK}</span></span>
      </span>
    </button>
    <span class="scb-bubble" data-kind="done" aria-hidden="true"><span class="scb-bubble__body"></span><svg class="scb-bubble__tail" viewBox="0 0 20 9" aria-hidden="true" focusable="false"><path d="M0 0h20c-4.6 0-6.4 7.6-10 7.6S4.6 0 0 0Z"/></svg></span>
    <span id="${id}" class="scb-sr"></span>
    <span class="scb-sr" role="status" aria-live="polite"></span>`;
  original.replaceWith(root);
  const $ = s => root.querySelector(s);
  const track = $('.scb-track'), bubble = $('.scb-bubble'), corpo = $('.scb-bubble__body'), aviso = $('[role=status]');
  $('#' + id).textContent = dica;
  const live = { threshold: clamp(threshold, 0.3, 0.98), loadingLabel: carregando, confirmedLabel: confirmado, errorLabel: erro, onConfirm: null, resetAfter, disabled: false };

  const eng = new SlideEngine(
    { root, track, groove: $('.scb-groove'), band: $('.scb-band'), knob: $('.scb-knob'), label: $('.scb-label') },
    () => live,
    {
      phase: p => {
        root.dataset.state = p;
        const travado = p === 'busy' || p === 'done';
        if (p === 'done') track.setAttribute('aria-label', live.confirmedLabel); else track.removeAttribute('aria-label');
        if (travado) track.setAttribute('aria-disabled', 'true'); else track.removeAttribute('aria-disabled');
        if (p === 'busy') track.setAttribute('aria-busy', 'true'); else track.removeAttribute('aria-busy');
      },
      bubble: ({ show, kind }) => {
        bubble.toggleAttribute('data-show', show);
        bubble.dataset.kind = kind;
        corpo.textContent = kind === 'error' ? live.errorLabel : live.confirmedLabel;
      },
      announce: t => { aviso.textContent = t; },
    },
  );
  // a mensagem de erro vem do motivo da Promise rejeitada
  live.onConfirm = () => {
    live.errorLabel = erro;
    const r = onConfirm?.();
    return r && typeof r.then === 'function' ? r.catch(err => { if (err?.message) live.errorLabel = err.message; throw err; }) : r;
  };

  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onMq = () => { eng.reduce = mq.matches; };
  onMq();
  mq.addEventListener?.('change', onMq);
  new ResizeObserver(() => eng.measure()).observe($('.scb-groove'));
  track.addEventListener('pointerdown', e => eng.pointerDown(e));
  track.addEventListener('pointerenter', e => eng.hover(e));
  track.addEventListener('keydown', e => eng.keyDown(e));
  track.addEventListener('keyup', e => eng.keyUp(e));
  track.addEventListener('blur', () => eng.blur());
  track.addEventListener('click', () => eng.click());
  track.addEventListener('dragstart', e => e.preventDefault());

  const trocarRotulo = t => root.querySelectorAll('.scb-label__text').forEach(s => { s.textContent = t; });
  trocarRotulo(rotulo);
  eng.measure();
  requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute('data-ready', '')));
  return { rotulo: trocarRotulo, reset: () => eng.reset(), elemento: root };
}
