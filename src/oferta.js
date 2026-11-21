// A OFERTA DE LANÇAMENTO, num lugar só.
// Os preços dos cartões (no index.html) são os de lançamento; aqui ficam os preços cheios,
// que valem DEPOIS da data. Para ser legal (CDC, art. 37), o preço cheio tem que passar a ser
// cobrado quando a oferta acabar. Passou da data, a faixa, os riscados e o cupom somem sozinhos.
import { definir, ler } from './motion/estado.js';
import { precoCartao, descontoPix, OFERTA, ofertaNoAr, PARCELAS_SEM_JUROS } from './precos.js';
import { montarConfete } from './components/confete/confete.js';

export { OFERTA, ofertaNoAr };

const brl = n => n.toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const num = t => Number(String(t).replace(/\./g, '').replace(',', '.'));
const fim = new Date(OFERTA.ate);

/** texto do cupom aplicado para a mensagem do WhatsApp ('' sem cupom) */
export function textoCupom() {
  const c = ler().cupom;
  return c ? ` Cupom ${c} (${OFERTA.cupons[c].desconto}% off).` : '';
}

function falta() {
  const ms = Math.max(0, fim - Date.now());
  const d = Math.floor(ms / 864e5);
  const h = Math.floor(ms / 36e5) % 24;
  const m = Math.floor(ms / 6e4) % 60;
  const s = Math.floor(ms / 1e3) % 60;
  return { d, h, m, s, ms };
}

export function iniciarOferta() {
  if (!ofertaNoAr()) return;
  const data = fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const maior = Math.max(...['decolagem', 'orbita', 'lua'].map(id => {
    const c = document.querySelector(`[data-cartao="${id}"] [data-preco]`);
    return Math.round((1 - num(c.dataset.preco) / OFERTA.cheio[id]) * 100);
  }));

  // faixa do topo com a contagem
  const faixa = document.querySelector('[data-faixa]');
  faixa.querySelector('[data-faixa-texto]').textContent = `${OFERTA.nome}: até ${maior}% off nos sites, até ${data}`;
  const relogio = faixa.querySelector('[data-faixa-relogio]');
  const pinta = () => {
    const f = falta();
    if (!f.ms) { faixa.hidden = true; document.documentElement.classList.remove('tem-faixa'); return; }
    const p = n => String(n).padStart(2, '0');
    relogio.textContent = `${f.d}d ${p(f.h)}h ${p(f.m)}m ${p(f.s)}s`;
  };
  let fechada = false;
  try { fechada = sessionStorage.getItem('faixa-fechada') === '1'; } catch { /* sem storage */ }
  if (!fechada) {
    faixa.hidden = false;
    document.documentElement.classList.add('tem-faixa');
    pinta();
    setInterval(pinta, 1000);
  }
  faixa.querySelector('[data-faixa-fechar]').addEventListener('click', () => {
    faixa.hidden = true;
    document.documentElement.classList.remove('tem-faixa');
    try { sessionStorage.setItem('faixa-fechada', '1'); } catch { /* sem storage */ }
  });

  // pílula dos planos
  const pilula = document.querySelector('[data-pilula]');
  if (pilula) pilula.textContent = `${OFERTA.nome} até ${data} · ${descontoPix(1200)}% off no Pix ou ${PARCELAS_SEM_JUROS}x sem juros`;

  // preços riscados e selo de desconto
  const cartoes = [...document.querySelectorAll('[data-cartao]')];
  function pintarPrecos() {
    const cupom = OFERTA.cupons[ler().cupom];
    cartoes.forEach(c => {
      const id = c.dataset.cartao;
      const cheio = OFERTA.cheio[id];
      const elPreco = c.querySelector('[data-preco]');
      if (!cheio || !elPreco) return;
      const unico = !!c.closest('[data-painel="site"]');
      let atual = num(elPreco.dataset.preco);
      if (cupom && unico) atual = Math.round(atual * (1 - cupom.desconto / 100) * 100) / 100;
      const de = c.querySelector('[data-de]');
      de.hidden = false;
      de.querySelector('s').textContent = `R$ ${brl(cheio)}`;
      de.querySelector('.cartao__off').textContent = `-${Math.round((1 - atual / cheio) * 100)}%`;
      c.querySelector('.cartao__valor').textContent = brl(atual);
      c.classList.toggle('is-cupom', !!(cupom && unico));
      if (unico) {
        const cartao = precoCartao(atual);
        c.querySelector('.cartao__sub').innerHTML =
          `ou <b>${PARCELAS_SEM_JUROS}x de R$ ${brl(cartao / PARCELAS_SEM_JUROS)} sem juros</b> no cartão (R$ ${brl(cartao)}). No Pix, 50% para começar e 50% na entrega.`;
      }
    });
  }
  pintarPrecos();

  // cupom
  const [codigo, info] = Object.entries(OFERTA.cupons)[0] || [];
  const bloco = document.querySelector('[data-cupom]');
  if (!codigo || !bloco) return;
  bloco.hidden = false;
  bloco.querySelector('[data-cupom-codigo]').textContent = codigo;
  bloco.querySelector('[data-cupom-texto]').textContent = `${info.texto}, até ${data}.`;
  const copiado = bloco.querySelector('[data-cupom-copiado]');
  const form = bloco.querySelector('[data-cupom-form]');
  const campo = form.querySelector('input');
  const estado = bloco.querySelector('[data-cupom-estado]');
  bloco.querySelector('[data-cupom-copiar]').addEventListener('click', () => {
    navigator.clipboard?.writeText(codigo).catch(() => {});
    campo.value = codigo;
    copiado.textContent = 'Copiado';
    setTimeout(() => { copiado.textContent = 'Copiar'; }, 1600);
  });
  const botao = montarConfete(form.querySelector('button[type=submit]'), { rotulo: 'Aplicar', enviado: 'Aplicado', erro: 'Confira', icone: '', carregando: 'Aplicando o cupom' });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const c = campo.value.trim().toUpperCase();
    if (!OFERTA.cupons[c]) {
      estado.textContent = c ? 'Esse cupom não existe ou já acabou.' : 'Digite o código do cupom.';
      bloco.classList.remove('is-ok');
      bloco.classList.add('is-erro');
      botao.status('error');
      return;
    }
    botao.status('loading');
    setTimeout(() => {
      definir({ cupom: c });
      pintarPrecos();
      bloco.classList.remove('is-erro');
      bloco.classList.add('is-ok');
      estado.textContent = `Cupom ${c} aplicado: ${OFERTA.cupons[c].desconto}% off nos pacotes de site. Já vai junto na sua mensagem.`;
      botao.status('success');
    }, 900);
  });
}
