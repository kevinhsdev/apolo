// Teste de ponta a ponta da área do cliente contra o Supabase LOCAL, com um Asaas falso.
// 1) npx supabase start   2) npx supabase functions serve --env-file supabase/functions/.env.teste
// 3) node supabase/teste-local.mjs
// Nada vai para o Asaas de verdade: as funções falam com o servidor falso abaixo (porta 9555).
import { createServer } from 'node:http';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { precoCartao, precoPix } from './functions/_shared/precos.js';

const st = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }).replace(/^[^{]*/, ''));
const URL = st.API_URL, ANON = st.ANON_KEY, SERVICE = st.SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
let falhas = 0;
const ok = (cond, txt) => { console.log(`${cond ? '✓' : '✗'} ${txt}`); if (!cond) falhas++; };

// Asaas falso: guarda o que recebeu e responde como a API
const recebido = [];
const asaas = createServer(async (req, res) => {
  let corpo = ''; for await (const c of req) corpo += c;
  const json = corpo ? JSON.parse(corpo) : null;
  recebido.push({ metodo: req.method, caminho: req.url, corpo: json, chave: req.headers.access_token });
  const r = req.url.startsWith('/v3/customers') ? { id: 'cus_teste' }
    : req.url.match(/\/v3\/subscriptions\/[^/]+\/payments/) ? { data: [{ id: 'pay_mes', invoiceUrl: 'https://sandbox.asaas.com/i/mes' }] }
    : req.url.startsWith('/v3/subscriptions') ? { id: 'sub_teste' }
    : req.url.startsWith('/v3/payments') ? { id: 'pay_teste', installment: json.installmentCount > 1 ? 'ins_teste' : null, invoiceUrl: 'https://sandbox.asaas.com/i/teste' }
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

try {
  const sufixo = Date.now();
  const a = await usuario(`a${sufixo}@teste.dev`), b = await usuario(`b${sufixo}@teste.dev`);
  const idA = (await a.auth.getUser()).data.user.id;

  // cadastro: o cliente grava o seu, mas não consegue inventar o id do Asaas
  let r = await a.from('clientes').insert({ id: idA, nome: 'Ana Teste', whatsapp: '11999990000', email: `a${sufixo}@teste.dev`, cpf_cnpj: '52998224725', asaas_cliente: 'cus_falso' });
  ok(!r.error, 'cliente grava o próprio cadastro');
  r = await admin.from('clientes').select('asaas_cliente').eq('id', idA).single();
  ok(r.data.asaas_cliente === null, 'id do Asaas vindo do navegador é ignorado');
  r = await b.from('clientes').select('*').eq('id', idA);
  ok(r.data.length === 0, 'outro cliente não vê o cadastro');

  // pedidos: o navegador não cria nem marca como pago
  r = await a.from('pedidos').insert({ cliente_id: idA, plano: 'orbita', tipo: 'site', forma: 'pix', valor: 1 });
  ok(!!r.error, 'cliente não cria pedido direto (só pelo servidor)');

  // cobrança pelo servidor: Pix do Órbita com cupom → entrada de 50% do valor calculado no servidor
  r = await a.functions.invoke('criar-cobranca', { body: { plano: 'orbita', forma: 'pix', cupom: 'apolo10', dominio: 'padaria.com.br', valor: 1 } });
  ok(!r.error && r.data?.link === 'https://sandbox.asaas.com/i/teste', 'criar-cobranca devolve o link do Asaas');
  const pagamento = recebido.find(x => x.caminho === '/v3/payments');
  ok(pagamento?.corpo?.value === precoPix('orbita', 'APOLO10') / 2 && pagamento.corpo.billingType === 'PIX', `Pix: entrada de R$ ${pagamento?.corpo?.value} (50% de R$ ${precoPix('orbita', 'APOLO10')})`);
  ok(recebido.some(x => x.caminho === '/v3/customers' && x.corpo.cpfCnpj === '52998224725'), 'cliente criado no Asaas com o CPF');
  r = await a.from('pedidos').select('*');
  const pedido = r.data?.[0];
  ok(r.data?.length === 1 && pedido.status === 'aguardando' && pedido.link_fatura, 'pedido aparece para o cliente, aguardando pagamento');
  r = await a.from('etapas').select('*').eq('pedido_id', pedido.id);
  ok(r.data?.length === 5, 'etapas do projeto criadas');
  r = await b.from('pedidos').select('*');
  ok(r.data?.length === 0, 'outro cliente não vê o pedido');
  r = await a.from('pedidos').update({ status: 'pago' }).eq('id', pedido.id).select();
  ok(!r.data?.length, 'cliente não consegue se marcar como pago');

  // cartão em 3x: total com a taxa repassada, parcelado no Asaas
  recebido.length = 0;
  r = await a.functions.invoke('criar-cobranca', { body: { plano: 'lua', forma: 'cartao', parcelas: 9 } });
  const cartao = recebido.find(x => x.caminho === '/v3/payments')?.corpo;
  ok(cartao?.billingType === 'CREDIT_CARD' && cartao.installmentCount === 3 && cartao.totalValue === precoCartao(precoPix('lua')), `cartão: 3x (pedido de 9x limitado), total R$ ${cartao?.totalValue}`);

  // manutenção: assinatura mensal no dia 10
  recebido.length = 0;
  r = await a.functions.invoke('criar-cobranca', { body: { plano: 'plus', forma: 'boleto' } });
  const sub = recebido.find(x => x.caminho === '/v3/subscriptions')?.corpo;
  ok(sub?.cycle === 'MONTHLY' && sub.value === 189 && sub.nextDueDate.endsWith('-10') && r.data?.link, `assinatura mensal de R$ ${sub?.value}, vence ${sub?.nextDueDate}`);

  // webhook do Asaas
  const webhook = (corpo, token) => fetch(`${URL}/functions/v1/asaas-webhook`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { 'asaas-access-token': token } : {}) }, body: JSON.stringify(corpo) });
  let w = await webhook({ event: 'PAYMENT_RECEIVED', payment: { externalReference: pedido.id } });
  ok(w.status === 401, 'webhook sem o token do Asaas é recusado');
  w = await webhook({ event: 'PAYMENT_RECEIVED', payment: { externalReference: pedido.id } }, 'teste-webhook');
  r = await a.from('pedidos').select('status').eq('id', pedido.id).single();
  const e1 = await a.from('etapas').select('feita').eq('pedido_id', pedido.id).eq('ordem', 1).single();
  ok(w.status === 200 && r.data.status === 'pago' && e1.data.feita, 'pagamento confirmado: pedido pago e 1ª etapa concluída');
} catch (e) {
  console.error(e); falhas++;
} finally {
  asaas.close();
  console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
  process.exit(falhas ? 1 : 0);
}
