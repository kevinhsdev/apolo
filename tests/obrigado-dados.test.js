import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoRetorno } from '../src/paginas/obrigado-dados.js';

const p = status => ({ status });

test('pedido já pago no banco: aprovado, seja qual for o retorno', () => {
  for (const s of ['pago', 'em_andamento', 'entregue']) assert.equal(estadoRetorno({ status: 'rejected' }, p(s)), 'aprovado');
});

test('Mercado Pago aprovou mas o aviso ainda não chegou: confirmando', () => {
  assert.equal(estadoRetorno({ status: 'approved' }, p('aguardando')), 'confirmando');
  assert.equal(estadoRetorno({ preapproval: true }, p('aguardando')), 'confirmando');
});

test('em análise e recusado', () => {
  assert.equal(estadoRetorno({ status: 'pending' }, p('aguardando')), 'analise');
  assert.equal(estadoRetorno({ status: 'in_process' }, p('aguardando')), 'analise');
  assert.equal(estadoRetorno({ status: 'rejected' }, p('aguardando')), 'recusado');
  assert.equal(estadoRetorno({ status: 'null' }, p('aguardando')), 'recusado');
  assert.equal(estadoRetorno({}, p('aguardando')), 'recusado');
  assert.equal(estadoRetorno({ status: 'approved' }, p('cancelado')), 'confirmando');
});

test('sem pedido (sem sessão ou link antigo): genérico', () => {
  assert.equal(estadoRetorno({ status: 'approved' }, null), 'sem-pedido');
});
