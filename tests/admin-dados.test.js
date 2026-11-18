import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FILTROS, noFiltro, contagens, tempoDesde, pedidoDoHash, resumoEtapas, statusPermitidos,
  faltaRestante, recebimentos, porMes, indicadores, funil, porPlano, alertas, resumoClientes, combina, ordenar, csv, META_MENSAL,
} from '../src/paginas/admin-dados.js';

const ped = status => ({ id: status, status });
const etapa = (ordem, feita) => ({ ordem, nome: ['Pagamento confirmado', 'Briefing e conteúdo', 'Primeira versão', 'Ajustes', 'Site no ar'][ordem - 1], feita });
const agora = new Date('2026-11-18T12:00:00');
const P = o => ({ id: 'x', cliente_id: 'c1', plano: 'orbita', tipo: 'site', forma: 'cartao', parcelas: 1, valor: 1000, status: 'pago', criado_em: '2026-11-10T12:00:00', pago_em: '2026-11-10T12:00:00', restante_em: null, ...o });

test('filtros e contagens', () => {
  assert.deepEqual(FILTROS, ['aguardando', 'producao', 'entregue', 'cancelado', 'todos']);
  assert.ok(noFiltro(ped('pago'), 'producao'));
  assert.ok(noFiltro(ped('em_andamento'), 'producao'));
  assert.ok(!noFiltro(ped('aguardando'), 'producao'));
  assert.ok(noFiltro(ped('cancelado'), 'todos'));
  const c = contagens(['aguardando', 'pago', 'em_andamento', 'entregue', 'cancelado'].map(ped));
  assert.deepEqual(c, { aguardando: 1, producao: 2, entregue: 1, cancelado: 1, todos: 5 });
});

test('há quanto tempo', () => {
  const a = new Date('2026-11-18T12:00:00Z');
  assert.equal(tempoDesde('2026-11-18T11:59:30Z', a), 'agora mesmo');
  assert.equal(tempoDesde('2026-11-18T11:55:00Z', a), 'há 5 min');
  assert.equal(tempoDesde('2026-11-18T10:00:00Z', a), 'há 2 h');
  assert.equal(tempoDesde('2026-11-15T12:00:00Z', a), 'há 3 dias');
  assert.equal(tempoDesde('2026-11-17T11:00:00Z', a), 'há 1 dia');
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

test('recebimentos: Pix conta a entrada e o restante só quando marcado', () => {
  const pix = P({ forma: 'pix', valor: 2000 });
  assert.ok(faltaRestante(pix));
  assert.deepEqual(recebimentos([pix]).map(r => r.valor), [1000]);
  const pago = { ...pix, restante_em: '2026-11-15T12:00:00' };
  assert.ok(!faltaRestante(pago));
  assert.deepEqual(recebimentos([pago]).map(r => r.valor), [1000, 1000]);
  assert.equal(recebimentos([P({ status: 'aguardando' }), P({ status: 'cancelado' })]).length, 0);
  const [cartao] = recebimentos([P({ parcelas: 6, valor: 1000 })]);
  assert.ok(cartao.liquido < 1000 && cartao.liquido > 800);
});

test('receita por mês e indicadores', () => {
  const pedidos = [
    P({ valor: 1000 }),
    P({ valor: 500, criado_em: '2026-10-10T12:00:00', pago_em: '2026-10-10T12:00:00' }),
    P({ tipo: 'mensal', plano: 'base', valor: 94 }),
    P({ status: 'aguardando', pago_em: null, valor: 9999 }),
    P({ forma: 'pix', valor: 2000, status: 'entregue' }),
  ];
  const m = porMes(recebimentos(pedidos), 6, agora);
  assert.equal(m.length, 6);
  assert.equal(m.at(-1).chave, '2026-11');
  assert.equal(m.at(-1).valor, 2094);
  assert.equal(m.at(-2).valor, 500);
  const k = indicadores(pedidos, agora);
  assert.equal(k.recebidoMes, 2094);
  assert.equal(k.mrr, 94);
  assert.equal(k.aReceber, 1000);
  assert.equal(k.meta, Math.min(2094 / META_MENSAL, 1));
  assert.ok(Math.abs(k.variacao - (2094 - 500) / 500) < 1e-9);
  assert.equal(k.conversao, 3 / 4); // o de outubro fica fora dos 30 dias
  assert.equal(k.ticket, (1000 + 500 + 2000) / 3);
});

test('funil e planos', () => {
  const pedidos = [P({ status: 'aguardando' }), P({ status: 'pago' }), P({ status: 'em_andamento', plano: 'lua', valor: 3800 }), P({ status: 'entregue' }), P({ status: 'cancelado', pago_em: null })];
  assert.deepEqual(funil(pedidos).map(f => f.n), [5, 3, 2, 1]);
  const pl = porPlano(pedidos, { lua: 'Lua', orbita: 'Órbita' });
  assert.deepEqual(pl.map(x => [x.nome, x.n, x.valor]), [['Lua', 1, 3800], ['Órbita', 2, 2000]]);
});

test('alertas para crescer', () => {
  const clientes = new Map([['c1', { id: 'c1', nome: 'Ana' }], ['c2', { id: 'c2', nome: 'Beto' }]]);
  const pedidos = [
    P({ id: 'a', status: 'aguardando', pago_em: null, criado_em: '2026-11-16T12:00:00' }),
    P({ id: 'b', status: 'em_andamento', cliente_id: 'c2', pago_em: '2026-11-01T12:00:00' }),
    P({ id: 'c', status: 'entregue', forma: 'pix' }),
    P({ id: 'd', status: 'aguardando', pago_em: null, criado_em: '2026-11-18T11:00:00' }), // recente: sem alerta
  ];
  const etapas = [{ pedido_id: 'b', ordem: 2, feita: false, atualizado_em: '2026-11-02T12:00:00' }];
  const tipos = alertas(pedidos, etapas, clientes, agora).map(a => `${a.tipo}:${a.pedido}`);
  assert.deepEqual(tipos.sort(), ['cobrar:a', 'manutencao:c', 'parado:b', 'restante:c']);
});

test('clientes, busca e ordem', () => {
  const clientes = new Map([['c1', { id: 'c1', nome: 'Ana', criado_em: '2026-11-01' }]]);
  const [c] = resumoClientes(clientes, [P({ valor: 1000 }), P({ tipo: 'mensal', valor: 94 }), P({ status: 'cancelado' })]);
  assert.equal(c.pedidos, 3);
  assert.equal(c.gasto, 1094);
  assert.ok(c.manutencao);
  assert.ok(combina('joao', 'João Silva'));
  assert.ok(combina('', 'x'));
  assert.ok(!combina('maria', 'João', null));
  assert.deepEqual(ordenar([{ v: 2 }, { v: 10 }, { v: 1 }], 'v', 'asc').map(x => x.v), [1, 2, 10]);
  assert.deepEqual(ordenar([{ n: 'b' }, { n: 'á' }], 'n', 'asc').map(x => x.n), ['á', 'b']);
});

test('CSV seguro para o Excel', () => {
  const t = csv([{ a: '=HYPERLINK("x")', b: 'Ana; Silva' }], [{ titulo: 'A', valor: l => l.a }, { titulo: 'B', valor: l => l.b }]);
  assert.ok(t.startsWith('﻿A;B\r\n'));
  assert.ok(t.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(t.includes('"Ana; Silva"'));
});
