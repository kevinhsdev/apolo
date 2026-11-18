// Tela de retorno do Mercado Pago: decide o que mostrar a partir do que o Mercado Pago devolveu
// no endereço (status) e do pedido no banco (que o webhook marca como pago).
const PAGOS = ['pago', 'em_andamento', 'entregue'];

export function estadoRetorno({ status, preapproval } = {}, pedido) {
  if (!pedido) return 'sem-pedido';
  if (PAGOS.includes(pedido.status)) return 'aprovado';
  if (status === 'approved' || status === 'authorized' || preapproval) return 'confirmando';
  if (status === 'pending' || status === 'in_process') return 'analise';
  return 'recusado';
}
