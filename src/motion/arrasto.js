// Girar o globo com a mão, só no hero: arrasta e solta com inércia.
// Ao descer a página o giro volta a zero e o roteiro da rolagem segue igual.
import { tela, amortecer, limitar, reduzido } from './rolagem.js';

const GRAUS = 180 / Math.PI;

export function criarArrasto(coreografia) {
  const hero = document.querySelector('.hero');
  const { giro, atual } = coreografia;
  const vel = { lat: 0, lon: 0 };
  let arrastando = false;
  let toque = false;
  let x0 = 0;
  let y0 = 0;
  let t0 = 0;

  // só enquanto o hero está quase todo na tela
  const ativo = () => tela.y < hero.offsetHeight * 0.3;
  const noGlobo = (x, y) => Math.hypot(x - atual.cx, y - atual.cy) < atual.r * 0.98;

  hero.addEventListener('pointerdown', e => {
    if (reduzido || !ativo() || e.button !== 0) return;
    if (e.target.closest('a, button') || !noGlobo(e.clientX, e.clientY)) return;
    if (e.pointerType === 'mouse') e.preventDefault(); // não seleciona o texto
    arrastando = true;
    toque = e.pointerType !== 'mouse';
    x0 = e.clientX;
    y0 = e.clientY;
    t0 = e.timeStamp;
    vel.lat = vel.lon = 0;
    hero.setPointerCapture(e.pointerId);
    hero.classList.add('is-girando');
  });

  hero.addEventListener('pointermove', e => {
    if (!arrastando) {
      if (e.pointerType === 'mouse') hero.classList.toggle('is-giravel', ativo() && !e.target.closest('a, button') && noGlobo(e.clientX, e.clientY));
      return;
    }
    const dt = Math.max(1, e.timeStamp - t0) / 1000;
    // a superfície acompanha a mão: um raio arrastado gira um radiano
    const dLon = -((e.clientX - x0) / atual.r) * GRAUS;
    // no toque o arrasto vertical é da página (touch-action: pan-y), então só gira de lado
    const dLat = toque ? 0 : ((e.clientY - y0) / atual.r) * GRAUS;
    giro.lon += dLon;
    giro.lat = limitar(giro.lat + dLat, -40, 40);
    vel.lon = dLon / dt;
    vel.lat = dLat / dt;
    x0 = e.clientX;
    y0 = e.clientY;
    t0 = e.timeStamp;
  });

  function soltar(e) {
    if (!arrastando) return;
    arrastando = false;
    hero.classList.remove('is-girando');
    // soltar parado não joga o globo
    if (e.timeStamp - t0 > 80) vel.lat = vel.lon = 0;
    vel.lon = limitar(vel.lon, -720, 720);
    vel.lat = limitar(vel.lat, -360, 360);
  }
  hero.addEventListener('pointerup', soltar);
  hero.addEventListener('pointercancel', soltar);
  hero.addEventListener('pointerleave', () => hero.classList.remove('is-giravel'));

  function quadro(dt) {
    if (arrastando) return;
    giro.lon += vel.lon * dt;
    giro.lat = limitar(giro.lat + vel.lat * dt, -40, 40);
    vel.lon = amortecer(vel.lon, 0, 2.6, dt);
    vel.lat = amortecer(vel.lat, 0, 2.6, dt);
    // o giro de lado fica onde a mão deixou; a inclinação volta devagar ao roteiro
    giro.lat = amortecer(giro.lat, 0, 1.2, dt);
    if (!ativo()) {
      // fora do hero: volta pelo caminho mais curto (a volta inteira não aparece)
      giro.lon = ((giro.lon % 360) + 540) % 360 - 180;
      giro.lon = amortecer(giro.lon, 0, 3, dt);
      vel.lon = vel.lat = 0;
    }
  }

  return { quadro };
}
