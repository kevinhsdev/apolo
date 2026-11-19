// Tela de retorno do Mercado Pago (obrigado.html?pedido=ID): agradece, mostra o resumo e os próximos passos.
// Se o aviso do Mercado Pago (webhook) ainda não chegou, confere o pedido de novo por alguns segundos.
import '@fontsource-variable/figtree';
import '@fontsource-variable/sora';
import '../styles/tokens.css';
import '../styles/base.css';
import './pagar.css';
import './obrigado.css';
import '../estilo.js';
import '../acessibilidade.js';
import { CATALOGO, brl } from '../precos.js';
import { sb, sessao } from '../supabase.js';
import { linkConversa } from '../contato.js';
import { nomePedido } from './conta-dados.js';
import { estadoRetorno } from './obrigado-dados.js';

const raiz = document.querySelector('[data-obg]');
const q = new URLSearchParams(location.search);
const retorno = { status: q.get('collection_status') || q.get('status'), preapproval: q.has('preapproval_id') };
const idPedido = q.get('pedido');

// guarda só o que importa no endereço (o Mercado Pago devolve uma dúzia de parâmetros)
if (idPedido) {
  const limpo = new URLSearchParams({ pedido: idPedido, ...(retorno.status ? { status: retorno.status } : {}) });
  if (retorno.preapproval) limpo.set('preapproval_id', '1');
  history.replaceState(null, '', `${location.pathname}?${limpo}`);
}

const el = (tag, cls, txt) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, txt != null ? { textContent: txt } : {});
const FORMA = { pix: 'Pix', cartao: 'Cartão de crédito' };

// desenhos do selo, por estado
const SELO = {
  aprovado: '<circle class="obg__aro" cx="48" cy="48" r="40"/><path class="obg__check" d="M31 49l11 11 23-25"/>',
  confirmando: '<circle class="obg__aro obg__aro--fixo" cx="48" cy="48" r="40"/>',
  analise: '<circle class="obg__aro" cx="48" cy="48" r="40"/><path class="obg__ponteiro" d="M48 28v21l13 8"/>',
  recusado: '<circle class="obg__aro" cx="48" cy="48" r="40"/><path class="obg__check" d="M48 29v24"/><circle class="obg__ponto" cx="48" cy="64" r="2.6"/>',
  'sem-pedido': '<circle class="obg__aro" cx="48" cy="48" r="40"/><path class="obg__check" d="M31 49l11 11 23-25"/>',
};

function selo(estado) {
  const s = el('div', 'obg__selo obg__entra');
  s.innerHTML = `<svg viewBox="0 0 96 96" aria-hidden="true">${SELO[estado]}</svg><span class="obg__orbita" aria-hidden="true"><i></i></span>`;
  if (estado === 'aprovado') {
    // faíscas laranja saindo do selo, cada uma num ângulo
    const f = el('span', 'obg__faiscas');
    f.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 14; i++) {
      const d = el('i');
      d.style.setProperty('--a', `${(360 / 14) * i + (i % 2 ? 9 : 0)}deg`);
      d.style.setProperty('--d', `${62 + (i % 3) * 16}px`);
      d.style.setProperty('--t', `${(i % 4) * 40}ms`);
      f.append(d);
    }
    s.append(f);
  }
  return s;
}

function botao(texto, href, classe = 'botao') {
  const a = el('a', classe);
  a.href = href;
  a.innerHTML = '<span class="rola"><span class="rola__a"></span><span class="rola__b" aria-hidden="true"></span></span>';
  a.querySelectorAll('.rola > span').forEach(s => { s.textContent = texto; });
  return a;
}

