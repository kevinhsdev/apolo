// Chamada à API do Mercado Pago com o Access Token da conta.
// Segredos (Supabase › Edge Functions › Secrets): MP_ACCESS_TOKEN; MP_URL só no teste local (servidor falso).
export const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
const MP = Deno.env.get('MP_URL') ?? 'https://api.mercadopago.com';

export async function mp(caminho: string, corpo?: unknown, idempotencia?: string) {
  const r = await fetch(MP + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${MP_TOKEN}`,
      'content-type': 'application/json',
      ...(idempotencia ? { 'x-idempotency-key': idempotencia } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(json?.message ?? `Mercado Pago respondeu ${r.status}`), { status: r.status });
  return json;
}

// Checkout Pro (página de pagamento do Mercado Pago). forma: 'pix', 'cartao' ou 'ambos' (o cliente escolhe lá).
// Volta para a tela de agradecimento; o Mercado Pago acrescenta status e collection_status no endereço.
// ponytail: no Pix, quem pagar com saldo da conta Mercado Pago custa 4,99% em vez de 0,99%; raro, aceito.
export async function criarPreferencia(o: {
  pedidoId: string; itemId: string; titulo: string; valor: number; forma: 'pix' | 'cartao' | 'ambos';
  parcelas?: number; pagador?: Record<string, unknown>; site: string;
}) {
  const sem = (...ids: string[]) => ids.map(id => ({ id }));
  const volta = `${o.site}/obrigado.html?pedido=${o.pedidoId}`;
  const c = await mp('/checkout/preferences', {
    items: [{ id: o.itemId, quantity: 1, currency_id: 'BRL', title: o.titulo, unit_price: o.valor }],
    ...(o.pagador ? { payer: o.pagador } : {}),
    external_reference: o.pedidoId,
    back_urls: { success: volta, pending: volta, failure: volta }, auto_return: 'approved',
    payment_methods: o.forma === 'pix' ? { installments: 1, excluded_payment_types: sem('credit_card', 'debit_card', 'prepaid_card', 'ticket') }
      : o.forma === 'cartao' ? { installments: o.parcelas ?? 1, excluded_payment_types: sem('ticket', 'bank_transfer', 'debit_card', 'prepaid_card') }
      : { installments: 1, excluded_payment_types: sem('ticket', 'debit_card', 'prepaid_card') },
    statement_descriptor: 'APOLOSTUDIO',
  });
  return { id: c.id as string, link: c.init_point as string };
}
