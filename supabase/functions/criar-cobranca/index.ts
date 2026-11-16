// Cria o pedido e a cobrança no Asaas e devolve o link oficial de pagamento.
// O valor é calculado aqui (precos.js compartilhado), nunca aceito do navegador.
// O cartão é digitado na página do Asaas: os dados dele nunca passam pelo site nem por aqui.
// Segredos (Supabase › Edge Functions › Secrets): ASAAS_API_KEY, ASAAS_URL (sandbox por padrão).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CATALOGO, PARCELAS_SEM_JUROS, precoCartao, precoPix } from '../_shared/precos.js';

const ASAAS = Deno.env.get('ASAAS_URL') ?? 'https://api-sandbox.asaas.com/v3';
const CHAVE = Deno.env.get('ASAAS_API_KEY') ?? '';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'content-type': 'application/json' } });

async function asaas(caminho: string, corpo?: unknown) {
  const r = await fetch(ASAAS + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: { access_token: CHAVE, 'content-type': 'application/json', 'user-agent': 'apolo-studio' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.errors?.[0]?.description ?? `Asaas respondeu ${r.status}`);
  return json;
}

// data no fuso de Brasília, AAAA-MM-DD
const dia = (d: Date) => new Date(d.getTime() - 3 * 36e5).toISOString().slice(0, 10);
function proximoDia10() {
  const h = new Date(Date.now() - 3 * 36e5);
  const d = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() + (h.getUTCDate() >= 10 ? 1 : 0), 10));
  return d.toISOString().slice(0, 10);
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return resposta({ erro: 'Use POST.' }, 405);
  if (!CHAVE) return resposta({ erro: 'Pagamento ainda não configurado.' }, 503);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return resposta({ erro: 'Entre na sua conta para finalizar.' }, 401);

  const { plano, forma, parcelas: p, cupom, dominio } = await req.json().catch(() => ({}));
  const item = CATALOGO[plano];
  if (!item) return resposta({ erro: 'Plano inválido.' }, 400);
  const site = item.tipo === 'site';
  const formas = site ? ['pix', 'cartao'] : ['pix', 'boleto'];
  if (!formas.includes(forma)) return resposta({ erro: 'Forma de pagamento inválida.' }, 400);
  const parcelas = forma === 'cartao' ? Math.min(Math.max(1, Math.trunc(Number(p) || 1)), PARCELAS_SEM_JUROS) : 1;

  const { data: cliente } = await db.from('clientes').select('*').eq('id', user.id).single();
  if (!cliente) return resposta({ erro: 'Complete seus dados antes de pagar.' }, 400);

  try {
    // cliente no Asaas (uma vez)
    let asaasCliente = cliente.asaas_cliente;
    if (!asaasCliente) {
      const c = await asaas('/customers', {
        name: cliente.nome, email: cliente.email, mobilePhone: cliente.whatsapp.replace(/\D/g, ''),
        cpfCnpj: cliente.cpf_cnpj.replace(/\D/g, ''), externalReference: user.id, notificationDisabled: false,
      });
      asaasCliente = c.id;
      await db.from('clientes').update({ asaas_cliente: asaasCliente }).eq('id', user.id);
    }

    // valor calculado aqui
    const pix = site ? precoPix(plano, cupom) : item.mes;
    const valor = site && forma === 'cartao' ? precoCartao(pix) : pix;

    const { data: pedido, error } = await db.from('pedidos').insert({
      cliente_id: user.id, plano, tipo: item.tipo, forma, parcelas, valor,
      cupom: site && pix !== precoPix(plano, '') ? String(cupom).toUpperCase() : null,
      dominio: dominio ? String(dominio).slice(0, 120) : null,
    }).select().single();
    if (error) throw error;

    let cobranca: string, link: string;
    if (!site) {
      // manutenção: assinatura mensal, vence todo dia 10
      const a = await asaas('/subscriptions', {
        customer: asaasCliente, billingType: forma === 'pix' ? 'PIX' : 'BOLETO', value: valor,
        nextDueDate: proximoDia10(), cycle: 'MONTHLY', description: `Manutenção ${item.nome} · Apolo Studio`, externalReference: pedido.id,
      });
      const primeira = await asaas(`/subscriptions/${a.id}/payments`);
      cobranca = a.id;
      link = primeira?.data?.[0]?.invoiceUrl;
    } else {
      const vence = dia(new Date(Date.now() + 2 * 864e5));
      const corpo: Record<string, unknown> = {
        customer: asaasCliente, dueDate: vence, externalReference: pedido.id,
        description: `Site ${item.nome} · Apolo Studio${forma === 'pix' ? ' · entrada de 50%' : ''}`,
      };
      if (forma === 'pix') Object.assign(corpo, { billingType: 'PIX', value: Math.round(pix / 2 * 100) / 100 });
      else if (parcelas > 1) Object.assign(corpo, { billingType: 'CREDIT_CARD', installmentCount: parcelas, totalValue: valor });
      else Object.assign(corpo, { billingType: 'CREDIT_CARD', value: valor });
      const c = await asaas('/payments', corpo);
      cobranca = c.installment ?? c.id;
      link = c.invoiceUrl;
    }
    await db.from('pedidos').update({ asaas_cobranca: cobranca, link_fatura: link }).eq('id', pedido.id);
    return resposta({ pedido: pedido.id, link });
  } catch (e) {
    console.error(e);
    return resposta({ erro: e instanceof Error ? e.message : 'Não foi possível gerar a cobrança.' }, 502);
  }
});
