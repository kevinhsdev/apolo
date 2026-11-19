// Manutenção por mensalidade: cada mês é um pedido (tipo 'mensal'). O pago guarda até quando vale (vence_em);
// alguns dias antes de vencer, o servidor cria o pedido do mês seguinte (renova_de = o anterior) e manda o link.
// Usado pelo webhook, pela função renovar-mensalidades e pelo site. Testado em tests/mensalidade.test.js.
export const ANTECEDENCIA = 3; // dias antes do vencimento em que a próxima cobrança é criada
const PAGOS = ['pago', 'em_andamento', 'entregue'];
const dia = d => (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10));

// um mês depois (31/01 vira 28 ou 29/02, não 03/03)
export function proximoVencimento(base) {
  const [a, m, d] = dia(base).split('-').map(Number);
  const ultimo = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  return dia(new Date(Date.UTC(a, m, Math.min(d, ultimo))));
}

// mensalidades pagas que vencem em até ANTECEDENCIA dias e ainda não têm o pedido do mês seguinte
export function renovacoesDevidas(pedidos, hoje = new Date()) {
  const limite = new Date(hoje); limite.setUTCDate(limite.getUTCDate() + ANTECEDENCIA);
  const comFilho = new Set(pedidos.map(p => p.renova_de).filter(Boolean));
  return pedidos.filter(p => p.tipo === 'mensal' && PAGOS.includes(p.status) && p.vence_em && p.vence_em <= dia(limite) && !comFilho.has(p.id));
}

// a mensalidade em vigor de cada cadeia: paga e sem um mês seguinte também pago
export function mensalidadesVigentes(pedidos) {
  const pagas = pedidos.filter(p => p.tipo === 'mensal' && PAGOS.includes(p.status));
  const renovadas = new Set(pagas.map(p => p.renova_de).filter(Boolean));
  return pagas.filter(p => !renovadas.has(p.id));
}
