import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO, lerPreferencias, salvarPreferencias, classesDe } from '../src/preferencias.js';

const guarda = (valor = null) => ({ getItem: () => valor, setItem() {} });
const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };

test('sem nada guardado, usa o padrão', () => {
  assert.deepEqual(lerPreferencias(guarda()), PADRAO);
});

test('corrige valores fora do lugar', () => {
  assert.deepEqual(lerPreferencias(guarda('{"texto":5,"contraste":true}')),
    { texto: 2, contraste: true, movimento: false, links: false, tema: 'escuro' });
  assert.equal(lerPreferencias(guarda('{"tema":"roxo"}')).tema, 'escuro');
  assert.equal(lerPreferencias(guarda('{"tema":"auto"}')).tema, 'auto');
});

test('JSON quebrado volta ao padrão', () => {
  assert.deepEqual(lerPreferencias(guarda('xx')), PADRAO);
});

test('armazenamento bloqueado não quebra a leitura nem a gravação', () => {
  assert.deepEqual(lerPreferencias(quebrado), PADRAO);
  assert.doesNotThrow(() => salvarPreferencias(PADRAO, quebrado));
});

test('classes para o <html>', () => {
  assert.deepEqual(classesDe({ texto: 1, contraste: true, movimento: true, links: false }),
    ['a-texto-1', 'a-contraste', 'a-sem-movimento']);
  assert.deepEqual(classesDe(PADRAO), []);
});

test('tema claro: escolhido, ou automático com o sistema no claro', () => {
  assert.deepEqual(classesDe({ ...PADRAO, tema: 'claro' }), ['t-claro']);
  assert.deepEqual(classesDe({ ...PADRAO, tema: 'auto' }, true), ['t-claro']);
  assert.deepEqual(classesDe({ ...PADRAO, tema: 'auto' }, false), []);
  assert.deepEqual(classesDe({ ...PADRAO, tema: 'escuro' }, true), []);
});

test('localStorage do navegador bloqueado (getter que lança) não derruba a página', () => {
  const antes = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    assert.deepEqual(lerPreferencias(), PADRAO);
    assert.doesNotThrow(() => salvarPreferencias(PADRAO));
  } finally {
    if (antes) Object.defineProperty(globalThis, 'localStorage', antes); else delete globalThis.localStorage;
  }
});
