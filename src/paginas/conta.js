// Área do cliente: entrar por código no e-mail, pedidos, andamento do projeto e dados.
// Tudo é lido com a chave pública; o RLS do banco (supabase/schema.sql) só entrega o que é do cliente logado.
import '@fontsource-variable/figtree';
import '@fontsource-variable/sora';
import '../styles/tokens.css';
import '../styles/base.css';
import './pagar.css';
import './conta.css';
import '../estilo.js';
import { montarPainelPreferencias } from '../acessibilidade.js';
import { CATALOGO, brl } from '../precos.js';
import { ligado, sb, sessao, enviarCodigo, conferirCodigo, salvarCliente } from '../supabase.js';
import { linkConversa } from '../contato.js';
import { secaoDoHash, projetosAtivos, manutencao, progresso, proximoPasso, mascararDoc, montarExportacao, nomePedido, linkProximaEtapa } from './conta-dados.js';

const $ = s => document.querySelector(s);
const mostrar = v => {
  document.querySelectorAll('[data-vista]').forEach(e => { e.hidden = e.dataset.vista !== v; });
  document.body.classList.toggle('is-entrar', v === 'entrar');
  document.body.classList.toggle('is-painel', v === 'painel');
};
const STATUS = { aguardando: 'Aguardando pagamento', pago: 'Pago', em_andamento: 'Em produção', entregue: 'Entregue', cancelado: 'Cancelado' };
const FORMA = { pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto' };
const data = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const el = (tag, cls, txt) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, txt != null ? { textContent: txt } : {});

// entrar: e-mail → código de 6 dígitos (entra sozinho ao completar)
const fEntrar = $('[data-entrar]'), eEstado = $('[data-entrar-estado]'), eCodigo = $('[data-entrar-codigo]');
const eBotao = $('[data-entrar-botao]'), eEmail = $('#e-email'), eCod = $('#e-codigo'), eReenviar = $('[data-reenviar]');
let espera;
function contar() {
  let s = 60;
  clearInterval(espera);
  eReenviar.disabled = true;
  eReenviar.textContent = `Reenviar em ${s}s`;
  espera = setInterval(() => {
    if (--s > 0) { eReenviar.textContent = `Reenviar em ${s}s`; return; }
    clearInterval(espera); eReenviar.disabled = false; eReenviar.textContent = 'Reenviar';
  }, 1000);
}
async function pedirCodigo() {
  const email = eEmail.value.trim();
  const { error } = await enviarCodigo(email);
  if (error) throw new Error('Não conseguimos enviar o código. Tente de novo em instantes.');
  $('[data-entrar-para]').textContent = `Enviado para ${email}`;
  eEmail.readOnly = true;
  eCodigo.hidden = false;
  eBotao.textContent = 'Entrar';
  eEstado.textContent = '';
  contar();
  eCod.focus();
}
async function entrar() {
  if (eCodigo.hidden) {
    if (!eEmail.value.trim() || !eEmail.checkValidity()) throw new Error('Confira o e-mail.');
    return pedirCodigo();
  }
  if (!/^\d{6}$/.test(eCod.value)) throw new Error('Digite os 6 números do código.');
  const { error } = await conferirCodigo(eEmail.value.trim(), eCod.value);
  if (error) { eCod.select(); throw new Error('Código inválido ou vencido.'); }
  await abrirPainel();
}
async function enviar() {
  eBotao.disabled = true;
  try { await entrar(); } catch (err) { eEstado.textContent = err.message; }
  finally { eBotao.disabled = false; }
}
fEntrar.addEventListener('submit', e => { e.preventDefault(); enviar(); });
eCod.addEventListener('input', () => {
  eCod.value = eCod.value.replace(/\D/g, '').slice(0, 6);
  if (eCod.value.length === 6) enviar();
});
$('[data-trocar]').addEventListener('click', () => {
  clearInterval(espera);
  eCodigo.hidden = true; eCod.value = ''; eEmail.readOnly = false; eBotao.textContent = 'Receber código'; eEstado.textContent = '';
  eEmail.focus();
});
eReenviar.addEventListener('click', async () => {
  try { await pedirCodigo(); eEstado.textContent = 'Mandamos um código novo.'; } catch (err) { eEstado.textContent = err.message; }
});

