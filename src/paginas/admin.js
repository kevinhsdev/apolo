// Admin: visão geral (receita, meta, alertas), tabelas de pedidos e clientes, ficha do pedido.
// Só admins veem dados: o banco (eh_admin + RLS) garante; esta página só desenha.
import '@fontsource-variable/figtree';
import '@fontsource-variable/sora';
import '../styles/tokens.css';
import '../styles/base.css';
import './pagar.css';
import './conta.css';
import './admin.css';
import '../estilo.js';
import '../acessibilidade.js';
import { brl, CATALOGO, TAXAS, liquidoCartao } from '../precos.js';
import { ligado, sb, sessao } from '../supabase.js';
import { montarEntrada } from '../entrar.js';
import { visivel, nomePedido, mascararDoc, resultadoLeitura } from './conta-dados.js';
import {
  META_MENSAL, noFiltro, contagens, tempoDesde, pedidoDoHash, resumoEtapas, statusPermitidos, faltaRestante,
  recebimentos, porMes, indicadores, funil, porPlano, alertas, resumoClientes, combina, ordenar, csv,
} from './admin-dados.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (tag, cls, txt) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, txt != null ? { textContent: txt } : {});
const STATUS = { aguardando: 'Aguardando pagamento', pago: 'Pago', em_andamento: 'Em produção', entregue: 'Entregue', cancelado: 'Cancelado' };
const NOMES = Object.fromEntries(Object.entries(CATALOGO).map(([k, v]) => [k, v.nome]));
const reais = n => `R$ ${brl(Math.round(Number(n)))}`;
const centavos = n => `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = n => `${Math.round(n * 100)}%`;
const data = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const dataCurta = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
const formaTxt = p => (p.forma === 'cartao' ? (p.tipo === 'mensal' ? 'Cartão mensal' : `Cartão ${p.parcelas}x`) : p.forma === 'pix' ? 'Pix 50% + 50%' : p.forma);
const whats = (numero, texto) => {
  const d = String(numero || '').replace(/\D/g, '');
  if (!d) return null;
  return `https://wa.me/${d.startsWith('55') && d.length > 11 ? d : `55${d}`}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
};
const link = (txt, href, cls = 'botao-acao botao-acao--neutro') => Object.assign(el('a', cls, txt), { href, target: '_blank', rel: 'noopener' });
const botao = (txt, cls, fn) => { const b = el('button', cls, txt); b.type = 'button'; b.addEventListener('click', fn); return b; };

let dados = { pedidos: [], clientes: new Map(), etapas: [] }, carregadoEm = null;
const etapasDe = id => dados.etapas.filter(e => e.pedido_id === id).sort((a, b) => a.ordem - b.ordem);
const estado = { filtro: 'todos', tipo: '', busca: '', ordem: ['criado_em', 'desc'], sel: new Set(), cBusca: '', cOrdem: ['gasto', 'desc'] };

/* ---------- telas ---------- */
function mostrar(v) {
  const painel = v === 'painel';
  $('[data-vista="painel"]').hidden = !painel;
  $('[data-topo]').hidden = painel;
  $('[data-simples]').hidden = painel;
  document.body.classList.toggle('is-painel', painel);
  $$('[data-simples] [data-vista]').forEach(e => { e.hidden = e.dataset.vista !== v; });
}

async function carregar() {
  const s = await sessao();
  if (!s) { mostrar('entrar'); return; }
  const { data: admin, error: e0 } = await sb.rpc('eh_admin');
  if (resultadoLeitura([e0]) === 'sessao') { mostrar('entrar'); return; }
  if (!e0 && !admin) { mostrar('sem-acesso'); return; }
  const [{ data: pedidos, error: e1 }, { data: clientes, error: e2 }, { data: etapas, error: e3 }] = await Promise.all([
    sb.from('pedidos').select('*').order('criado_em', { ascending: false }),
    sb.from('clientes').select('id, nome, email, whatsapp, cpf_cnpj, criado_em'),
    sb.from('etapas').select('*'),
  ]);
  const leitura = resultadoLeitura([e0, e1, e2, e3]);
  if (leitura !== 'ok') { mostrar(leitura === 'sessao' ? 'entrar' : 'erro'); return; }
  dados = { pedidos, clientes: new Map(clientes.map(c => [c.id, c])), etapas };
  carregadoEm = new Date();
  $('[data-email]').textContent = s.user?.email ?? '';
  estado.sel = new Set([...estado.sel].filter(id => pedidos.some(p => p.id === id)));
  mostrar('painel');
  rotear();
}

