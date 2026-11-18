// Área do cliente: entrar por código no e-mail, pedidos, andamento do projeto e dados.
// Tudo é lido com a chave pública; o RLS do banco (supabase/schema.sql) só entrega o que é do cliente logado.
import '@fontsource-variable/figtree';
import '@fontsource-variable/sora';
import '../styles/tokens.css';
import '../styles/base.css';
import './pagar.css';
import './conta.css';
import '../estilo.js';
import '../acessibilidade.js';
import { CATALOGO, brl } from '../precos.js';
import { ligado, sb, sessao, enviarCodigo, conferirCodigo } from '../supabase.js';

const $ = s => document.querySelector(s);
const mostrar = v => {
  document.querySelectorAll('[data-vista]').forEach(e => { e.hidden = e.dataset.vista !== v; });
  document.body.classList.toggle('is-entrar', v === 'entrar');
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

// abas
const abas = [...document.querySelectorAll('[role=tab]')];
function abrirAba(aba, focar) {
  abas.forEach(a => {
    const sim = a === aba;
    a.setAttribute('aria-selected', String(sim));
    a.tabIndex = sim ? 0 : -1;
    document.getElementById(a.getAttribute('aria-controls')).hidden = !sim;
  });
  if (focar) aba.focus();
}
abas.forEach((a, i) => {
  a.addEventListener('click', () => abrirAba(a));
  a.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); abrirAba(abas[(i + d + abas.length) % abas.length], true); }
  });
});

function pintarPedidos(pedidos) {
  $('[data-pedidos-vazio]').hidden = pedidos.length > 0;
  $('[data-pedidos]').replaceChildren(...pedidos.map(p => {
    const li = el('li', 'pedido');
    const plano = CATALOGO[p.plano];
    const topo = el('div', 'pedido__topo');
    topo.append(el('strong', 'pedido__nome', plano ? `${plano.tipo === 'site' ? 'Site' : 'Manutenção'} ${plano.nome}` : p.plano),
      el('span', `pedido__status is-${p.status}`, STATUS[p.status] || p.status));
    const forma = p.forma === 'cartao' ? `Cartão em ${p.parcelas}x` : FORMA[p.forma];
    const info = el('p', 'pedido__info', `${data(p.criado_em)} · ${forma} · R$ ${brl(Number(p.valor))}${p.tipo === 'mensal' ? '/mês' : ''}${p.dominio ? ` · ${p.dominio}` : ''}`);
    li.append(topo, info);
    if (p.link_fatura && p.status !== 'cancelado') {
      const a = el('a', p.status === 'aguardando' ? 'pedido__acao is-pagar' : 'pedido__acao', p.status === 'aguardando' ? 'Pagar agora' : 'Ver fatura');
      a.href = p.link_fatura; a.target = '_blank'; a.rel = 'noopener';
      li.append(a);
    }
    return li;
  }));
}

async function pintarProjeto(pedidos) {
  const site = pedidos.find(p => p.tipo === 'site' && p.status !== 'cancelado' && p.status !== 'aguardando');
  $('[data-projeto-vazio]').hidden = !!site;
  $('[data-etapas]').replaceChildren();
  $('[data-projeto-nome]').textContent = site ? `Site ${CATALOGO[site.plano]?.nome ?? ''}` : 'Seu projeto';
  $('[data-projeto-rotulo]').textContent = site ? (site.dominio || STATUS[site.status]) : '';
  if (!site) return;
  const { data: etapas } = await sb.from('etapas').select('*').eq('pedido_id', site.id).order('ordem');
  const atual = (etapas || []).findIndex(e => !e.feita);
  $('[data-etapas]').replaceChildren(...(etapas || []).map((e, i) => {
    const li = el('li', `etapa${e.feita ? ' is-feita' : ''}${i === atual ? ' is-atual' : ''}`);
    li.append(el('span', 'etapa__marca'));
    const corpo = el('div', 'etapa__corpo');
    corpo.append(el('strong', '', e.nome));
    if (e.feita) corpo.append(el('small', '', `Concluída em ${data(e.atualizado_em)}`));
    else if (i === atual) corpo.append(el('small', '', 'Em andamento'));
    if (e.nota) corpo.append(el('p', 'etapa__nota', e.nota));
    li.append(corpo);
    return li;
  }));
}

async function abrirPainel() {
  const s = await sessao();
  if (!s) { mostrar('entrar'); return; }
  mostrar('painel');
  $('[data-sair]').hidden = false;
  const [{ data: cliente }, { data: pedidos }] = await Promise.all([
    sb.from('clientes').select('*').eq('id', s.user.id).maybeSingle(),
    sb.from('pedidos').select('*').order('criado_em', { ascending: false }),
  ]);
  $('[data-ola]').textContent = cliente ? `Olá, ${cliente.nome.split(' ')[0]}` : 'Olá';
  $('#d-email').value = s.user.email;
  if (cliente) {
    $('#d-nome').value = cliente.nome; $('#d-whats').value = cliente.whatsapp;
    const doc = cliente.cpf_cnpj;
    $('#d-doc').value = doc.length === 11 ? `***.${doc.slice(3, 6)}.***-${doc.slice(9)}` : `**.${doc.slice(2, 5)}.***/****-${doc.slice(12)}`;
  }
  pintarPedidos(pedidos || []);
  pintarProjeto(pedidos || []);
  try { if (cliente) localStorage.setItem('apolo-nome', cliente.nome); } catch {}
  const aba = document.getElementById('aba-' + location.hash.slice(1));
  if (aba) abrirAba(aba);
}

// meus dados (o CPF/CNPJ não muda por aqui: está vinculado às cobranças)
$('[data-dados]').addEventListener('submit', async e => {
  e.preventDefault();
  const est = $('[data-dados-estado]');
  const nome = $('#d-nome').value.trim(), whats = $('#d-whats').value.trim();
  if (!nome || whats.replace(/\D/g, '').length < 10) { est.textContent = 'Confira o nome e o WhatsApp, com DDD.'; return; }
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('clientes').update({ nome, whatsapp: whats }).eq('id', user.id);
  est.textContent = error ? 'Não foi possível salvar. Tente de novo.' : 'Dados salvos.';
  if (!error) $('[data-ola]').textContent = `Olá, ${nome.split(' ')[0]}`;
});

$('[data-sair]').addEventListener('click', async () => {
  await sb.auth.signOut();
  try { localStorage.removeItem('apolo-nome'); } catch {}
  location.reload();
});

if (!ligado) mostrar('desligada');
else abrirPainel();