// painel: uma seção por vez, escolhida pelo #hash (conta.html#pedidos)
const ROTULOS = { inicio: 'Visão geral', pedidos: 'Pedidos e pagamentos', projeto: 'Meu projeto', manutencao: 'Manutenção', dados: 'Meus dados', privacidade: 'Privacidade e segurança', preferencias: 'Preferências', ajuda: 'Ajuda' };
const links = [...document.querySelectorAll('[data-ir]')];
const folha = $('#painel-mais'), mais = $('[data-mais]');
const abrirFolha = sim => { folha.hidden = !sim; mais.setAttribute('aria-expanded', String(sim)); };
function irPara(secao, focar) {
  document.querySelectorAll('[data-secao]').forEach(s => { s.hidden = s.dataset.secao !== secao; });
  links.forEach(a => { if (a.dataset.ir === secao) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = `${ROTULOS[secao]} · Área do cliente · Apolo Studio`;
  abrirFolha(false);
  if (focar) { $(`#s-${secao}`).focus({ preventScroll: true }); scrollTo(0, 0); }
}
addEventListener('hashchange', () => irPara(secaoDoHash(location.hash), true));
mais.addEventListener('click', () => abrirFolha(folha.hidden));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !folha.hidden) { abrirFolha(false); mais.focus(); } });
// setas ↑/↓ andam pelo menu lateral
const menu = [...document.querySelectorAll('.painel__menu [data-ir]')];
menu.forEach((a, i) => a.addEventListener('keydown', e => {
  const d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
  if (d) { e.preventDefault(); menu[(i + d + menu.length) % menu.length].focus(); }
}));

let estado = { cliente: null, pedidos: [], etapas: [], email: '', filtro: 'todos', projeto: null };
const etapasDe = id => estado.etapas.filter(e => e.pedido_id === id).sort((a, b) => a.ordem - b.ordem);
const conversa = a => { a.href = linkConversa(a.dataset.whats); a.target = '_blank'; a.rel = 'noopener'; };
const barra = (sel, pct) => { const b = $(sel); b.setAttribute('aria-valuenow', String(pct)); b.style.setProperty('--pct', `${pct}%`); };

function pintarInicio() {
  const { cliente, pedidos } = estado;
  const ativos = projetosAtivos(pedidos), atual = ativos[0];
  const passo = proximoPasso(pedidos, atual ? etapasDe(atual.id) : []);
  $('[data-ola]').textContent = cliente ? `Olá, ${cliente.nome.split(' ')[0]}` : 'Olá';
  const caixa = $('[data-passo]'), acao = $('[data-passo-acao]');
  caixa.classList.toggle('is-pagar', passo.tipo === 'pagar');
  $('[data-passo-rotulo]').textContent = { pagar: 'Pagamento pendente', etapa: 'Em andamento agora', entregue: 'Projeto concluído', comecar: 'Próximo passo' }[passo.tipo];
  $('[data-passo-texto]').textContent = passo.texto;
  const destino = { pagar: [passo.link, 'Pagar agora'], comecar: ['./#pacotes', 'Ver os pacotes'], etapa: ['#projeto', 'Ver etapas'], entregue: ['#manutencao', 'Ver manutenção'] }[passo.tipo];
  acao.hidden = false; acao.href = destino[0]; acao.textContent = destino[1];
  acao.className = passo.tipo === 'pagar' ? 'botao-acao' : 'botao-acao botao-acao--neutro';
  if (passo.tipo === 'pagar') { acao.target = '_blank'; acao.rel = 'noopener'; } else acao.removeAttribute('target');

  const pr = progresso(atual ? etapasDe(atual.id) : []);
  $('[data-resumo-nome]').textContent = atual ? nomePedido(atual) : 'Nenhum projeto em andamento';
  barra('[data-resumo-barra]', pr.pct);
  $('[data-resumo-barra]').hidden = !atual;
  $('[data-resumo-etapa]').textContent = !atual ? 'Começa assim que o pagamento do site for confirmado.'
    : pr.total ? `${pr.feitas} de ${pr.total} etapas concluídas${pr.atual ? ` · agora: ${pr.atual.nome}` : ''}` : 'As etapas aparecem aqui em breve.';

  const pagos = pedidos.filter(p => ['pago', 'em_andamento', 'entregue'].includes(p.status) && p.tipo === 'site');
  $('[data-resumo-pago]').textContent = `R$ ${brl(pagos.reduce((s, p) => s + Number(p.valor), 0))}`;
  const pendentes = pedidos.filter(p => p.status === 'aguardando').length;
  $('[data-resumo-pendente]').textContent = String(pendentes);
  const conta = $('[data-conta-pendentes]');
  conta.hidden = !pendentes; conta.textContent = String(pendentes);
  conta.setAttribute('aria-label', `${pendentes} aguardando pagamento`);

  const m = manutencao(pedidos);
  $('[data-resumo-manutencao]').textContent = m.pedido ? nomePedido(m.pedido) : 'Sem plano ativo';
  $('[data-resumo-manutencao-meta]').textContent = m.estado === 'ativa' ? `R$ ${brl(Number(m.pedido.valor))}/mês · ativa`
    : m.estado === 'pendente' ? 'Aguardando o primeiro pagamento' : 'Hospedagem, domínio e alterações por mês.';
}

