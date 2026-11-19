import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarAviso, montarLembrete, escapar } from '../supabase/functions/_shared/aviso.js';

const SITE = 'https://apolostudio.com.br';
const cliente = { nome: 'João Lima', email: 'joao@x.com', whatsapp: '(11) 98888-7777' };
const lua = { id: 'abc-123', plano: 'lua', tipo: 'site', forma: 'pix', parcelas: 1, valor: 3800, dominio: 'joaolima.com.br' };

test('assunto do pedido criado', () => {
  assert.equal(montarAviso({ evento: 'criado', pedido: lua, cliente, site: SITE }).assunto, 'Novo pedido (ainda não pago): Site Lua · João Lima');
});

test('assunto do pedido pago, manutenção mensal', () => {
  const plus = { id: 'm1', plano: 'plus', tipo: 'mensal', forma: 'cartao', parcelas: 1, valor: 199 };
  const a = montarAviso({ evento: 'pago', pedido: plus, cliente: { ...cliente, nome: 'Mariana Costa' }, site: SITE });
  assert.equal(a.assunto, 'Pedido pago: Manutenção Plus · Mariana Costa');
  assert.ok(a.texto.includes('R$ 199/mês'));
});

test('corpo traz link para a ficha, forma, domínio e contato', () => {
  const a = montarAviso({ evento: 'criado', pedido: lua, cliente, site: SITE });
  assert.ok(a.html.includes('https://apolostudio.com.br/admin.html#pedido=abc-123'));
  assert.ok(a.texto.includes('Pix'));
  assert.ok(a.texto.includes('joaolima.com.br'));
  assert.ok(a.texto.includes('(11) 98888-7777'));
  const cartao = montarAviso({ evento: 'pago', pedido: { ...lua, forma: 'cartao', parcelas: 6 }, cliente, site: SITE });
  assert.ok(cartao.texto.includes('Cartão em 6x'));
});

test('nome do cliente é escapado no HTML', () => {
  const a = montarAviso({ evento: 'criado', pedido: lua, cliente: { ...cliente, nome: '<b>Ana</b>' }, site: SITE });
  assert.ok(a.html.includes('&lt;b&gt;Ana&lt;/b&gt;'));
  assert.ok(!a.html.includes('<b>Ana</b>'));
  assert.equal(escapar(`a&b"c'`), 'a&amp;b&quot;c&#39;');
});

test('pedido sem cadastro do cliente não quebra', () => {
  assert.equal(montarAviso({ evento: 'pago', pedido: lua, cliente: null, site: SITE }).assunto, 'Pedido pago: Site Lua · cliente sem cadastro');
});

test('lembrete de mensalidade: assunto, valor, link e nome escapado', () => {
  const l = montarLembrete({ pedido: { plano: 'base', valor: 94 }, cliente: { nome: 'Ana <b>Souza' }, vence: '2026-12-18', link: 'https://mp.com/x?a=1&b=2', site: SITE });
  assert.equal(l.assunto, 'Sua mensalidade da Manutenção Base vence em 18/12');
  assert.match(l.texto, /R\$ 94/);
  assert.match(l.html, /href="https:\/\/mp\.com\/x\?a=1&amp;b=2"/);
  assert.ok(!l.html.includes('<b>Souza'));
});
