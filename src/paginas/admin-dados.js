// Regras da página de admin, sem DOM (testadas em tests/admin-dados.test.js).
import { progresso } from './conta-dados.js';

export const FILTROS = ['aguardando', 'producao', 'entregue', 'todos'];

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

export const pedidoDoHash = hash => String(hash || '').match(/^#pedido=([\w-]+)$/)?.[1] ?? null;

export function resumoEtapas(etapas) {
  const { feitas, total, atual } = progresso(etapas);
  if (!total) return 'Sem etapas';
  return `${atual ? atual.nome : 'Concluído'} · ${atual ? feitas + 1 : total} de ${total}`;
}

export const statusPermitidos = p => (['aguardando', 'cancelado'].includes(p.status) ? [] : ['pago', 'em_andamento', 'entregue']);