function rotear() {
  const id = pedidoDoHash(location.hash);
  const pedido = id && dados.pedidos.find(p => p.id === id);
  const secao = pedido ? 'ficha' : ['visao', 'pedidos', 'clientes'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'visao';
  pintarBadge();
  if (secao === 'visao') pintarVisao();
  if (secao === 'pedidos') pintarPedidos();
  if (secao === 'clientes') pintarClientes();
  if (secao === 'ficha') pintarFicha(pedido);
  $$('[data-secao]').forEach(s => { s.hidden = s.dataset.secao !== secao; });
  const ativo = secao === 'ficha' ? 'pedidos' : secao;
  $$('[data-ir]').forEach(a => (a.dataset.ir === ativo ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  esconderDica();
}
let ultimaSecao = '';
addEventListener('hashchange', () => {
  if (!dados.pedidos.length && !carregadoEm) return;
  rotear();
  const atual = location.hash;
  if (atual !== ultimaSecao) { scrollTo(0, 0); $('[data-secao]:not([hidden])')?.focus({ preventScroll: true }); }
  ultimaSecao = atual;
});

function pintarBadge() {
  const n = dados.pedidos.filter(p => p.status === 'aguardando').length;
  const b = $('[data-badge]');
  b.hidden = !n; b.textContent = String(n);
  b.setAttribute('aria-label', `${n} aguardando pagamento`);
}

/* ---------- visão geral ---------- */
function pintarVisao() {
  const agora = new Date();
  const k = indicadores(dados.pedidos, agora);
  const mes = agora.toLocaleDateString('pt-BR', { month: 'long' });
  $('[data-v-sub]').textContent = `${dados.pedidos.length} pedidos e ${dados.clientes.size} clientes · atualizado ${tempoDesde(carregadoEm, agora)}`;
  $('[data-v-mes]').textContent = `Recebido em ${mes}`;
  $('[data-v-recebido]').textContent = reais(k.recebidoMes);
  const v = $('[data-v-variacao]');
  v.className = 'adm__variacao';
  if (k.variacao == null) v.textContent = k.recebidoMes ? 'Primeiro mês com receita' : 'Nenhum pagamento confirmado ainda este mês';
  else {
    v.classList.add(k.variacao >= 0 ? 'is-sobe' : 'is-desce');
    v.textContent = `${k.variacao >= 0 ? '↑' : '↓'} ${pct(Math.abs(k.variacao))} em relação ao mês passado`;
  }
  $('[data-v-meta-fill]').style.width = `${k.meta * 100}%`;
  $('[data-v-meta-barra]').setAttribute('aria-valuenow', String(Math.round(k.meta * 100)));
  const ticket = k.ticket || CATALOGO.orbita.pix;
  $('[data-v-meta-texto]').textContent = k.faltaMeta
    ? `${pct(k.meta)} da meta de ${reais(META_MENSAL)} · faltam ${reais(k.faltaMeta)}, cerca de ${Math.ceil(k.faltaMeta / ticket)} ${Math.ceil(k.faltaMeta / ticket) === 1 ? 'site' : 'sites'} no ticket médio`
    : `Meta de ${reais(META_MENSAL)} batida. ${reais(k.recebidoMes - META_MENSAL)} acima.`;

  const kpis = [
    ['Líquido no mês', reais(k.liquidoMes), 'depois das taxas do Mercado Pago'],
    ['A receber', reais(k.aReceber), 'restante dos Pix de 50%'],
    ['Recorrente (MRR)', reais(k.mrr), 'manutenções ativas por mês'],
    ['Ticket médio', reais(k.ticket), 'por site vendido'],
    ['Conversão', k.conversao == null ? '—' : pct(k.conversao), 'pedidos pagos, últimos 30 dias'],
    ['Total recebido', reais(k.total), 'desde o início'],
  ];
  $('[data-v-kpis]').replaceChildren(...kpis.map(([t, n, d]) => {
    const div = el('div', 'adm__kpi');
    div.append(el('dt', '', t), el('dd', 'adm__kpi-n', n), el('dd', 'adm__kpi-d', d));
    return div;
  }));

  pintarBarras(porMes(recebimentos(dados.pedidos), 6, agora));
  pintarAlertas(alertas(dados.pedidos, dados.etapas, dados.clientes, agora, NOMES));
  const f = funil(dados.pedidos);
  pintarHBarras($('[data-v-funil]'), f.map((x, i) => ({ nome: x.nome, valor: x.n, texto: i ? `${x.n} · ${f[0].n ? pct(x.n / f[0].n) : '0%'}` : String(x.n) })), f[0].n);
  const pl = porPlano(dados.pedidos, NOMES);
  pintarHBarras($('[data-v-planos]'), pl.map(x => ({ nome: x.nome, valor: x.valor, texto: `${reais(x.valor)} · ${x.n} ${x.n === 1 ? 'venda' : 'vendas'}` })), pl[0]?.valor ?? 0, 'Nenhuma venda confirmada ainda.');
}

function pintarBarras(meses) {
  const max = Math.max(...meses.map(m => m.valor), 1);
  const topo = Math.max(500, Math.ceil(max / 500) * 500); // linhas de referência em múltiplos de R$ 500
  const caixa = $('[data-v-barras]');
  const grade = el('div', 'adm__grade-linhas');
  grade.setAttribute('aria-hidden', 'true');
  [1, 0.5, 0].forEach(f => { const l = el('span', '', reais(topo * f)); l.style.bottom = `${f * 100}%`; grade.append(l); });
  const colunas = el('div', 'adm__colunas');
  meses.forEach((m, i) => {
    const b = el('button', `adm__coluna${i === meses.length - 1 ? ' is-atual' : ''}`);
    b.type = 'button';
    b.setAttribute('aria-label', `${m.rotulo}: ${reais(m.valor)} bruto, ${reais(m.liquido)} líquido`);
    const barra = el('span', 'adm__coluna-barra');
    barra.style.height = `${(m.valor / topo) * 100}%`;
    if (!m.valor) barra.classList.add('is-zero');
    b.append(barra, el('span', 'adm__coluna-rotulo', m.rotulo));
    const dica = () => mostrarDica(b, `<b>${m.rotulo}</b>${reais(m.valor)} bruto<br>${reais(m.liquido)} líquido`);
    b.addEventListener('pointerenter', dica); b.addEventListener('focus', dica);
    b.addEventListener('pointerleave', esconderDica); b.addEventListener('blur', esconderDica);
    colunas.append(b);
  });
  caixa.replaceChildren(grade, colunas);
  $('[data-v-tabela-mes]').replaceChildren(...meses.map(m => {
    const tr = el('tr');
    tr.append(el('th', '', m.rotulo), el('td', '', reais(m.valor)), el('td', '', reais(m.liquido)));
    tr.firstChild.scope = 'row';
    return tr;
  }));
}

function pintarHBarras(lista, itens, max, vazio = 'Sem dados ainda.') {
  if (!itens.length || !max) { lista.replaceChildren(el('li', 'bloco__meta', vazio)); return; }
  lista.replaceChildren(...itens.map(x => {
    const li = el('li', 'adm__hbarra');
    const cab = el('div', 'adm__hbarra-cab');
    cab.append(el('span', '', x.nome), el('strong', '', x.texto));
    const trilho = el('div', 'adm__hbarra-trilho');
    const fill = el('span');
    fill.style.width = `${Math.max((x.valor / max) * 100, x.valor ? 2 : 0)}%`;
    trilho.append(fill);
    li.append(cab, trilho);
    return li;
  }));
}

const ICONE = { cobrar: '◷', restante: '＄', parado: '!', manutencao: '↻' };
function pintarAlertas(lista) {
  $('[data-v-alertas-n]').textContent = lista.length ? `${lista.length} ${lista.length === 1 ? 'item' : 'itens'}` : '';
  const ul = $('[data-v-alertas]');
  if (!lista.length) { ul.replaceChildren(el('li', 'adm__alerta-vazio', 'Tudo em dia. Bom momento para prospectar novos clientes.')); return; }
  ul.replaceChildren(...lista.slice(0, 8).map(a => {
    const p = dados.pedidos.find(x => x.id === a.pedido), cli = dados.clientes.get(a.cliente);
    const li = el('li', `adm__alerta is-${a.tipo}`);
    const ic = el('span', 'adm__alerta-icone', ICONE[a.tipo]); ic.setAttribute('aria-hidden', 'true');
    const txt = el('a', 'adm__alerta-texto', a.texto); txt.href = `#pedido=${a.pedido}`;
    li.append(ic, txt);
    const primeiro = (cli?.nome || '').split(' ')[0];
    const msg = {
      cobrar: p?.link_fatura ? `Oi, ${primeiro}! Aqui é da Apolo Studio. Seu pedido do site ${NOMES[p.plano] ?? ''} está reservado. Para começarmos, é só concluir o pagamento por este link: ${p.link_fatura}` : null,
      restante: `Oi, ${primeiro}! Seu site está pronto para ir ao ar. Falta só o restante de ${p ? centavos(Number(p.valor) / 2) : ''} no Pix para publicarmos.`,
      manutencao: `Oi, ${primeiro}! Como está o site? Temos planos de manutenção para manter tudo atualizado, seguro e com ajustes mensais. Posso te mostrar?`,
    }[a.tipo];
    const w = msg && whats(cli?.whatsapp, msg);
    if (w) li.append(link('WhatsApp', w, 'adm__alerta-acao'));
    return li;
  }));
}

/* ---------- dica (tooltip) dos gráficos ---------- */
function mostrarDica(alvo, html) {
  const d = $('[data-dica]');
  d.innerHTML = html; // só números e rótulos de mês gerados aqui
  d.hidden = false;
  const r = alvo.getBoundingClientRect(), w = d.offsetWidth;
  d.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)}px`;
  d.style.top = `${r.top + scrollY - d.offsetHeight - 10}px`;
}
function esconderDica() { $('[data-dica]').hidden = true; }

/* ---------- pedidos ---------- */
const linhaPedido = p => {
  const cli = dados.clientes.get(p.cliente_id);
  return { ...p, cli, cliente: cli?.nome ?? 'Cliente sem cadastro', plano_nome: NOMES[p.plano] ?? p.plano, forma_txt: formaTxt(p), valor_n: Number(p.valor) };
};

function pedidosVisiveis() {
  const [chave, dir] = estado.ordem;
  return ordenar(dados.pedidos.filter(visivel).map(linhaPedido)
    .filter(p => noFiltro(p, estado.filtro) && (!estado.tipo || p.tipo === estado.tipo))
    .filter(p => combina(estado.busca, p.cliente, p.cli?.email, p.cli?.whatsapp, p.plano_nome, p.dominio, p.id)), chave, dir);
}

function pintarPedidos() {
  const c = contagens(dados.pedidos.filter(visivel));
  $$('[data-conta]').forEach(e => { e.textContent = String(c[e.dataset.conta]); });
  $$('[data-filtro]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filtro === estado.filtro)));
  $('[data-p-sub]').textContent = `${c.aguardando} aguardando pagamento · ${c.producao} em produção · ${c.entregue} entregues`;
  const lista = pedidosVisiveis();
  $('[data-p-vazio]').hidden = lista.length > 0;
  $('[data-p-linhas]').replaceChildren(...lista.map(p => {
    const tr = el('tr', estado.sel.has(p.id) ? 'is-sel' : '');
    const marca = el('td', 'adm__col-marca');
    const cx = Object.assign(el('input'), { type: 'checkbox', checked: estado.sel.has(p.id) });
    cx.setAttribute('aria-label', `Selecionar pedido de ${p.cliente}`);
    cx.addEventListener('change', () => { cx.checked ? estado.sel.add(p.id) : estado.sel.delete(p.id); tr.classList.toggle('is-sel', cx.checked); pintarLote(lista); });
    marca.append(cx);
    const nome = el('td', 'adm__col-cliente');
    const a = el('a', '', p.cliente); a.href = `#pedido=${p.id}`;
    nome.append(a, el('small', '', p.cli?.email ?? ''));
    const selo = el('td'); selo.append(el('span', `pedido__status is-${p.status}`, STATUS[p.status] ?? p.status));
    const andamento = p.tipo === 'site' && ['pago', 'em_andamento', 'entregue'].includes(p.status) ? resumoEtapas(etapasDe(p.id)) : p.tipo === 'mensal' ? 'Mensal' : '—';
    tr.append(marca, nome, el('td', '', `${p.plano_nome}${p.dominio ? ` · ${p.dominio}` : ''}`), el('td', '', p.forma_txt),
      el('td', 'adm__num', `${centavos(p.valor_n)}${p.tipo === 'mensal' ? '/mês' : ''}`), selo, el('td', 'adm__col-andamento', andamento));
    const quando = el('td', 'adm__col-data', dataCurta(p.criado_em)); quando.title = tempoDesde(p.criado_em);
    tr.append(quando);
    tr.addEventListener('click', e => { if (!e.target.closest('a, input, button')) location.hash = `pedido=${p.id}`; });
    return tr;
  }));
  const todos = $('[data-p-todos]');
  todos.checked = lista.length > 0 && lista.every(p => estado.sel.has(p.id));
  todos.indeterminate = !todos.checked && lista.some(p => estado.sel.has(p.id));
  pintarOrdem('pedidos', estado.ordem);
  pintarLote(lista);
}

