// Cria o pedido e a cobrança no Mercado Pago e devolve o link oficial de pagamento.
// O valor é calculado aqui (precos.js compartilhado), nunca aceito do navegador.
// O cartão é digitado na página do Mercado Pago: os dados dele nunca passam pelo site nem por aqui.
//   Pix (site): Checkout Pro só com Pix, 50% de entrada.
//   Cartão (site): Checkout Pro só com cartão, até PARCELAS_SEM_JUROS sem juros (parcelado vendedor no painel).
//   Manutenção: assinatura mensal no cartão.
// Segredos: MP_ACCESS_TOKEN e SITE_URL (endereço do site, para a volta depois do pagamento).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CATALOGO, PARCELAS_SEM_JUROS, precoCartao, precoPix } from '../_shared/precos.js';
import { mp, MP_TOKEN } from '../_shared/mercadopago.ts';

const SITE = Deno.env.get('SITE_URL') ?? 'https://apolostudio.com.br';
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
  if (!MP_TOKEN) return resposta({ erro: 'Pagamento ainda não configurado.' }, 503);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return resposta({ erro: 'Entre na sua conta para finalizar.' }, 401);

  const { plano, forma, parcelas: p, cupom, dominio } = await req.json().catch(() => ({}));
  const item = CATALOGO[plano];
  if (!item) return resposta({ erro: 'Plano inválido.' }, 400);
  const site = item.tipo === 'site';
  if (!(site ? ['pix', 'cartao'] : ['cartao']).includes(forma)) return resposta({ erro: 'Forma de pagamento inválida.' }, 400);
  const parcelas = site && forma === 'cartao' ? Math.min(Math.max(1, Math.trunc(Number(p) || 1)), PARCELAS_SEM_JUROS) : 1;

  const { data: cliente } = await db.from('clientes').select('*').eq('id', user.id).single();
  if (!cliente) return resposta({ erro: 'Complete seus dados antes de pagar.' }, 400);
  const doc = cliente.cpf_cnpj.replace(/\D/g, '');
  const pagador = { email: cliente.email, identification: { type: doc.length === 14 ? 'CNPJ' : 'CPF', number: doc } };

  try {
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
      // um plano por pedido: o cliente assina com a própria conta Mercado Pago (o e-mail dela pode não ser o do site)
      // e o webhook acha o pedido pelo id do plano. ponytail: os planos se acumulam no painel; inofensivo.
      const a = await mp('/preapproval_plan', {
        reason: `Manutenção ${item.nome} · Apolo Studio`,
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: valor, currency_id: 'BRL' },
        back_url: `${SITE}/conta.html`,
      });
      cobranca = a.id; link = a.init_point;
    } else {
      // Checkout Pro nos dois casos; "dinheiro em conta" o Mercado Pago não deixa tirar.
      // ponytail: no Pix, quem pagar com saldo custa 4,99% em vez de 0,99%; raro, aceito.
      const ePix = forma === 'pix';
      const c = await mp('/checkout/preferences', {
        items: [{
          id: plano, quantity: 1, currency_id: 'BRL',
          title: `Site ${item.nome} · Apolo Studio${ePix ? ' · entrada de 50%' : ''}`,
          unit_price: ePix ? Math.round(pix / 2 * 100) / 100 : valor,
        }],
        payer: { name: cliente.nome, ...pagador }, external_reference: pedido.id,
        back_urls: { success: `${SITE}/conta.html`, pending: `${SITE}/conta.html`, failure: `${SITE}/conta.html` }, auto_return: 'approved',
        payment_methods: ePix
          ? { installments: 1, excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'prepaid_card' }, { id: 'ticket' }] }
          : { installments: PARCELAS_SEM_JUROS, excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }, { id: 'debit_card' }, { id: 'prepaid_card' }] },
        statement_descriptor: 'APOLOSTUDIO',
      });
      cobranca = c.id; link = c.init_point;
    }
    await db.from('pedidos').update({ cobranca, link_fatura: link }).eq('id', pedido.id);
    return resposta({ pedido: pedido.id, link });
  } catch (e) {
    console.error(e);
    return resposta({ erro: e instanceof Error ? e.message : 'Não foi possível gerar a cobrança.' }, 502);
  }
});
