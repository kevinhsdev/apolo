// Teste de ponta a ponta da área do cliente contra o Supabase LOCAL, com um Mercado Pago falso.
// 1) npx supabase start   2) npx supabase functions serve --env-file supabase/functions/.env.teste
// 3) node supabase/teste-local.mjs
// Nada vai para o Mercado Pago de verdade: as funções falam com o servidor falso abaixo (porta 9555).
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { CATALOGO, PARCELAS_SEM_JUROS, precoCartao, precoPix } from './functions/_shared/precos.js';

const st = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }).replace(/^[^{]*/, ''));
const URL = st.API_URL, ANON = st.ANON_KEY, SERVICE = st.SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
let falhas = 0;
const ok = (cond, txt) => { console.log(`${cond ? '✓' : '✗'} ${txt}`); if (!cond) falhas++; };

// Mercado Pago falso: guarda o que recebeu e responde como a API; consultas (GET) leem de `consulta`
const recebido = [], consulta = {};
const mp = createServer(async (req, res) => {
  let corpo = ''; for await (const c of req) corpo += c;
  const json = corpo ? JSON.parse(corpo) : null;
  recebido.push({ metodo: req.method, caminho: req.url, corpo: json, token: req.headers.authorization, idem: req.headers['x-idempotency-key'] });
  const r = req.method === 'GET' ? consulta[req.url] ?? {}
    : req.url === '/v1/payments' ? { id: 123, point_of_interaction: { transaction_data: { ticket_url: 'https://mp.teste/pix' } } }
    : req.url === '/checkout/preferences' ? { id: 'pref_teste', init_point: 'https://mp.teste/checkout' }
    : req.url === '/preapproval_plan' ? { id: 'plan_teste', init_point: 'https://mp.teste/assinatura' }
    : {};
  res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(r));
}).listen(9555);

async function usuario(email) {
  await admin.auth.admin.createUser({ email, password: 'senha-teste-123', email_confirm: true });
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: 'senha-teste-123' });
  if (error) throw error;
  return c;
}

