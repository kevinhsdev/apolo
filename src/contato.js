// Contato da Apolo num lugar só. Preencha o WhatsApp (55 + DDD + número, só dígitos).
// Enquanto estiver vazio, os botões abrem a conversa no Direct do Instagram.
import { ouvir, dominio, PLANOS } from './motion/estado.js';
import { PARCELAS_SEM_JUROS } from './precos.js';

export const WHATSAPP = ''; // [preencher] ex.: '5511999999999'
export const INSTAGRAM = 'apolostudio.br';

export function linkConversa(texto) {
  if (WHATSAPP) return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
  return `https://ig.me/m/${INSTAGRAM}`;
}

export function textoPreco(e) {
  const p = e.precos[e.plano];
  if (!p || !p.avista) return '';
  return e.ciclo === 'parcelado' ? `${PARCELAS_SEM_JUROS}x de R$ ${p.parcelado}` : `R$ ${p.avista} à vista`;
}

export function iniciarContato() {
  document.querySelectorAll('[data-whats]').forEach(a => {
    a.href = linkConversa(a.dataset.whats);
    a.target = '_blank';
    a.rel = 'noopener';
  });
  const pedidos = document.querySelectorAll('[data-whats-pedido]');
  pedidos.forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  ouvir(e => {
    const plano = PLANOS[e.plano];
    const preco = textoPreco(e);
    const texto = e.plano === 'medida'
      ? `Olá! Quero um orçamento de projeto sob medida para ${dominio(e)}.`
      : `Olá! Quero o site ${dominio(e)} no pacote ${plano.nome}${preco ? ` (${preco})` : ''}.`;
    pedidos.forEach(a => { a.href = linkConversa(texto); });
  });
}