function pintarLote() {
  const sel = dados.pedidos.filter(p => estado.sel.has(p.id));
  const cancelaveis = sel.filter(p => p.status === 'aguardando'), excluiveis = sel.filter(p => p.status === 'cancelado');
  $('[data-lote]').hidden = !sel.length;
  $('[data-lote-texto]').textContent = `${sel.length} ${sel.length === 1 ? 'selecionado' : 'selecionados'}`;
  const bc = $('[data-lote-cancelar]'), be = $('[data-lote-excluir]');
  bc.hidden = !cancelaveis.length; bc.textContent = `Cancelar ${cancelaveis.length} aguardando`;
  be.hidden = !excluiveis.length; be.textContent = `Excluir ${excluiveis.length} ${excluiveis.length === 1 ? 'cancelado' : 'cancelados'}`;
}

function pintarOrdem(secao, [chave, dir]) {
  $$(`[data-secao="${secao}"] th[data-ordem]`).forEach(th => {
    if (!th.querySelector('button')) {
      const b = botao(th.textContent, 'adm__ordenar', () => {
        const st = secao === 'pedidos' ? 'ordem' : 'cOrdem';
        const [c, d] = estado[st];
        estado[st] = [th.dataset.ordem, c === th.dataset.ordem && d === 'desc' ? 'asc' : 'desc'];
        secao === 'pedidos' ? pintarPedidos() : pintarClientes();
      });
      th.replaceChildren(b);
    }
    if (th.dataset.ordem === chave) th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
  });
}

