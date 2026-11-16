// Planos: abas "Criar meu site" / "Manter no ar", botões que abrem a conversa já escrita
// com o domínio digitado e o plano, e o fecho (domínio + prazo + pacote).
import { definir, ouvir, dominio, PLANOS } from './estado.js';
import { linkConversa } from '../contato.js';
import { textoCupom } from '../oferta.js';

const PRECOS = {
  decolagem: { avista: '1.200', parcelado: '400' },
  orbita: { avista: '2.200', parcelado: '733,33' },
  lua: { avista: '3.800', parcelado: '1.266,67' },
  medida: {},
};
const MENSAIS = { base: ['Base', '89'], plus: ['Plus', '189'], pro: ['Pro', '390'] };

function mensagem(id, d) {
  if (MENSAIS[id]) {
    const [nome, preco] = MENSAIS[id];
    return `Olá! Quero assinar a manutenção ${nome} (R$ ${preco}/mês) para o site ${d}.`;
  }
  if (id === 'medida') return `Olá! Quero um orçamento de projeto sob medida (loja, sistema ou app) para ${d}.`;
  return `Olá! Quero o site ${d} no pacote ${PLANOS[id].nome} (preço de lançamento).${textoCupom()}`;
}

export function iniciarPlanos() {
  definir({ precos: PRECOS });

  // abas
  const seletor = document.querySelector('.seletor');
  const abas = [...seletor.querySelectorAll('[role=tab]')];
  const fundo = seletor.querySelector('.seletor__fundo');
  const moverFundo = () => {
    const ativa = abas.find(a => a.getAttribute('aria-selected') === 'true');
    fundo.style.width = `${ativa.offsetWidth}px`;
    fundo.style.transform = `translateX(${ativa.offsetLeft - 4}px)`;
  };
  function abrir(aba, focar) {
    abas.forEach(a => {
      const sim = a === aba;
      a.setAttribute('aria-selected', String(sim));
      a.tabIndex = sim ? 0 : -1;
      const painel = document.getElementById(a.getAttribute('aria-controls'));
      painel.hidden = !sim;
      if (sim) {
        painel.classList.remove('is-entrando');
        void painel.offsetWidth;
        painel.classList.add('is-entrando');
      }
    });
    if (focar) aba.focus();
    moverFundo();
  }
  abas.forEach((a, i) => {
    a.addEventListener('click', () => abrir(a));
    a.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); abrir(abas[(i + d + abas.length) % abas.length], true); }
    });
  });
  requestAnimationFrame(moverFundo);
  document.fonts.ready.then(moverFundo);
  window.addEventListener('resize', moverFundo);

  // os nomes acendem como neon quando os cartões aparecem
  const secao = document.querySelector('.planos');
  const io = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    secao.classList.add('is-visivel-cartoes');
    io.disconnect();
  }, { rootMargin: '0px 0px -20% 0px' });
  io.observe(document.getElementById('painel-site'));

  // luz que segue o mouse dentro do cartão
  document.querySelectorAll('.cartao').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`);
      c.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // botões de pedir: escolhem o pacote e abrem a conversa
  const pedidos = [...document.querySelectorAll('[data-pedir]')];
  pedidos.forEach(a => {
    a.target = '_blank';
    a.rel = 'noopener';
    a.addEventListener('click', () => { if (PLANOS[a.dataset.pedir]) definir({ plano: a.dataset.pedir }); });
  });

  const fechoTexto = document.querySelector('.fecho__texto');
  const fechoDominio = document.querySelector('.fecho__dominio');
  const forte = t => Object.assign(document.createElement('strong'), { textContent: t });
  ouvir(e => {
    const d = dominio(e);
    pedidos.forEach(a => { a.href = linkConversa(mensagem(a.dataset.pedir, d)); });
    if (fechoDominio.textContent !== d) {
      fechoDominio.textContent = d;
      fechoDominio.dispatchEvent(new Event('mudou'));
    }
    const plano = PLANOS[e.plano];
    if (e.plano === 'medida') fechoTexto.replaceChildren('no ar no prazo que combinarmos juntos.');
    else fechoTexto.replaceChildren('no ar em ', forte(`${plano.prazo} úteis`), ', no pacote ', forte(plano.nome), '.');
  });
  definir({ plano: 'orbita' });
}
