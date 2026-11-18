import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILTROS, noFiltro, contagens, tempoDesde, pedidoDoHash, resumoEtapas, statusPermitidos } from '../src/paginas/admin-dados.js';

const ped = status => ({ id: status, status });
const etapa = (ordem, feita) => ({ ordem, nome: ['Pagamento confirmado', 'Briefing e conteúdo', 'Primeira versão', 'Ajustes', 'Site no ar'][ordem - 1], feita });

test('filtros e contagens', () => {
  assert.deepEqual(FILTROS, ['aguardando', 'producao', 'entregue', 'todos']);
  assert.ok(noFiltro(ped('pago'), 'producao'));
  assert.ok(noFiltro(ped('em_andamento'), 'producao'));
  assert.ok(!noFiltro(ped('aguardando'), 'producao'));
  assert.ok(noFiltro(ped('cancelado'), 'todos'));
  const c = contagens(['aguardando', 'pago', 'em_andamento', 'entregue', 'cancelado'].map(ped));
  assert.deepEqual(c, { aguardando: 1, producao: 2, entregue: 1, todos: 5 });
});

test('há quanto tempo', () => {
  const agora = new Date('2026-11-18T12:00:00Z');
  assert.equal(tempoDesde('2026-11-18T11:59:30Z', agora), 'agora mesmo');
  assert.equal(tempoDesde('2026-11-18T11:55:00Z', agora), 'há 5 min');
  assert.equal(tempoDesde('2026-11-18T10:00:00Z', agora), 'há 2 h');
  assert.equal(tempoDesde('2026-11-15T12:00:00Z', agora), 'há 3 dias');
  assert.equal(tempoDesde('2026-11-17T11:00:00Z', agora), 'há 1 dia');
});

test('pedido pelo endereço', () => {
  assert.equal(pedidoDoHash('#pedido=abc-123'), 'abc-123');
  assert.equal(pedidoDoHash('#xyz'), null);
  assert.equal(pedidoDoHash(''), null);
});

test('resumo das etapas', () => {
  assert.equal(resumoEtapas([etapa(1, true), etapa(2, true), etapa(3, false), etapa(4, false), etapa(5, false)]), 'Primeira versão · 3 de 5');
  assert.equal(resumoEtapas([1, 2, 3, 4, 5].map(o => etapa(o, true))), 'Concluído · 5 de 5');
  assert.equal(resumoEtapas([]), 'Sem etapas');
});

test('status que o admin pode escolher', () => {
  assert.deepEqual(statusPermitidos(ped('aguardando')), []);
  assert.deepEqual(statusPermitidos(ped('cancelado')), []);
  assert.deepEqual(statusPermitidos(ped('pago')), ['pago', 'em_andamento', 'entregue']);
});
