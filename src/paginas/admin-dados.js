// Regras da página de admin, sem DOM (testadas em tests/admin-dados.test.js).
import { progresso } from './conta-dados.js';
import { TAXAS, liquidoCartao } from '../precos.js';
import { mensalidadesVigentes } from '../../supabase/functions/_shared/mensalidade.js';

// meta de receita do mês: R$ 1.000 para cada sócio
export const META_MENSAL = 2000;
export const ATIVOS = ['pago', 'em_andamento', 'entregue'];
const ativo = p => ATIVOS.includes(p.status);

export const FILTROS = ['aguardando', 'producao', 'entregue', 'cancelado', 'todos'];

export const noFiltro = (p, filtro) =>
  filtro === 'todos' || (filtro === 'producao' ? ['pago', 'em_andamento'].includes(p.status) : p.status === filtro);

export const contagens = pedidos =>
  Object.fromEntries(FILTROS.map(f => [f, pedidos.filter(p => noFiltro(p, f)).length]));

export function tempoDesde(iso, agora = new Date()) {
  const min = Math.floor((agora - new Date(iso)) / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}
const dias = (iso, agora) => (agora - new Date(iso)) / 864e5;

export const pedidoDoHash = hash => String(hash || '').match(/^#pedido=([\w-]+)$/)?.[1] ?? null;

export function resumoEtapas(etapas) {
  const { feitas, total, atual } = progresso(etapas);
  if (!total) return 'Sem etapas';
  return `${atual ? atual.nome : 'Concluído'} · ${atual ? feitas + 1 : total} de ${total}`;
}

export const statusPermitidos = p => (['aguardando', 'cancelado'].includes(p.status) ? [] : ['pago', 'em_andamento', 'entregue']);

// Pix do site: o Mercado Pago cobrou só a entrada; falta o restante até o admin marcar
export const faltaRestante = p => ativo(p) && p.tipo === 'site' && p.forma === 'pix' && !p.restante_em;

// Cada entrada de dinheiro: { data, valor (bruto), liquido (depois da taxa) }.
// A manutenção entra uma vez por mês pago (cada mensalidade é um pedido).
export function recebimentos(pedidos) {
  const r = [];
  for (const p of pedidos) {
    if (!ativo(p) || !p.pago_em) continue;
    const v = Number(p.valor);
    if (p.tipo === 'site' && p.forma === 'pix') {
      r.push({ data: p.pago_em, valor: v / 2, liquido: (v / 2) * (1 - TAXAS.pix) });
      if (p.restante_em) r.push({ data: p.restante_em, valor: v / 2, liquido: v / 2 }); // recebido fora do Mercado Pago
    } else if (p.tipo === 'site') r.push({ data: p.pago_em, valor: v, liquido: liquidoCartao(v, p.parcelas || 1) });
    else r.push({ data: p.pago_em, valor: v, liquido: v * (1 - (p.forma === 'pix' ? TAXAS.pix : TAXAS.avista)) });
  }
  return r;
}

const chaveMes = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const somar = (lista, campo = 'valor') => lista.reduce((s, x) => s + Number(x[campo]), 0);

// últimos n meses, do mais antigo ao atual
export function porMes(recs, n = 6, agora = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (n - 1 - i), 1);
    const chave = chaveMes(d), doMes = recs.filter(r => chaveMes(new Date(r.data)) === chave);
    return { chave, rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), valor: somar(doMes), liquido: somar(doMes, 'liquido') };
  });
}

// recorrente: a mensalidade em vigor de cada cliente, menos as que o admin encerrou (renovação cancelada)
const mrrVivo = pedidos => mensalidadesVigentes(pedidos).filter(p => !pedidos.some(c => c.renova_de === p.id && c.status === 'cancelado'));

export function indicadores(pedidos, agora = new Date()) {
  const meses = porMes(recebimentos(pedidos), 2, agora);
  const [anterior, atual] = meses;
  const sites = pedidos.filter(p => ativo(p) && p.tipo === 'site');
  const recentes = pedidos.filter(p => !p.renova_de && dias(p.criado_em, agora) <= 30); // renovação não é venda nova
  const mes = chaveMes(agora);
  return {
    recebidoMes: atual.valor,
    liquidoMes: atual.liquido,
    variacao: anterior.valor ? (atual.valor - anterior.valor) / anterior.valor : null,
    meta: Math.min(atual.valor / META_MENSAL, 1),
    faltaMeta: Math.max(META_MENSAL - atual.valor, 0),
    aReceber: pedidos.filter(faltaRestante).reduce((s, p) => s + Number(p.valor) / 2, 0),
    mrr: somar(mrrVivo(pedidos)),
    ticket: sites.length ? somar(sites) / sites.length : 0,
    conversao: recentes.length ? recentes.filter(ativo).length / recentes.length : null,
    pedidosMes: pedidos.filter(p => chaveMes(new Date(p.criado_em)) === mes).length,
    total: somar(recebimentos(pedidos)),
  };
}

