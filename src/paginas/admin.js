// Admin: lista de todos os pedidos e ficha com status e etapas. Só admins veem dados: o banco (eh_admin + RLS) garante.
import '@fontsource-variable/figtree';
import '@fontsource-variable/sora';
import '../styles/tokens.css';
import '../styles/base.css';
import './pagar.css';
import './conta.css';
import './admin.css';
import '../estilo.js';
import '../acessibilidade.js';
import { brl } from '../precos.js';
import { ligado, sb, sessao } from '../supabase.js';
import { montarEntrada } from '../entrar.js';
import { nomePedido, mascararDoc, resultadoLeitura } from './conta-dados.js';
import { noFiltro, contagens, tempoDesde, pedidoDoHash, resumoEtapas, statusPermitidos } from './admin-dados.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, txt != null ? { textContent: txt } : {});
const STATUS = { aguardando: 'Aguardando pagamento', pago: 'Pago', em_andamento: 'Em produção', entregue: 'Entregue', cancelado: 'Cancelado' };
const data = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const mostrar = v => {
  document.querySelectorAll('[data-vista]').forEach(e => { e.hidden = e.dataset.vista !== v; });
  $('[data-acoes]').hidden = !['lista', 'ficha'].includes(v);
};
const whats = numero => {
  const d = String(numero || '').replace(/\D/g, '');
  return d ? `https://wa.me/${d.startsWith('55') && d.length > 11 ? d : `55${d}`}` : null;
};
const link = (txt, href, cls = 'botao-acao botao-acao--neutro') => Object.assign(el('a', cls, txt), { href, target: '_blank', rel: 'noopener' });

let dados = { pedidos: [], clientes: new Map(), etapas: [] }, filtro = 'producao';
const etapasDe = id => dados.etapas.filter(e => e.pedido_id === id).sort((a, b) => a.ordem - b.ordem);

async function carregar() {
  const s = await sessao();
  if (!s) { mostrar('entrar'); return; }
  const { data: admin, error: e0 } = await sb.rpc('eh_admin');
  if (resultadoLeitura([e0]) === 'sessao') { mostrar('entrar'); return; }
  if (!e0 && !admin) { mostrar('sem-acesso'); return; }
  const [{ data: pedidos, error: e1 }, { data: clientes, error: e2 }, { data: etapas, error: e3 }] = await Promise.all([
    sb.from('pedidos').select('*').order('criado_em', { ascending: false }),
    sb.from('clientes').select('id, nome, email, whatsapp, cpf_cnpj'),
    sb.from('etapas').select('*'),
  ]);
  const leitura = resultadoLeitura([e0, e1, e2, e3]);
  if (leitura !== 'ok') { mostrar(leitura === 'sessao' ? 'entrar' : 'erro'); return; }
  dados = { pedidos, clientes: new Map(clientes.map(c => [c.id, c])), etapas };
  rotear();
}

function rotear() {
  const id = pedidoDoHash(location.hash);
  const pedido = id && dados.pedidos.find(p => p.id === id);
  if (pedido) { pintarFicha(pedido); mostrar('ficha'); $('[data-f-titulo]').focus({ preventScroll: true }); scrollTo(0, 0); }
  else { pintarLista(); mostrar('lista'); }
}
addEventListener('hashchange', () => { if (dados.pedidos.length || !pedidoDoHash(location.hash)) rotear(); });

function pintarLista() {
  const c = contagens(dados.pedidos);
  document.querySelectorAll('[data-conta]').forEach(e => { e.textContent = String(c[e.dataset.conta]); });
  document.querySelectorAll('[data-filtro]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filtro === filtro)));
  $('[data-lista-sub]').textContent = `${c.aguardando} aguardando pagamento · ${c.producao} em produção`;
  const lista = dados.pedidos.filter(p => noFiltro(p, filtro));
  $('[data-lista-vazio]').hidden = lista.length > 0;
  $('[data-lista]').replaceChildren(...lista.map(p => {
    const cli = dados.clientes.get(p.cliente_id);
    const li = el('li', 'pedido adm__linha');
    const a = el('a', 'adm__abrir');
    a.href = `#pedido=${p.id}`;
    const topo = el('div', 'pedido__topo');
    topo.append(el('strong', 'pedido__nome', `${cli?.nome ?? 'Cliente sem cadastro'} · ${nomePedido(p)}`), el('span', `pedido__status is-${p.status}`, STATUS[p.status] || p.status));
    const info = [tempoDesde(p.criado_em), `R$ ${brl(Number(p.valor))}${p.tipo === 'mensal' ? '/mês' : ''}`];
    if (p.tipo === 'site' && p.status !== 'aguardando' && p.status !== 'cancelado') info.push(resumoEtapas(etapasDe(p.id)));
    a.append(topo, el('p', 'pedido__info', info.join(' · ')));
    li.append(a);
    const w = p.status === 'aguardando' && whats(cli?.whatsapp);
    if (w) li.append(link('WhatsApp', w, 'pedido__acao'));
    return li;
  }));
}
document.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => { filtro = b.dataset.filtro; pintarLista(); }));

