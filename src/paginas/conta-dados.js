// Regras do painel da área do cliente, sem DOM (testadas em tests/conta-dados.test.js).
import { CATALOGO } from '../precos.js';

export const SECOES = ['inicio', 'pedidos', 'projeto', 'manutencao', 'dados', 'privacidade', 'preferencias', 'ajuda'];

export const secaoDoHash = hash => {
  const s = String(hash || '').replace(/^#/, '');
  return SECOES.includes(s) ? s : 'inicio';
};

const recentes = (a, b) => (b.criado_em > a.criado_em ? 1 : b.criado_em < a.criado_em ? -1 : 0);

export const projetosAtivos = pedidos =>
  pedidos.filter(p => p.tipo === 'site' && ['pago', 'em_andamento', 'entregue'].includes(p.status)).sort(recentes);

export function manutencao(pedidos) {
  const mensais = pedidos.filter(p => p.tipo === 'mensal' && p.status !== 'cancelado').sort(recentes);
  const ativa = mensais.find(p => p.status !== 'aguardando');
  if (ativa) return { estado: 'ativa', pedido: ativa };
  return mensais.length ? { estado: 'pendente', pedido: mensais[0] } : { estado: 'nenhuma' };
}

export function progresso(etapas) {
  const total = etapas.length, feitas = etapas.filter(e => e.feita).length;
  return { feitas, total, pct: total ? Math.round((feitas / total) * 100) : 0, atual: etapas.find(e => !e.feita) ?? null };
}

export const nomePedido = p => {
  const plano = CATALOGO[p.plano];
  return plano ? `${p.tipo === 'mensal' ? 'Manutenção' : 'Site'} ${plano.nome}` : p.plano;
};

// etapas: as do projeto ativo mais recente
export function proximoPasso(pedidos, etapas) {
  const pagar = pedidos.filter(p => p.status === 'aguardando' && p.link_fatura).sort(recentes)[0];
  if (pagar) return { tipo: 'pagar', texto: `Conclua o pagamento do ${nomePedido(pagar)}`, link: pagar.link_fatura };
  if (projetosAtivos(pedidos).length) {
    const { atual } = progresso(etapas);
    return atual ? { tipo: 'etapa', texto: atual.nome } : { tipo: 'entregue', texto: 'Seu site está no ar' };
  }
  return { tipo: 'comecar', texto: 'Escolha um pacote para começar' };
}

export function mascararDoc(doc) {
  const d = String(doc || '');
  if (d.length === 11) return `***.${d.slice(3, 6)}.***-${d.slice(9)}`;
  if (d.length === 14) return `**.${d.slice(2, 5)}.***/****-${d.slice(12)}`;
  return '';
}

export const montarExportacao = ({ cliente, pedidos, etapas, email }) => JSON.stringify({
  exportado_em: new Date().toISOString(),
  conta: { email },
  cadastro: cliente ?? null,
  pedidos: pedidos.map(({ cobranca, ...p }) => p),
  etapas,
}, null, 2);

export const linkProximaEtapa = nota => String(nota || '').match(/https:\/\/[^\s)]+/)?.[0] ?? null;
