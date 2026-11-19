// Cliente cancela a manutenção pela área dele (sem precisar falar com a gente).
// Fecha a mensalidade aberta ou marca o mês seguinte como cancelado; o serviço segue até o fim do mês pago.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { planoCancelamento } from '../_shared/mensalidade.js';
import { avisarAdmins } from '../_shared/avisar.ts';
import { montarCancelamento } from '../_shared/aviso.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return resposta({ erro: 'Entre na sua conta para cancelar.' }, 401);

  const { data: pedidos, error } = await db.from('pedidos')
    .select('id, cliente_id, plano, tipo, valor, status, vence_em, renova_de, criado_em').eq('cliente_id', user.id).eq('tipo', 'mensal');
  if (error) return resposta({ erro: 'Não foi possível cancelar agora.' }, 500);
  const plano = planoCancelamento(pedidos ?? []);
  if (!plano) return resposta({ ok: true, ja: true });

  const p = plano.pedido;
  const r = plano.acao === 'cancelar'
    ? await db.from('pedidos').update({ status: 'cancelado' }).eq('id', p.id).eq('status', 'aguardando')
    : await db.from('pedidos').insert({ cliente_id: user.id, plano: p.plano, tipo: 'mensal', forma: 'pix', parcelas: 1, valor: p.valor, status: 'cancelado', renova_de: p.id });
  if (r.error) { console.error('cancelar', r.error.message); return resposta({ erro: 'Não foi possível cancelar agora.' }, 500); }

  // quem pagou segue até o vencimento; a 1ª mensalidade em aberto não tinha serviço ainda
  const ate = plano.acao === 'encerrar' ? p.vence_em : (p.renova_de ? pedidos!.find(x => x.id === p.renova_de)?.vence_em : null) ?? null;
  const { data: cliente } = await db.from('clientes').select('nome, email').eq('id', user.id).maybeSingle();
  await avisarAdmins(montarCancelamento({ pedido: p, cliente: cliente ?? { email: user.email }, ate, site: Deno.env.get('SITE_URL') ?? 'https://apolostudio.com.br' }));
  return resposta({ ok: true, ate });
});