function pintarPedidos() {
  const { pedidos, filtro } = estado;
  const lista = pedidos.filter(p => filtro === 'todos' || (filtro === 'pago' ? ['pago', 'em_andamento', 'entregue'].includes(p.status) : p.status === filtro));
  $('[data-pedidos-vazio]').hidden = lista.length > 0;
  $('[data-pedidos-vazio-titulo]').textContent = pedidos.length ? 'Nenhum pedido com esse status' : 'Nenhum pedido ainda';
  $('[data-pedidos-vazio-texto]').textContent = pedidos.length ? 'Escolha outro filtro para ver os demais.' : 'Quando você contratar um site ou uma manutenção, ele aparece aqui.';
  $('[data-pedidos]').replaceChildren(...lista.map(itemPedido));
  $('[data-ultimos-caixa]').hidden = !pedidos.length;
  $('[data-ultimos]').replaceChildren(...pedidos.slice(0, 3).map(itemPedido));
}
function itemPedido(p) {
    const li = el('li', 'pedido');
    const topo = el('div', 'pedido__topo');
    topo.append(el('strong', 'pedido__nome', nomePedido(p)), el('span', `pedido__status is-${p.status}`, STATUS[p.status] || p.status));
    const forma = p.forma === 'cartao' ? `Cartão em ${p.parcelas}x` : FORMA[p.forma];
    li.append(topo, el('p', 'pedido__info', `${data(p.criado_em)} · ${forma} · R$ ${brl(Number(p.valor))}${p.tipo === 'mensal' ? '/mês' : ''}${p.dominio ? ` · ${p.dominio}` : ''}`));
    if (p.link_fatura && p.status === 'aguardando') {
      const a = el('a', 'pedido__acao is-pagar', 'Pagar agora');
      a.href = p.link_fatura; a.target = '_blank'; a.rel = 'noopener';
      li.append(a);
    }
    return li;
}
document.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
  estado.filtro = b.dataset.filtro;
  document.querySelectorAll('[data-filtro]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  pintarPedidos();
}));

