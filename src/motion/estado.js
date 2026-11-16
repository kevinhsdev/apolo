// O fio do meio da página: o nome que o visitante digita e o plano que escolhe
// seguem para o resumo dos planos e para o fecho.

export const PLANOS = {
  decolagem: { nome: 'Decolagem', prazo: '7 dias' },
  orbita: { nome: 'Órbita', prazo: '14 dias' },
  lua: { nome: 'Lua', prazo: '21 dias' },
  medida: { nome: 'Sob medida', prazo: '' },
};

const estado = {
  nome: '',
  tld: '.com.br',
  plano: 'orbita',
  ciclo: 'avista',
  precos: {}, // preenchido por planos.js: { orbita: { avista: '2.200', parcelado: '733,33' }, ... }
};
const ouvintes = new Set();

export function definir(parcial) {
  Object.assign(estado, parcial);
  ouvintes.forEach(f => f(estado));
}
export function ouvir(f) {
  ouvintes.add(f);
  f(estado);
}
export const ler = () => estado;
export const dominio = e => `${e.nome || 'seunegocio'}${e.tld}`;
