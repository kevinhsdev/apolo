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

// manutenção: a mensalidade paga mais recente; 'aberta' é a do mês seguinte esperando pagamento
export function manutencao(pedidos, hoje = new Date()) {
  const mensais = pedidos.filter(p => p.tipo === 'mensal' && p.status !== 'cancelado').sort(recentes);
  const ativa = mensais.find(p => p.status !== 'aguardando');
  if (ativa) {
    const aberta = mensais.find(p => p.renova_de === ativa.id && p.status === 'aguardando');
    const vencida = !!ativa.vence_em && ativa.vence_em < hoje.toISOString().slice(0, 10);
    return { estado: !vencida ? 'ativa' : aberta ? 'atrasada' : 'encerrada', pedido: ativa, aberta };
  }
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
    const { atual, total } = progresso(etapas);
    if (!total) return { tipo: 'etapa', texto: 'Estamos preparando as etapas do seu projeto' };
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

// resposta do Supabase: 'sessao' (venceu, volta a entrar), 'falha' (rede ou servidor: não pintar dados vazios) ou 'ok'
export function resultadoLeitura(erros) {
  const lista = erros.filter(Boolean);
  if (!lista.length) return 'ok';
  return lista.some(e => e.status === 401 || /jwt/i.test(e.message || '')) ? 'sessao' : 'falha';
}