export function funil(todos) {
  const pedidos = todos.filter(p => !p.renova_de); // renovação não é venda nova
  const vivos = pedidos.filter(p => p.status !== 'cancelado' || p.pago_em);
  return [
    { nome: 'Pedidos criados', n: pedidos.length },
    { nome: 'Pagos', n: vivos.filter(ativo).length },
    { nome: 'Em produção ou entregues', n: vivos.filter(p => ['em_andamento', 'entregue'].includes(p.status)).length },
    { nome: 'Entregues', n: vivos.filter(p => p.status === 'entregue').length },
  ];
}

// receita por plano (pedidos pagos), do maior para o menor
export function porPlano(pedidos, nomes = {}) {
  const m = new Map();
  for (const p of pedidos.filter(ativo)) {
    const x = m.get(p.plano) ?? { plano: p.plano, nome: nomes[p.plano] ?? p.plano, n: 0, valor: 0 };
    x.n++; x.valor += Number(p.valor);
    m.set(p.plano, x);
  }
  return [...m.values()].sort((a, b) => b.valor - a.valor);
}

// O que fazer hoje para vender mais e entregar no prazo
export function alertas(pedidos, etapas, clientes, agora = new Date(), nomes = {}) {
  const nome = id => clientes.get(id)?.nome ?? 'Cliente';
  const plano = p => (nomes[p.plano] ? ` ${nomes[p.plano]}` : '');
  const out = [];
  for (const p of pedidos) {
    const anterior = p.renova_de && pedidos.find(x => x.id === p.renova_de);
    if (anterior) { // mensalidade: só cobra depois de vencer
      const vence = anterior.vence_em && new Date(`${anterior.vence_em}T23:59:59-03:00`);
      if (p.status === 'aguardando' && vence && agora > vence)
        out.push({ tipo: 'cobrar', pedido: p.id, cliente: p.cliente_id, texto: `Mensalidade da manutenção${plano(p)} de ${nome(p.cliente_id)} venceu ${tempoDesde(vence, agora)}` });
    } else if (p.status === 'aguardando' && dias(p.criado_em, agora) >= 1)
      out.push({ tipo: 'cobrar', pedido: p.id, cliente: p.cliente_id, texto: `${nome(p.cliente_id)} não pagou o pedido${plano(p)} ${tempoDesde(p.criado_em, agora)}` });
    if (faltaRestante(p) && (p.status === 'entregue' || progresso(etapas.filter(e => e.pedido_id === p.id)).atual?.ordem >= 5))
      out.push({ tipo: 'restante', pedido: p.id, cliente: p.cliente_id, texto: `Cobrar os 50% restantes do site${plano(p)} de ${nome(p.cliente_id)}` });
    if (['pago', 'em_andamento'].includes(p.status) && p.tipo === 'site') {
      const ult = etapas.filter(e => e.pedido_id === p.id).reduce((m, e) => (e.atualizado_em > m ? e.atualizado_em : m), p.pago_em ?? p.criado_em);
      if (dias(ult, agora) >= 5) out.push({ tipo: 'parado', pedido: p.id, cliente: p.cliente_id, texto: `Site${plano(p)} de ${nome(p.cliente_id)} sem avanço ${tempoDesde(ult, agora)}` });
    }
  }
  const comManutencao = new Set(pedidos.filter(p => ativo(p) && p.tipo === 'mensal').map(p => p.cliente_id));
  for (const p of pedidos.filter(p => p.status === 'entregue' && p.tipo === 'site' && !comManutencao.has(p.cliente_id)))
    out.push({ tipo: 'manutencao', pedido: p.id, cliente: p.cliente_id, texto: `Oferecer manutenção para ${nome(p.cliente_id)}` });
  return out;
}

export function resumoClientes(clientes, pedidos) {
  return [...clientes.values()].map(c => {
    const deles = pedidos.filter(p => p.cliente_id === c.id);
    const pagos = deles.filter(ativo);
    return {
      ...c,
      pedidos: deles.length,
      gasto: somar(pagos),
      manutencao: pagos.some(p => p.tipo === 'mensal'),
      ultimo: deles.reduce((m, p) => (p.criado_em > m ? p.criado_em : m), c.criado_em ?? ''),
    };
  });
}

const semAcento = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const combina = (busca, ...campos) => {
  const q = semAcento(busca).trim();
  return !q || campos.some(c => semAcento(c).includes(q));
};

export function ordenar(lista, chave, dir = 'desc') {
  const s = dir === 'asc' ? 1 : -1;
  return [...lista].sort((a, b) => {
    const x = a[chave] ?? '', y = b[chave] ?? '';
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * s;
  });
}

// CSV para o Excel brasileiro (;) com BOM. Célula que começa com = + - @ vira texto (evita fórmula maliciosa).
export function csv(linhas, colunas) {
  const cel = v => {
    let t = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '﻿' + [colunas.map(c => cel(c.titulo)), ...linhas.map(l => colunas.map(c => cel(c.valor(l))))].map(r => r.join(';')).join('\r\n');
}