function resumo(p) {
  const site = p.tipo !== 'mensal';
  const linhas = [['Pedido', nomePedido(p)]];
  if (!site) linhas.push(['Valor', `R$ ${brl(p.valor)}/mês`], ...(p.vence_em ? [['Próxima mensalidade', new Date(`${p.vence_em}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })]] : []));
  else if (p.forma === 'pix') linhas.push(['Entrada paga (50%)', `R$ ${brl(p.valor / 2)} no Pix`], ['Na entrega', `R$ ${brl(p.valor / 2)}`]);
  else linhas.push(['Valor', p.parcelas > 1 ? `${p.parcelas}x de R$ ${brl(p.valor / p.parcelas)} sem juros` : `R$ ${brl(p.valor)} no cartão`]);
  if (site && CATALOGO[p.plano]?.prazo) linhas.push(['Prazo', CATALOGO[p.plano].prazo]);
  const dl = el('dl', 'obg__resumo obg__entra');
  for (const [k, v] of linhas) { const d = el('div'); d.append(el('dt', '', k), el('dd', '', v)); dl.append(d); }
  return dl;
}

function passos(p) {
  const site = p.tipo !== 'mensal';
  const lista = site ? [
    ['Briefing no WhatsApp', 'Em até 1 dia útil, a gente chama você para entender o seu negócio.'],
    ['Acompanhe cada etapa', 'Briefing, primeira versão, ajustes: tudo aparece na sua área do cliente.'],
    ['Site no ar', `Em até ${CATALOGO[p.plano]?.prazo || 'alguns dias úteis'}, com o Padrão Apolo conferido.`],
  ] : [
    ['A gente entra em contato', 'Em até 1 dia útil, para combinar o acesso ao seu site.'],
    ['Pedidos de alteração', 'Pela área do cliente ou pelo WhatsApp, quando precisar.'],
    ['Mensalidade por e-mail', 'Três dias antes de vencer, o link chega por e-mail (Pix ou cartão). Cancele quando quiser.'],
  ];
  const sec = el('section', 'obg__passos obg__entra');
  sec.append(el('h2', 'obg__passos-titulo', 'Próximos passos'));
  const ol = el('ol');
  lista.forEach(([t, d], i) => {
    const li = el('li');
    li.style.setProperty('--n', String(i));
    li.append(el('strong', '', t), el('span', '', d));
    ol.append(li);
  });
  sec.append(ol);
  return sec;
}

function pintar(estado, p, nome, nota) {
  const cena = el('div', 'obg__cena');
  cena.dataset.estado = estado;
  const ola = nome ? `, ${nome}` : '';
  const site = p?.tipo !== 'mensal';
  const textos = {
    aprovado: ['Pagamento confirmado', `Obrigado${ola}!`, site ? `O seu ${nomePedido(p)} começou a decolar.` : `A sua ${nomePedido(p)} está ativa.`],
    confirmando: ['Quase lá', 'Confirmando seu pagamento…', 'O Mercado Pago está avisando a gente. Isso leva poucos segundos.'],
    analise: ['Pedido recebido', `Obrigado${ola}!`, 'O pagamento está em análise pelo Mercado Pago. Quando for aprovado, o pedido muda sozinho na sua área do cliente.'],
    recusado: ['Pagamento não concluído', 'Não deu certo desta vez', 'Nenhum valor foi cobrado. Você pode tentar de novo, com outro cartão ou pelo Pix.'],
    'sem-pedido': ['Pedido recebido', 'Obrigado pelo pedido!', 'Entre na área do cliente com o seu e-mail para acompanhar o pagamento e o projeto.'],
  }[estado];
  cena.append(selo(estado), el('p', 'obg__rotulo obg__entra', textos[0]), el('h1', 'obg__titulo obg__entra', textos[1]), el('p', 'obg__sub obg__entra', textos[2]));

  const acoes = el('div', 'obg__acoes obg__entra');
  if (estado === 'aprovado') {
    cena.append(resumo(p), passos(p));
    acoes.append(botao(site ? 'Acompanhar meu projeto' : 'Ver minha manutenção', `./conta.html#${site ? 'projeto' : 'manutencao'}`), botao('Ver pedidos', './conta.html#pedidos', 'botao botao--fantasma'));
  } else if (estado === 'analise') {
    cena.append(resumo(p));
    acoes.append(botao('Ir para a área do cliente', './conta.html#pedidos'));
  } else if (estado === 'recusado') {
    if (p.link_fatura) acoes.append(botao('Tentar de novo', p.link_fatura));
    const fale = botao('Falar com a gente', linkConversa(`Olá! Tentei pagar o pedido ${nomePedido(p)} e não deu certo.`), 'botao botao--fantasma');
    fale.target = '_blank'; fale.rel = 'noopener';
    acoes.append(fale);
  } else if (estado === 'sem-pedido') {
    acoes.append(botao('Ir para a área do cliente', './conta.html'));
  }
  if (acoes.childElementCount) cena.append(acoes);
  if (nota || estado === 'aprovado') cena.append(el('p', 'obg__nota obg__entra', nota || 'O comprovante do Mercado Pago chega no seu e-mail.'));

  cena.querySelectorAll('.obg__entra').forEach((n, i) => n.style.setProperty('--i', String(i)));
  raiz.replaceChildren(cena);
  const h1 = cena.querySelector('h1');
  h1.tabIndex = -1;
  if (estado !== 'confirmando') h1.focus({ preventScroll: true });
}

async function iniciar() {
  const s = idPedido && await sessao().catch(() => null);
  if (!s) return pintar('sem-pedido');
  const ler = async () => (await sb.from('pedidos').select('*').eq('id', idPedido).maybeSingle()).data;
  const [pedido, cliente] = await Promise.all([ler(), sb.from('clientes').select('nome').eq('id', s.user.id).maybeSingle().then(r => r.data)]);
  const nome = cliente?.nome?.trim().split(/\s+/)[0] || '';
  const estado = estadoRetorno(retorno, pedido);
  pintar(estado, pedido, nome);
  if (estado !== 'confirmando' && estado !== 'analise') return;

  // espera o webhook: confere a cada 3 s por até 1 minuto
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const p = await ler().catch(() => null);
    if (p && estadoRetorno(retorno, p) === 'aprovado') return pintar('aprovado', p, nome);
  }
  // o Mercado Pago disse que aprovou, mas o aviso atrasou: agradece assim mesmo
  if (estado === 'confirmando') pintar('aprovado', pedido, nome, 'O Mercado Pago aprovou o pagamento. O pedido pode levar alguns minutos para aparecer como pago na área do cliente.');
}

iniciar().catch(() => pintar('sem-pedido'));
