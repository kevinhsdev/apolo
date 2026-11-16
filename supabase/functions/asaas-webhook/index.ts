// Recebe os avisos do Asaas (Integrações › Webhooks) e atualiza o pedido.
// O Asaas manda o token configurado no webhook no cabeçalho asaas-access-token; sem ele, nada muda.
// Segredo: ASAAS_WEBHOOK_TOKEN. Publicar com --no-verify-jwt (o Asaas não tem login do Supabase).
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
const PAGO = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
const DESFEITO = ['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'];

Deno.serve(async req => {
  if (!TOKEN || req.headers.get('asaas-access-token') !== TOKEN) return new Response('não autorizado', { status: 401 });
  const { event, payment } = await req.json().catch(() => ({}));
  if (!payment) return new Response('ok');

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // o pedido vem no externalReference; nas parcelas e assinaturas, pelo id do parcelamento ou da assinatura
  const filtro = payment.externalReference
    ? db.from('pedidos').select('id, status').eq('id', payment.externalReference)
    : db.from('pedidos').select('id, status').in('asaas_cobranca', [payment.installment, payment.subscription].filter(Boolean));
  const { data: pedidos } = await filtro;
  const pedido = pedidos?.[0];
  if (!pedido) return new Response('ok'); // aviso de cobrança que não é da área do cliente

  if (PAGO.includes(event) && pedido.status === 'aguardando') {
    await db.from('pedidos').update({ status: 'pago' }).eq('id', pedido.id);
    await db.from('etapas').update({ feita: true, atualizado_em: new Date().toISOString() }).eq('pedido_id', pedido.id).eq('ordem', 1);
  } else if (DESFEITO.includes(event)) {
    await db.from('pedidos').update({ status: 'cancelado' }).eq('id', pedido.id);
  }
  return new Response('ok'); // sempre 200 para o Asaas não reenviar à toa
});