function pintarFicha(p) {
  const cli = dados.clientes.get(p.cliente_id);
  $('[data-f-titulo]').textContent = nomePedido(p);
  $('[data-f-sub]').textContent = `${data(p.criado_em)} (${tempoDesde(p.criado_em)}) · ${p.forma === 'cartao' ? `Cartão em ${p.parcelas}x` : p.forma === 'pix' ? 'Pix' : p.forma} · R$ ${brl(Number(p.valor))}${p.tipo === 'mensal' ? '/mês' : ''}${p.dominio ? ` · ${p.dominio}` : ''}`;
  $('[data-f-cliente]').textContent = cli?.nome ?? 'Cliente sem cadastro';
  $('[data-f-dados]').replaceChildren(...(cli ? [['E-mail', cli.email], ['WhatsApp', cli.whatsapp], ['CPF/CNPJ', mascararDoc(cli.cpf_cnpj)]] : []).flatMap(([k, v]) => {
    const d = el('div'); d.append(el('dt', '', k), el('dd', '', v || '—')); return [d];
  }));
  const contato = $('[data-f-contato]');
  contato.replaceChildren();
  const w = whats(cli?.whatsapp);
  if (w) contato.append(link('WhatsApp', w));
  if (cli?.email) contato.append(Object.assign(el('a', 'botao-acao botao-acao--neutro', 'E-mail'), { href: `mailto:${cli.email}` }));

  const opcoes = statusPermitidos(p), caixa = $('[data-f-status]'), est = $('[data-f-status-estado]');
  est.textContent = '';
  $('[data-f-status-ajuda]').textContent = opcoes.length ? '' : p.status === 'aguardando'
    ? 'Aguardando pagamento: o status muda sozinho quando o Mercado Pago confirmar.' : 'Pedido cancelado no Mercado Pago.';
  caixa.replaceChildren(...(opcoes.length ? opcoes : [p.status]).map(s => {
    const b = el('button', '', STATUS[s]);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(p.status === s));
    b.disabled = !opcoes.length;
    b.addEventListener('click', async () => {
      if (p.status === s) return;
      est.textContent = 'Salvando…';
      const { error } = await sb.from('pedidos').update({ status: s }).eq('id', p.id);
      if (error) { est.textContent = 'Não foi possível salvar.'; return; }
      p.status = s; pintarFicha(p); $('[data-f-status-estado]').textContent = 'Salvo.';
    });
    return b;
  }));

  const etapas = etapasDe(p.id);
  $('[data-f-etapas]').replaceChildren(...etapas.map(e => {
    const li = el('li', `adm__etapa${e.feita ? ' is-feita' : ''}`);
    const id = `et-${e.id}`;
    const cab = el('div', 'adm__etapa-cab');
    const caixaFeita = Object.assign(el('input'), { type: 'checkbox', id, checked: e.feita });
    const rotulo = el('label', '', e.nome); rotulo.htmlFor = id;
    const quando = el('small', '', e.feita ? `Feita em ${data(e.atualizado_em)}` : '');
    cab.append(caixaFeita, rotulo, quando);
    const nota = Object.assign(el('textarea', 'adm__nota'), { rows: 2, value: e.nota ?? '', placeholder: 'Nota para o cliente (opcional)' });
    nota.setAttribute('aria-label', `Nota da etapa ${e.nome}`);
    const salvar = el('button', 'botao-acao botao-acao--neutro', 'Salvar nota'); salvar.type = 'button';
    const est2 = el('span', 'formulario__estado'); est2.setAttribute('role', 'status');
    const grava = async campos => {
      est2.textContent = 'Salvando…';
      const atualizado_em = new Date().toISOString();
      const { error } = await sb.from('etapas').update({ ...campos, atualizado_em }).eq('id', e.id);
      if (error) { est2.textContent = 'Não foi possível salvar.'; return false; }
      Object.assign(e, campos, { atualizado_em });
      est2.textContent = 'Salvo.';
      return true;
    };
    caixaFeita.addEventListener('change', async () => {
      if (!(await grava({ feita: caixaFeita.checked }))) { caixaFeita.checked = !caixaFeita.checked; return; }
      li.classList.toggle('is-feita', e.feita);
      quando.textContent = e.feita ? `Feita em ${data(e.atualizado_em)}` : '';
    });
    salvar.addEventListener('click', () => grava({ nota: nota.value.trim() || null }));
    const pe = el('div', 'adm__etapa-pe'); pe.append(salvar, est2);
    li.append(cab, nota, pe);
    return li;
  }));
  if (!etapas.length) $('[data-f-etapas]').append(el('li', 'bloco__meta', p.tipo === 'mensal' ? 'Manutenção não tem etapas.' : 'Este pedido não tem etapas.'));
}

$('[data-atualizar]').addEventListener('click', carregar);
$('[data-tentar]').addEventListener('click', carregar);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('[data-vista="lista"]').hidden) carregar(); });
document.querySelectorAll('[data-sair]').forEach(b => b.addEventListener('click', async () => { await sb.auth.signOut(); location.href = './admin.html'; }));
montarEntrada(document, carregar);

if (!ligado) mostrar('erro');
else carregar();