function pintarProjeto() {
  const ativos = projetosAtivos(estado.pedidos);
  const site = ativos.find(p => p.id === estado.projeto) || ativos[0];
  $('[data-projeto-vazio]').hidden = !!site;
  $('[data-projeto-cartao]').hidden = !site;
  const escolha = $('[data-projeto-escolha]');
  $('[data-projeto-escolha-caixa]').hidden = ativos.length < 2;
  escolha.replaceChildren(...ativos.map(p => Object.assign(el('option', '', `${nomePedido(p)}${p.dominio ? ` · ${p.dominio}` : ''}`), { value: p.id, selected: p === site })));
  if (!site) return;
  const etapas = etapasDe(site.id), pr = progresso(etapas);
  $('[data-projeto-nome]').textContent = nomePedido(site);
  $('[data-projeto-rotulo]').textContent = `${site.dominio ? `${site.dominio} · ` : ''}${STATUS[site.status]} · ${pr.pct}% concluído`;
  barra('[data-projeto-barra]', pr.pct);
  $('[data-etapas]').replaceChildren(...etapas.map(e => {
    const li = el('li', `etapa${e.feita ? ' is-feita' : ''}${e === pr.atual ? ' is-atual' : ''}`);
    li.append(el('span', 'etapa__marca'));
    const corpo = el('div', 'etapa__corpo');
    corpo.append(el('strong', '', e.nome));
    if (e.feita) corpo.append(el('small', '', `Concluída em ${data(e.atualizado_em)}`));
    else if (e === pr.atual) corpo.append(el('small', '', 'Em andamento'));
    if (e.nota) corpo.append(el('p', 'etapa__nota', e.nota));
    const link = linkProximaEtapa(e.nota);
    if (link) { const a = el('a', 'botao-acao botao-acao--neutro etapa__abrir', 'Abrir'); a.href = link; a.target = '_blank'; a.rel = 'noopener'; corpo.append(a); }
    li.append(corpo);
    return li;
  }));
  if (!etapas.length) $('[data-etapas]').append(el('li', 'bloco__meta', 'As etapas do seu projeto aparecem aqui em breve.'));
}
$('[data-projeto-escolha]').addEventListener('change', e => { estado.projeto = e.target.value; pintarProjeto(); });

function pintarManutencao() {
  const m = manutencao(estado.pedidos), caixa = $('[data-manutencao]');
  caixa.replaceChildren();
  if (m.estado === 'nenhuma') {
    caixa.append(el('h2', 'bloco__nome', 'Você ainda não tem um plano de manutenção'),
      el('p', 'bloco__meta', 'Com a manutenção, cuidamos da hospedagem, do domínio, da segurança e das alterações do mês. Planos a partir de R$ 94/mês, cancele quando quiser.'));
    const a = el('a', 'botao-acao', 'Ver os planos'); a.href = './#pacotes'; a.style.justifySelf = 'start';
    caixa.append(a);
    return;
  }
  const p = m.pedido, plano = CATALOGO[p.plano];
  caixa.classList.add('plano');
  caixa.append(el('p', 'bloco__meta', m.estado === 'ativa' ? `Ativa desde ${data(p.criado_em)}` : 'Aguardando o primeiro pagamento'),
    el('h2', 'bloco__nome bloco__nome--grande', `${nomePedido(p)} · R$ ${brl(Number(p.valor))}/mês`));
  if (plano?.itens) { const ul = el('ul', 'plano__itens'); ul.append(...plano.itens.map(i => el('li', '', i))); caixa.append(ul); }
  const acoes = el('div', 'plano__acoes');
  if (m.estado === 'pendente' && p.link_fatura) { const a = el('a', 'botao-acao', 'Pagar agora'); a.href = p.link_fatura; a.target = '_blank'; a.rel = 'noopener'; acoes.append(a); }
  const alterar = el('a', 'botao-acao botao-acao--neutro', 'Alterar ou cancelar');
  alterar.dataset.whats = `Olá! Quero alterar ou cancelar minha manutenção ${plano?.nome ?? ''}.`;
  conversa(alterar);
  acoes.append(alterar);
  caixa.append(acoes, el('p', 'bloco__meta', 'Sem multa. O serviço segue até o fim do mês já pago.'));
}