$$('[data-filtro]').forEach(b => b.addEventListener('click', () => { estado.filtro = b.dataset.filtro; pintarPedidos(); }));
$('[data-p-busca]').addEventListener('input', e => { estado.busca = e.target.value; pintarPedidos(); });
$('[data-p-tipo]').addEventListener('change', e => { estado.tipo = e.target.value; pintarPedidos(); });
$('[data-p-todos]').addEventListener('change', e => {
  pedidosVisiveis().forEach(p => (e.target.checked ? estado.sel.add(p.id) : estado.sel.delete(p.id)));
  pintarPedidos();
});
$('[data-lote-limpar]').addEventListener('click', () => { estado.sel.clear(); pintarPedidos(); });
$('[data-lote-cancelar]').addEventListener('click', async () => {
  const ids = dados.pedidos.filter(p => estado.sel.has(p.id) && p.status === 'aguardando').map(p => p.id);
  if (!(await confirmar(`Cancelar ${ids.length} ${ids.length === 1 ? 'pedido' : 'pedidos'}?`, 'Eles saem da lista de aguardando e não entram nas contas. Se alguém pagar pelo link depois, o pedido volta sozinho como pago.', ids.length === 1 ? 'Cancelar pedido' : 'Cancelar pedidos'))) return;
  await mudarStatus(ids, 'cancelado');
});
$('[data-lote-excluir]').addEventListener('click', async () => {
  const ids = dados.pedidos.filter(p => estado.sel.has(p.id) && p.status === 'cancelado').map(p => p.id);
  if (!(await confirmar(`Excluir ${ids.length} ${ids.length === 1 ? 'pedido' : 'pedidos'} para sempre?`, 'Some do banco junto com as etapas. Não dá para desfazer. Use para limpar pedidos de teste.', 'Excluir para sempre'))) return;
  await excluir(ids);
});

