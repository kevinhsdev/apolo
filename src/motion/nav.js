// Nav fixa: some ao descer, volta ao subir; ganha fundo depois do hero. Menu do celular em tela cheia.
import { lenis, aCadaQuadro, tela } from './rolagem.js';

export function iniciarNav() {
  const nav = document.querySelector('[data-nav]');
  const botao = nav.querySelector('.nav__menu');
  const menu = document.getElementById('menu');
  let ultimo = window.scrollY;
  let acumulado = 0;
  let escondida = false;

  aCadaQuadro(() => {
    const y = tela.y;
    const d = y - ultimo;
    ultimo = y;
    if (d === 0 || !menu.hidden) return;
    acumulado = Math.sign(d) === Math.sign(acumulado) ? acumulado + d : d;
    if (!escondida && acumulado > 12 && y > 80) { escondida = true; nav.classList.add('is-escondida'); }
    if (escondida && acumulado < -24) { escondida = false; nav.classList.remove('is-escondida'); }
    nav.classList.toggle('is-solida', y > tela.h * 0.6);
  });
  nav.addEventListener('focusin', () => { escondida = false; nav.classList.remove('is-escondida'); });

  function abrir(sim) {
    botao.setAttribute('aria-expanded', String(sim));
    document.documentElement.classList.toggle('is-menu', sim);
    const t = sim ? 'Fechar' : 'Menu';
    botao.querySelectorAll('.rola span').forEach(s => { s.textContent = t; });
    if (sim) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-aberto'));
      lenis?.stop();
    } else {
      menu.classList.remove('is-aberto');
      setTimeout(() => { if (botao.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, 420);
      lenis?.start();
    }
  }
  botao.addEventListener('click', () => abrir(botao.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) abrir(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { abrir(false); botao.focus(); }
  });
}