function pintarDados(s) {
  const { cliente } = estado, doc = $('#d-doc');
  $('#d-email').value = s.user.email;
  $('[data-menu-nome]').textContent = cliente?.nome || 'Cliente Apolo';
  $('[data-menu-email]').textContent = s.user.email;
  if (cliente) {
    $('#d-nome').value = cliente.nome; $('#d-whats').value = cliente.whatsapp;
    doc.value = mascararDoc(cliente.cpf_cnpj); doc.readOnly = true;
  } else {
    doc.value = ''; doc.readOnly = false;
    $('[data-doc-ajuda]').textContent = 'Só números. Usamos para emitir as cobranças.';
  }
  const ultimo = s.user.last_sign_in_at;
  $('[data-ultimo-acesso]').textContent = ultimo ? new Date(ultimo).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : '—';
}

async function abrirPainel() {
  const s = await sessao();
  if (!s) { mostrar('entrar'); return; }
  const [{ data: cliente, error: e1 }, { data: pedidos, error: e2 }] = await Promise.all([
    sb.from('clientes').select('*').eq('id', s.user.id).maybeSingle(),
    sb.from('pedidos').select('*').order('criado_em', { ascending: false }),
  ]);
  if ([e1, e2].some(e => e && (e.status === 401 || /jwt/i.test(e.message || '')))) { mostrar('entrar'); return; }
  const ids = projetosAtivos(pedidos || []).map(p => p.id);
  const { data: etapas } = ids.length ? await sb.from('etapas').select('*').in('pedido_id', ids) : { data: [] };
  estado = { ...estado, cliente, pedidos: pedidos || [], etapas: etapas || [], email: s.user.email };
  mostrar('painel');
  pintarInicio(); pintarPedidos(); pintarProjeto(); pintarManutencao(); pintarDados(s);
  try { if (cliente) localStorage.setItem('apolo-nome', cliente.nome); } catch {}
  irPara(secaoDoHash(location.hash));
}

// meus dados: com cadastro, muda nome e WhatsApp (o CPF/CNPJ está vinculado às cobranças); sem cadastro, cria
$('[data-dados]').addEventListener('submit', async e => {
  e.preventDefault();
  const est = $('[data-dados-estado]');
  const nome = $('#d-nome').value.trim(), whatsapp = $('#d-whats').value.trim(), doc = $('#d-doc').value.replace(/\D/g, '');
  if (!nome || whatsapp.replace(/\D/g, '').length < 10) { est.textContent = 'Confira o nome e o WhatsApp, com DDD.'; return; }
  if (!estado.cliente && ![11, 14].includes(doc.length)) { est.textContent = 'Confira o CPF (11 números) ou o CNPJ (14 números).'; return; }
  let erro;
  try {
    if (estado.cliente) ({ error: erro } = await sb.from('clientes').update({ nome, whatsapp }).eq('id', estado.cliente.id));
    else await salvarCliente({ nome, whatsapp, cpf_cnpj: doc });
  } catch (err) { erro = err; }
  est.textContent = erro ? 'Não foi possível salvar. Tente de novo.' : 'Dados salvos.';
  if (!erro) await abrirPainel();
});

// privacidade
$('[data-baixar-dados]').addEventListener('click', () => {
  const blob = new Blob([montarExportacao(estado)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'apolo-meus-dados.json' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('[data-privacidade-estado]').textContent = 'Arquivo baixado.';
});
async function sair(escopo) {
  await sb.auth.signOut(escopo ? { scope: escopo } : undefined);
  try { localStorage.removeItem('apolo-nome'); } catch {}
  location.href = './conta.html';
}
$('[data-sair-todos]').addEventListener('click', () => sair('global'));
$('[data-pedir-exclusao]').addEventListener('click', () => {
  open(linkConversa(`Olá! Quero excluir minha conta da Apolo (e-mail ${estado.email}).`), '_blank', 'noopener');
  $('[data-privacidade-estado]').textContent = 'Abrimos a conversa com o pedido escrito. É só enviar.';
});
document.querySelectorAll('[data-sair]').forEach(b => b.addEventListener('click', () => sair()));

montarPainelPreferencias($('[data-preferencias]'));
document.querySelectorAll('.painel [data-whats]').forEach(conversa);

if (!ligado) mostrar('desligada');
else abrirPainel();
