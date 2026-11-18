// Recebe os avisos do Mercado Pago (Suas integrações › Webhooks: eventos "Pagamentos" e "Planos e assinaturas").
// O aviso só diz "mudou o pagamento X": o status de verdade é buscado na API com o nosso token,
// então um aviso falso no máximo provoca uma consulta. A assinatura (x-signature) é conferida mesmo assim.
// Segredo: MP_WEBHOOK_SECRET (a "assinatura secreta" do webhook no painel). Publicar com --no-verify-jwt.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { mp } from '../_shared/mercadopago.ts';

const SEGREDO = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';

async function assinaturaOk(req: Request, id: string) {
  const partes = Object.fromEntries((req.headers.get('x-signature') ?? '').split(',').map(p => p.trim().split('=')));
  if (!partes.ts || !partes.v1) return false;
  const manifesto = `id:${id.toLowerCase()};request-id:${req.headers.get('x-request-id') ?? ''};ts:${partes.ts};`;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(SEGREDO), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto)));
  return [...hash].map(b => b.toString(16).padStart(2, '0')).join('') === partes.v1;
}

Deno.serve(async req => {
  const url = new URL(req.url);
  const corpo = await req.json().catch(() => ({}));
  const tipo = corpo.type ?? url.searchParams.get('type');
  const id = String(corpo.data?.id ?? url.searchParams.get('data.id') ?? '');
  if (!tipo || !id) return new Response('ok');
  if (!SEGREDO || !(await assinaturaOk(req, id))) return new Response('não autorizado', { status: 401 });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let pedidoId: string | undefined, plano: string | undefined, pago = false, desfeito = false, parcelas: number | undefined, recebido = Infinity;
  try {
    if (tipo === 'payment') {
      const p = await mp(`/v1/payments/${id}`);
      pedidoId = p.external_reference;
      pago = p.status === 'approved';
      desfeito = ['refunded', 'charged_back'].includes(p.status);
      parcelas = p.installments;
      recebido = Number(p.transaction_amount);
    } else if (tipo === 'subscription_preapproval') {
      const a = await mp(`/preapproval/${id}`);
      plano = a.preapproval_plan_id; // a manutenção é assinada pelo link do plano criado para o pedido
      pago = a.status === 'authorized';
      desfeito = a.status === 'cancelled';
    } else return new Response('ok');
  } catch (e) {
    if ((e as { status?: number }).status === 404) return new Response('ok'); // não existe (ex.: teste do painel): nada a fazer
    console.error(e);
    return new Response('erro', { status: 500 }); // falha passageira: o Mercado Pago tenta de novo
  }

  const campos = 'id, status, tipo, forma, valor';
  const { data: pedido } = pedidoId ? await db.from('pedidos').select(campos).eq('id', pedidoId).maybeSingle()
    : plano ? await db.from('pedidos').select(campos).eq('cobranca', plano).maybeSingle()
    : { data: null };
  if (!pedido) return new Response('ok'); // cobrança que não é da área do cliente

  // confere o valor: no Pix do site a entrada é metade do total
  const esperado = pedido.tipo === 'site' && pedido.forma === 'pix' ? Number(pedido.valor) / 2 : Number(pedido.valor);
  if (pago && pedido.status === 'aguardando' && recebido >= esperado - 0.01) {
    await db.from('pedidos').update({ status: 'pago', ...(parcelas && pedido.forma === 'cartao' ? { parcelas } : {}) }).eq('id', pedido.id);
    await db.from('etapas').update({ feita: true, atualizado_em: new Date().toISOString() }).eq('pedido_id', pedido.id).eq('ordem', 1);
  } else if (desfeito) {
    await db.from('pedidos').update({ status: 'cancelado' }).eq('id', pedido.id);
  }
  return new Response('ok');
});