async function mudarStatus(ids, status) {
  const { error } = await sb.from('pedidos').update({ status }).in('id', ids);
  if (error) { aviso('Não foi possível salvar. Tente de novo.'); return false; }
  dados.pedidos.forEach(p => { if (ids.includes(p.id)) p.status = status; });
  estado.sel.clear();
  rotear();
  return true;
}
async function excluir(ids) {
  const { error } = await sb.from('pedidos').delete().in('id', ids).eq('status', 'cancelado');
  if (error) { aviso('Não foi possível excluir. Tente de novo.'); return false; }
  dados.pedidos = dados.pedidos.filter(p => !ids.includes(p.id));
  dados.etapas = dados.etapas.filter(e => !ids.includes(e.pedido_id));
  estado.sel.clear();
  if (pedidoDoHash(location.hash)) location.hash = 'pedidos'; else rotear();
  return true;
}

/* ---------- clientes ---------- */
function pintarClientes() {
  const todos = resumoClientes(dados.clientes, dados.pedidos);
  const pagantes = todos.filter(c => c.gasto > 0).length;
  $('[data-c-sub]').textContent = `${todos.length} cadastrados · ${pagantes} já compraram · ${todos.filter(c => c.manutencao).length} com manutenção`;
  const [chave, dir] = estado.cOrdem;
  const lista = ordenar(todos.filter(c => combina(estado.cBusca, c.nome, c.email, c.whatsapp)), chave, dir);
  $('[data-c-vazio]').hidden = lista.length > 0;
  $('[data-c-linhas]').replaceChildren(...lista.map(c => {
    const tr = el('tr');
    const nome = el('td', 'adm__col-cliente');
    const a = el('a', '', c.nome); a.href = '#pedidos';
    a.addEventListener('click', () => { estado.busca = c.email; estado.filtro = 'todos'; $('[data-p-busca]').value = c.email; });
    nome.append(a, el('small', '', `desde ${data(c.criado_em)}`));
    const contato = el('td', 'adm__col-contato');
    contato.append(Object.assign(el('a', '', c.email), { href: `mailto:${c.email}` }));
    const w = whats(c.whatsapp);
    if (w) contato.append(link(c.whatsapp, w, ''));
    const man = el('td'); man.append(el('span', `pedido__status ${c.manutencao ? 'is-pago' : ''}`, c.manutencao ? 'Ativa' : 'Não'));
    tr.append(nome, contato, el('td', 'adm__num', String(c.pedidos)), el('td', 'adm__num', reais(c.gasto)), man, el('td', 'adm__col-data', c.ultimo ? dataCurta(c.ultimo) : '—'));
    return tr;
  }));
  pintarOrdem('clientes', estado.cOrdem);
}
$('[data-c-busca]').addEventListener('input', e => { estado.cBusca = e.target.value; pintarClientes(); });

