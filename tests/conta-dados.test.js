import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECOES, secaoDoHash, projetosAtivos, manutencao, progresso, proximoPasso,
  mascararDoc, montarExportacao, nomePedido, linkProximaEtapa, resultadoLeitura,
} from '../src/paginas/conta-dados.js';

const ped = (o) => ({ id: o.id ?? 'p', tipo: 'site', plano: 'orbita', status: 'pago', criado_em: '2026-11-01T10:00:00Z', link_fatura: null, cobranca: 'mp-123', ...o });
const etapas = (feitas, total) => Array.from({ length: total }, (_, i) => ({ pedido_id: 'p', ordem: i + 1, nome: `Etapa ${i + 1}`, feita: i < feitas, nota: null }));

test('hash vira seção; desconhecido ou vazio abre a visão geral', () => {
  assert.equal(SECOES.length, 8);
  assert.equal(secaoDoHash('#ajuda'), 'ajuda');
  assert.equal(secaoDoHash('#xyz'), 'inicio');
  assert.equal(secaoDoHash(''), 'inicio');
});

test('projetos ativos: só sites pagos, em produção ou entregues, mais recente primeiro', () => {
  const lista = [
    ped({ id: 'a', criado_em: '2026-10-01T00:00:00Z' }),
    ped({ id: 'b', status: 'cancelado' }),
    ped({ id: 'c', status: 'aguardando' }),
    ped({ id: 'd', status: 'em_andamento', criado_em: '2026-11-10T00:00:00Z' }),
    ped({ id: 'e', tipo: 'mensal', plano: 'plus' }),
  ];
  assert.deepEqual(projetosAtivos(lista).map(p => p.id), ['d', 'a']);
});

test('manutenção: ativa, pendente ou nenhuma', () => {
  assert.equal(manutencao([ped({ tipo: 'mensal', status: 'cancelado' })]).estado, 'nenhuma');
  assert.equal(manutencao([ped({ tipo: 'mensal', status: 'aguardando' })]).estado, 'pendente');
  const ativa = manutencao([ped({ id: 'm', tipo: 'mensal', plano: 'plus', status: 'pago' })]);
  assert.equal(ativa.estado, 'ativa');
  assert.equal(ativa.pedido.id, 'm');
});

test('progresso das etapas', () => {
  assert.deepEqual(progresso([]), { feitas: 0, total: 0, pct: 0, atual: null });
  const p = progresso(etapas(2, 5));
  assert.equal(p.pct, 40);
  assert.equal(p.atual.nome, 'Etapa 3');
  assert.equal(progresso(etapas(3, 3)).atual, null);
});

test('próximo passo: pagar ganha de etapa', () => {
  const pendente = ped({ id: 'x', status: 'aguardando', link_fatura: 'https://mp/x', plano: 'lua' });
  const ativo = ped({ id: 'p' });
  assert.deepEqual(proximoPasso([pendente, ativo], etapas(1, 4)), { tipo: 'pagar', texto: 'Conclua o pagamento do Site Lua', link: 'https://mp/x' });
  assert.equal(proximoPasso([ativo], etapas(1, 4)).tipo, 'etapa');
  assert.equal(proximoPasso([ativo], etapas(1, 4)).texto, 'Etapa 2');
  assert.equal(proximoPasso([ativo], etapas(4, 4)).tipo, 'entregue');
  assert.equal(proximoPasso([], []).tipo, 'comecar');
});

test('máscara de CPF e CNPJ', () => {
  assert.equal(mascararDoc('12345678909'), '***.456.***-09');
  assert.equal(mascararDoc('12345678000190'), '**.345.***/****-90');
  assert.equal(mascararDoc(''), '');
  assert.equal(mascararDoc(null), '');
});

test('exportação não leva o código da cobrança', () => {
  const json = montarExportacao({ cliente: { nome: 'Ana' }, pedidos: [ped({})], etapas: etapas(1, 2), email: 'ana@x.com' });
  assert.ok(!json.includes('cobranca'));
  const d = JSON.parse(json);
  assert.equal(d.conta.email, 'ana@x.com');
  assert.equal(d.pedidos.length, 1);
  assert.ok(d.exportado_em);
});

test('nome do pedido', () => {
  assert.equal(nomePedido(ped({ plano: 'orbita' })), 'Site Órbita');
  assert.equal(nomePedido(ped({ tipo: 'mensal', plano: 'plus' })), 'Manutenção Plus');
  assert.equal(nomePedido(ped({ plano: 'zzz' })), 'zzz');
});

test('link dentro da nota da etapa', () => {
  assert.equal(linkProximaEtapa('veja https://previa.apolo.dev/x ok'), 'https://previa.apolo.dev/x');
  assert.equal(linkProximaEtapa('sem link'), null);
  assert.equal(linkProximaEtapa(null), null);
});

test('projeto recém-pago sem etapas não aparece como concluído', () => {
  const p = proximoPasso([ped({ id: 'p', status: 'pago' })], []);
  assert.equal(p.tipo, 'etapa');
  assert.equal(p.texto, 'Estamos preparando as etapas do seu projeto');
});

test('leitura do banco: sessão vencida, falha passageira ou ok', () => {
  assert.equal(resultadoLeitura([null, null]), 'ok');
  assert.equal(resultadoLeitura([{ status: 401, message: 'x' }, null]), 'sessao');
  assert.equal(resultadoLeitura([null, { message: 'JWT expired' }]), 'sessao');
  assert.equal(resultadoLeitura([{ status: 503, message: 'Service Unavailable' }]), 'falha');
  assert.equal(resultadoLeitura([new TypeError('Failed to fetch')]), 'falha');
});
