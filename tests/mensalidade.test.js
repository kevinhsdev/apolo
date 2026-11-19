import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proximoVencimento, renovacoesDevidas, mensalidadesVigentes, planoCancelamento } from '../supabase/functions/_shared/mensalidade.js';

test('vencimento: um mês depois, sem pular para o mês seguinte', () => {
  assert.equal(proximoVencimento('2026-11-18'), '2026-12-18');
  assert.equal(proximoVencimento('2026-12-20T10:00:00Z'), '2027-01-20');
  assert.equal(proximoVencimento('2027-01-31'), '2027-02-28');
  assert.equal(proximoVencimento('2028-01-31'), '2028-02-29');
});

const M = (id, status, vence_em, renova_de = null) => ({ id, tipo: 'mensal', status, vence_em, renova_de });

test('renova só o que vence em até 3 dias e ainda não foi renovado', () => {
  const hoje = new Date('2026-12-15T12:00:00Z');
  const pedidos = [
    M('a', 'pago', '2026-12-18'),             // vence em 3 dias: renova
    M('b', 'pago', '2026-12-25'),             // longe ainda
    M('c', 'pago', '2026-12-10'),             // já tem o mês seguinte
    M('c2', 'aguardando', null, 'c'),
    M('d', 'aguardando', null),               // nunca foi paga
    M('e', 'pago', '2026-12-16'),             // filho cancelado pelo admin: para a cadeia
    M('e2', 'cancelado', null, 'e'),
    { id: 's', tipo: 'site', status: 'pago', vence_em: '2026-12-16' },
  ];
  assert.deepEqual(renovacoesDevidas(pedidos, hoje).map(p => p.id), ['a']);
});

test('vigente: a última paga de cada cadeia', () => {
  const pedidos = [M('a', 'pago', '2026-12-18'), M('a2', 'pago', '2027-01-18', 'a'), M('a3', 'aguardando', null, 'a2'), M('b', 'pago', '2026-12-01')];
  assert.deepEqual(mensalidadesVigentes(pedidos).map(p => p.id), ['a2', 'b']);
});

test('cancelamento: fecha o aberto, ou encerra a paga; nada a fazer se já encerrada', () => {
  const paga = M('a', 'pago', '2026-12-18');
  assert.equal(planoCancelamento([paga]).acao, 'encerrar');
  assert.equal(planoCancelamento([paga]).pedido.id, 'a');
  const aberta = M('a2', 'aguardando', null, 'a');
  assert.deepEqual([planoCancelamento([paga, aberta]).acao, planoCancelamento([paga, aberta]).pedido.id], ['cancelar', 'a2']);
  assert.equal(planoCancelamento([paga, M('a2', 'cancelado', null, 'a')]), null);
  assert.equal(planoCancelamento([M('x', 'aguardando', null)]).acao, 'cancelar');
  assert.equal(planoCancelamento([]), null);
});