/* ---------- exportar ---------- */
function baixar(nome, texto) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' })), download: nome });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const hoje = () => new Date().toISOString().slice(0, 10);
$$('[data-exportar]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.exportar === 'pedidos') {
    baixar(`apolo-pedidos-${hoje()}.csv`, csv(pedidosVisiveis(), [
      { titulo: 'Pedido', valor: p => p.id }, { titulo: 'Criado em', valor: p => dataCurta(p.criado_em) },
      { titulo: 'Cliente', valor: p => p.cliente }, { titulo: 'E-mail', valor: p => p.cli?.email }, { titulo: 'WhatsApp', valor: p => p.cli?.whatsapp },
      { titulo: 'Plano', valor: p => p.plano_nome }, { titulo: 'Tipo', valor: p => (p.tipo === 'mensal' ? 'Manutenção' : 'Site') },
      { titulo: 'Pagamento', valor: p => p.forma_txt }, { titulo: 'Valor', valor: p => p.valor_n.toFixed(2).replace('.', ',') },
      { titulo: 'Status', valor: p => STATUS[p.status] }, { titulo: 'Pago em', valor: p => (p.pago_em ? dataCurta(p.pago_em) : '') },
      { titulo: 'Restante Pix em', valor: p => (p.restante_em ? dataCurta(p.restante_em) : '') },
      { titulo: 'Domínio', valor: p => p.dominio }, { titulo: 'Cupom', valor: p => p.cupom },
    ]));
  } else {
    const todos = resumoClientes(dados.clientes, dados.pedidos).filter(c => combina(estado.cBusca, c.nome, c.email, c.whatsapp));
    baixar(`apolo-clientes-${hoje()}.csv`, csv(ordenar(todos, ...estado.cOrdem), [
      { titulo: 'Nome', valor: c => c.nome }, { titulo: 'E-mail', valor: c => c.email }, { titulo: 'WhatsApp', valor: c => c.whatsapp },
      { titulo: 'Pedidos', valor: c => c.pedidos }, { titulo: 'Total pago', valor: c => c.gasto.toFixed(2).replace('.', ',') },
      { titulo: 'Manutenção', valor: c => (c.manutencao ? 'Sim' : 'Não') }, { titulo: 'Cliente desde', valor: c => (c.criado_em ? dataCurta(c.criado_em) : '') },
    ]));
  }
}));