// aviso do Mercado Pago, assinado como o painel assina (segredo do .env.teste)
function webhook(tipo, id, segredo = 'teste-webhook') {
  const ts = String(Date.now()), rid = `req-${ts}`;
  const v1 = createHmac('sha256', segredo).update(`id:${id};request-id:${rid};ts:${ts};`).digest('hex');
  return fetch(`${URL}/functions/v1/mercadopago-webhook?data.id=${id}&type=${tipo}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': rid, 'x-signature': `ts=${ts},v1=${v1}` },
    body: JSON.stringify({ type: tipo, data: { id } }),
  });
}

try {
  const sufixo = Date.now();
  const a = await usuario(`a${sufixo}@teste.dev`), b = await usuario(`b${sufixo}@teste.dev`);
  const idA = (await a.auth.getUser()).data.user.id;

  // cadastro
  let r = await a.from('clientes').insert({ id: idA, nome: 'Ana Teste', whatsapp: '11999990000', email: `a${sufixo}@teste.dev`, cpf_cnpj: '52998224725' });
  ok(!r.error, 'cliente grava o próprio cadastro');
  r = await b.from('clientes').select('*').eq('id', idA);
  ok(r.data.length === 0, 'outro cliente não vê o cadastro');

  // pedidos: o navegador não cria nem marca como pago
  r = await a.from('pedidos').insert({ cliente_id: idA, plano: 'orbita', tipo: 'site', forma: 'pix', valor: 1 });
  ok(!!r.error, 'cliente não cria pedido direto (só pelo servidor)');

  // Pix do Órbita com cupom → entrada de 50% do valor calculado no servidor
  r = await a.functions.invoke('criar-cobranca', { body: { plano: 'orbita', forma: 'pix', cupom: 'apolo10', dominio: 'padaria.com.br', valor: 1 } });
  ok(!r.error && r.data?.link === 'https://mp.teste/checkout', 'criar-cobranca devolve o link do Pix');
  const pix = recebido.find(x => x.caminho === '/checkout/preferences')?.corpo;
  ok(pix?.items[0].unit_price === precoPix('orbita', 'APOLO10') / 2 && pix.payment_methods.installments === 1 && pix.payment_methods.excluded_payment_types.some(t => t.id === 'credit_card'), `Pix: entrada de R$ ${pix?.items?.[0]?.unit_price} (50% de R$ ${precoPix('orbita', 'APOLO10')}), sem cartão`);
  ok(pix?.payer?.identification?.number === '52998224725' && recebido[0].token === 'Bearer teste', 'Pix leva CPF e token');
  r = await a.from('pedidos').select('*');
  const pedido = r.data?.[0];
  ok(r.data?.length === 1 && pedido.status === 'aguardando' && pedido.link_fatura && pedido.cobranca === 'pref_teste', 'pedido aparece para o cliente, aguardando pagamento');
  r = await a.from('etapas').select('*').eq('pedido_id', pedido.id);
  ok(r.data?.length === 5, 'etapas do projeto criadas');
  r = await b.from('pedidos').select('*');
  ok(r.data?.length === 0, 'outro cliente não vê o pedido');
  r = await a.from('pedidos').update({ status: 'pago' }).eq('id', pedido.id).select();
  ok(!r.data?.length, 'cliente não consegue se marcar como pago');

  // cartão: Checkout Pro só com cartão, até 6x, total com a taxa repassada
  recebido.length = 0;
  r = await a.functions.invoke('criar-cobranca', { body: { plano: 'lua', forma: 'cartao', parcelas: 9 } });
  const pref = recebido.find(x => x.caminho === '/checkout/preferences')?.corpo;
  const tipos = pref?.payment_methods?.excluded_payment_types?.map(t => t.id) ?? [];
  ok(r.data?.link === 'https://mp.teste/checkout' && pref.items[0].unit_price === precoCartao(precoPix('lua')) && pref.payment_methods.installments === PARCELAS_SEM_JUROS,
    `cartão: total R$ ${pref?.items?.[0]?.unit_price}, até ${pref?.payment_methods?.installments}x`);
  ok(['ticket', 'bank_transfer', 'debit_card'].every(t => tipos.includes(t)), 'cartão: Pix, boleto e débito fora do Checkout');
  // manutenção: 1ª mensalidade no Checkout Pro (Pix ou cartão), sem assinatura
  recebido.length = 0;
  r = await a.functions.invoke('criar-cobranca', { body: { plano: 'plus', forma: 'pix' } });
  const mens = recebido.find(x => x.caminho === '/checkout/preferences')?.corpo;
  ok(mens?.items?.[0]?.unit_price === CATALOGO.plus.mes && /mensalidade/.test(mens.items[0].title) && !recebido.some(x => x.caminho === '/preapproval_plan'),
    `mensalidade no Pix de R$ ${mens?.items?.[0]?.unit_price}`);
  const assinatura = (await a.from('pedidos').select('id').eq('plano', 'plus').single()).data;

  // webhook
  let w = await webhook('payment', '123', 'segredo-errado');
  ok(w.status === 401, 'aviso com assinatura errada é recusado');
  consulta['/v1/payments/123'] = { status: 'approved', external_reference: pedido.id, transaction_amount: 1, installments: 1 };
  await webhook('payment', '123');
  r = await a.from('pedidos').select('status').eq('id', pedido.id).single();
  ok(r.data.status === 'aguardando', 'pagamento com valor menor que o devido não confirma o pedido');
  consulta['/v1/payments/123'].transaction_amount = precoPix('orbita', 'APOLO10') / 2;
  w = await webhook('payment', '123');
  r = await a.from('pedidos').select('status').eq('id', pedido.id).single();
  const e1 = await a.from('etapas').select('feita').eq('pedido_id', pedido.id).eq('ordem', 1).single();
  ok(w.status === 200 && r.data.status === 'pago' && e1.data.feita, 'pagamento confirmado: pedido pago e 1ª etapa concluída');
  consulta['/v1/payments/124'] = { status: 'approved', external_reference: assinatura.id, transaction_amount: CATALOGO.plus.mes, installments: 1, payment_type_id: 'bank_transfer' };
  await webhook('payment', '124');
  r = await a.from('pedidos').select('status, vence_em').eq('id', assinatura.id).single();
  ok(r.data.status === 'pago' && !!r.data.vence_em, `mensalidade paga: manutenção ativa até ${r.data.vence_em}`);
} catch (e) {
  console.error(e); falhas++;
} finally {
  mp.close();
  console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
  process.exit(falhas ? 1 : 0);
}
