// Recebe os avisos do Mercado Pago (Suas integrações › Webhooks: eventos "Pagamentos" e "Planos e assinaturas").
// O aviso só diz "mudou o pagamento X": o status de verdade é buscado na API com o nosso token,
// então um aviso falso no máximo provoca uma consulta. A assinatura (x-signature) é conferida e, se falhar, só registrada.
// Segredo: MP_WEBHOOK_SECRET (a "assinatura secreta" do webhook no painel). Publicar com --no-verify-jwt.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { mp } from '../_shared/mercadopago.ts';
import { montarAviso } from '../_shared/aviso.js';
import { avisarAdmins } from '../_shared/avisar.ts';
import { proximoVencimento } from '../_shared/mensalidade.js';

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
  // A assinatura é uma camada extra: o status, o valor e o pedido vêm da API do Mercado Pago com o nosso token,
  // então um aviso falso não confirma nada. Se ela não bater (segredo trocado no painel, que tem um por modo),
  // registra e segue, para um pagamento de verdade nunca ficar parado (aconteceu em 19/11/2026).
  if (!SEGREDO || !(await assinaturaOk(req, id))) console.warn('webhook: assinatura não confere; confira MP_WEBHOOK_SECRET', tipo, id);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let pedidoId: string | undefined, plano: string | undefined, pago = false, desfeito = false, parcelas: number | undefined, recebido = Infinity;
  let pagoNoCartao: boolean | undefined;
  try {
    if (tipo === 'payment') {
      const p = await mp(`/v1/payments/${id}`);
      pedidoId = p.external_reference;
      pago = p.status === 'approved';
      desfeito = ['refunded', 'charged_back'].includes(p.status);
      parcelas = p.installments;
      recebido = Number(p.transaction_amount);
      pagoNoCartao = p.payment_type_id === 'credit_card';
      console.log('pagamento', id, p.status, p.status_detail); // motivo de recusa fica no log da função
    } else if (tipo === 'subscription_preapproval') { // assinaturas antigas (antes da mensalidade por link)
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

  const campos = 'id, status, tipo, forma, valor, cliente_id, plano, parcelas, dominio, renova_de';
  const { data: pedido } = pedidoId ? await db.from('pedidos').select(campos).eq('id', pedidoId).maybeSingle()
    : plano ? await db.from('pedidos').select(campos).eq('cobranca', plano).maybeSingle()
    : { data: null };
  if (!pedido) return new Response('ok'); // cobrança que não é da área do cliente

  // confere o valor: no Pix do site a entrada é metade do total
  const esperado = pedido.tipo === 'site' && pedido.forma === 'pix' ? Number(pedido.valor) / 2 : Number(pedido.valor);
  // cancelado também: o admin pode cancelar um pedido parado, mas o link do Mercado Pago continua valendo
  if (pago && ['aguardando', 'cancelado'].includes(pedido.status) && recebido >= esperado - 0.01) {
    const extra: Record<string, unknown> = parcelas && pedido.forma === 'cartao' ? { parcelas } : {};
    if (pedido.tipo === 'mensal') {
      // vale por um mês a partir do vencimento anterior (pagando atrasado, a partir de hoje)
      const hoje = new Date().toISOString().slice(0, 10);
      const { data: anterior } = pedido.renova_de ? await db.from('pedidos').select('vence_em').eq('id', pedido.renova_de).maybeSingle() : { data: null };
      const vence = proximoVencimento(anterior?.vence_em ?? hoje);
      extra.vence_em = vence < hoje ? proximoVencimento(hoje) : vence;
      if (pagoNoCartao !== undefined) extra.forma = pagoNoCartao ? 'cartao' : 'pix'; // a renovação deixa o cliente escolher
    }
    Object.assign(pedido, extra);
    await db.from('pedidos').update({ status: 'pago', pago_em: new Date().toISOString(), ...extra }).eq('id', pedido.id);
    await db.from('etapas').update({ feita: true, atualizado_em: new Date().toISOString() }).eq('pedido_id', pedido.id).eq('ordem', 1);
    const { data: cliente } = await db.from('clientes').select('nome, email, whatsapp').eq('id', pedido.cliente_id).maybeSingle();
    await avisarAdmins(montarAviso({ evento: 'pago', pedido, cliente, site: Deno.env.get('SITE_URL') ?? 'https://apolostudio.com.br' }));
  } else if (desfeito) {
    await db.from('pedidos').update({ status: 'cancelado' }).eq('id', pedido.id);
  }
  return new Response('ok');
});
