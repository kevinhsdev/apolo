// Rotina diária (GitHub Actions › .github/workflows/mensalidades.yml): para cada manutenção que vence em até
// 3 dias, cria o pedido do mês seguinte, gera o link do Mercado Pago (Pix ou cartão) e manda por e-mail ao cliente.
// O cliente também vê o "Pagar" na área dele. Se o admin cancelar a mensalidade aberta, a cadeia para.
// Segredo: CRON_SECRET (o mesmo do GitHub). Publicar com --no-verify-jwt.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CATALOGO } from '../_shared/precos.js';
import { criarPreferencia } from '../_shared/mercadopago.ts';
import { renovacoesDevidas } from '../_shared/mensalidade.js';
import { montarLembrete } from '../_shared/aviso.js';
import { enviarEmail } from '../_shared/avisar.ts';

const SITE = Deno.env.get('SITE_URL') ?? 'https://apolostudio.com.br';
const SEGREDO = Deno.env.get('CRON_SECRET') ?? '';

Deno.serve(async req => {
  if (!SEGREDO || req.headers.get('x-cron') !== SEGREDO) return new Response('não autorizado', { status: 401 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: mensais, error } = await db.from('pedidos')
    .select('id, cliente_id, plano, tipo, valor, status, vence_em, renova_de').eq('tipo', 'mensal');
  if (error) return new Response(error.message, { status: 500 });

  const feitos: string[] = [];
  for (const anterior of renovacoesDevidas(mensais ?? [])) {
    // o preço contratado continua; forma 'pix' até o pagamento dizer qual foi (o webhook corrige)
    const { data: novo, error: e } = await db.from('pedidos').insert({
      cliente_id: anterior.cliente_id, plano: anterior.plano, tipo: 'mensal', forma: 'pix', parcelas: 1,
      valor: anterior.valor, renova_de: anterior.id,
    }).select().single();
    if (e) { console.error('renovar', anterior.id, e.message); continue; } // ex.: já renovado (índice único)
    try {
      const { id: cobranca, link } = await criarPreferencia({
        pedidoId: novo.id, itemId: anterior.plano, site: SITE, forma: 'ambos',
        titulo: `Manutenção ${CATALOGO[anterior.plano]?.nome ?? anterior.plano} · Apolo Studio · mensalidade`,
        valor: Number(anterior.valor),
      });
      await db.from('pedidos').update({ cobranca, link_fatura: link }).eq('id', novo.id);
      const { data: cliente } = await db.from('clientes').select('nome, email').eq('id', anterior.cliente_id).maybeSingle();
      if (cliente?.email) await enviarEmail([cliente.email], montarLembrete({ pedido: novo, cliente, vence: anterior.vence_em, link, site: SITE }));
      feitos.push(novo.id);
    } catch (err) {
      // sem link não adianta deixar o pedido: apaga para a rotina de amanhã tentar de novo
      console.error('renovar: Mercado Pago', anterior.id, err);
      await db.from('pedidos').delete().eq('id', novo.id);
    }
  }
  return Response.json({ renovadas: feitos.length });
});
