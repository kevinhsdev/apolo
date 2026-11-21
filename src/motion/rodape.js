// Rodapé: as ações das colunas (abrir a aba certa, destacar o cartão, focar o campo).
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