/* ---------- ficha ---------- */
const dl = (lista, pares) => lista.replaceChildren(...pares.map(([k, v]) => { const d = el('div'); d.append(el('dt', '', k), el('dd', '', v || '—')); return d; }));

function pintarFicha(p) {
  const cli = dados.clientes.get(p.cliente_id);
  $('[data-f-titulo]').textContent = `${cli?.nome ?? 'Cliente sem cadastro'} · ${nomePedido(p)}`;
  $('[data-f-sub]').textContent = `Criado em ${data(p.criado_em)} (${tempoDesde(p.criado_em)})${p.dominio ? ` · ${p.dominio}` : ''}`;
  const selo = $('[data-f-selo]');
  selo.className = `pedido__status is-${p.status}`; selo.textContent = STATUS[p.status] ?? p.status;

  $('[data-f-cliente]').textContent = cli?.nome ?? 'Cliente sem cadastro';
  dl($('[data-f-dados]'), cli ? [['E-mail', cli.email], ['WhatsApp', cli.whatsapp], ['CPF/CNPJ', mascararDoc(cli.cpf_cnpj)]] : []);
  const contato = $('[data-f-contato]');
  contato.replaceChildren();
  const w = whats(cli?.whatsapp);
  if (w) contato.append(link('WhatsApp', w));
  if (cli?.email) contato.append(Object.assign(el('a', 'botao-acao botao-acao--neutro', 'E-mail'), { href: `mailto:${cli.email}` }));

  // financeiro
  const v = Number(p.valor);
  const liquido = p.tipo === 'site' && p.forma === 'pix' ? v * (1 - TAXAS.pix / 2) : p.tipo === 'site' ? liquidoCartao(v, p.parcelas || 1) : v * (1 - (p.forma === 'pix' ? TAXAS.pix : TAXAS.avista));
  const pares = [['Valor', `${centavos(v)}${p.tipo === 'mensal' ? '/mês' : ''}`], ['Pagamento', formaTxt(p)], ['Líquido est.', centavos(liquido)]];
  if (p.tipo === 'site' && p.forma === 'pix') pares.push(['Entrada', `${centavos(v / 2)}${p.pago_em ? ` · paga em ${dataCurta(p.pago_em)}` : ''}`], ['Restante', `${centavos(v / 2)}${p.restante_em ? ` · recebido em ${dataCurta(p.restante_em)}` : ' · a receber'}`]);
  else if (p.pago_em) pares.push(['Pago em', data(p.pago_em)]);
  if (p.vence_em) pares.push(['Vale até', dataCurta(`${p.vence_em}T12:00:00Z`)]);
  if (p.renova_de) pares.push(['Mensalidade', 'renovação do mês anterior']);
  if (p.cupom) pares.push(['Cupom', p.cupom]);
  pares.push(['Mercado Pago', p.cobranca ?? '—']);
  dl($('[data-f-financeiro]'), pares);
  const dinheiro = $('[data-f-dinheiro]'), estD = $('[data-f-dinheiro-estado]');
  dinheiro.replaceChildren(); estD.textContent = '';
  const marcarRestante = async valor => {
    estD.textContent = 'Salvando…';
    const { error } = await sb.from('pedidos').update({ restante_em: valor }).eq('id', p.id);
    if (error) { estD.textContent = 'Não foi possível salvar.'; return; }
    p.restante_em = valor; pintarFicha(p); $('[data-f-dinheiro-estado]').textContent = 'Salvo.';
  };
  if (faltaRestante(p)) dinheiro.append(botao(`Marcar restante recebido (${centavos(v / 2)})`, 'botao-acao', () => marcarRestante(new Date().toISOString())));
  else if (p.restante_em) dinheiro.append(botao('Desfazer restante', 'botao-acao botao-acao--neutro', () => marcarRestante(null)));
  if (p.status === 'aguardando' && p.link_fatura) {
    dinheiro.append(botao('Copiar link de pagamento', 'botao-acao botao-acao--neutro', async () => {
      try { await navigator.clipboard.writeText(p.link_fatura); estD.textContent = 'Link copiado.'; } catch { estD.textContent = p.link_fatura; }
    }));
  }

  // status
  const opcoes = statusPermitidos(p), caixa = $('[data-f-status]'), est = $('[data-f-status-estado]');
  est.textContent = '';
  $('[data-f-status-ajuda]').textContent = opcoes.length ? '' : p.status === 'aguardando'
    ? 'Muda sozinho para "Pago" quando o Mercado Pago confirmar.' : 'Pedido cancelado. Se o cliente pagar pelo link, ele volta sozinho como pago.';
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
      p.status = s; pintarFicha(p); pintarBadge(); $('[data-f-status-estado]').textContent = 'Salvo.';
    });
    return b;
  }));
  const perigo = $('[data-f-perigo]');
  perigo.replaceChildren();
  if (p.status === 'aguardando') perigo.append(botao('Cancelar pedido', 'botao-acao botao-acao--perigo', async () => {
    if (await confirmar('Cancelar este pedido?', 'Ele sai da lista de aguardando e não entra nas contas. Se o cliente pagar pelo link depois, volta sozinho como pago.', 'Cancelar pedido')) mudarStatus([p.id], 'cancelado');
  }));
  if (p.status === 'cancelado') perigo.append(botao('Excluir pedido', 'botao-acao botao-acao--perigo', async () => {
    if (await confirmar('Excluir este pedido para sempre?', 'Some do banco junto com as etapas. Não dá para desfazer.', 'Excluir para sempre')) excluir([p.id]);
  }));

  // etapas
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
  if (!etapas.length) $('[data-f-etapas]').append(el('li', 'adm__etapa bloco__meta', p.tipo === 'mensal' ? 'Manutenção não tem etapas.' : 'Este pedido não tem etapas.'));
}

/* ---------- confirmação e aviso ---------- */
function confirmar(titulo, texto, sim) {
  const d = $('[data-dialogo]');
  $('[data-d-titulo]').textContent = titulo;
  $('[data-d-texto]').textContent = texto;
  $('[data-d-sim]').textContent = sim;
  d.returnValue = '';
  d.showModal();
  return new Promise(ok => d.addEventListener('close', () => ok(d.returnValue === 'sim'), { once: true }));
}
function aviso(texto) {
  const alvo = $('[data-secao]:not([hidden]) .formulario__estado') ?? $('[data-lote-texto]');
  if (alvo) alvo.textContent = texto;
}

/* ---------- início ---------- */
$$('[data-atualizar]').forEach(b => b.addEventListener('click', carregar));
$('[data-tentar]').addEventListener('click', carregar);
document.addEventListener('visibilitychange', () => { if (!document.hidden && carregadoEm && !pedidoDoHash(location.hash) && new Date() - carregadoEm > 60000) carregar(); });
$$('[data-sair]').forEach(b => b.addEventListener('click', async () => { await sb.auth.signOut(); location.href = './admin.html'; }));
montarEntrada(document, carregar);

if (!ligado) mostrar('erro');
else carregar();
