import '@fontsource-variable/figtree';
import '@fontsource-variable/sora';
import './styles/tokens.css';
import './styles/base.css';
import './sections/nav.css';
import './sections/hero.css';
import './sections/regioes.css';
import './sections/dominio.css';
import './sections/projetos.css';
import './sections/planos.css';
import './sections/migracao.css';
import './sections/numeros.css';
import './sections/suporte.css';
import './sections/fecho.css';
import './estilo.js';

import { aCadaQuadro, tela } from './motion/rolagem.js';
import { fraco, seLento, estaLento } from './desempenho.js';
import { medirTudo, ajustarPalavras } from './motion/layout.js';
import { iniciarToque, montarRola } from './motion/toque.js';
import { numerarLinhas, iniciarRevelar } from './motion/revelar.js';
import { iniciarBusca } from './motion/busca.js';
import { iniciarPlanos } from './motion/planos.js';
import { iniciarMigracao, iniciarPainel } from './motion/migracao.js';
import { iniciarConversa } from './motion/conversa.js';
import { iniciarOferta } from './oferta.js';
import { iniciarProjetos } from './motion/projetos.js';
import { iniciarMetal } from './motion/metal.js';
import { mountCromo } from './components/cromo/cromo-shader.js';
import { iniciarAcoes, iniciarReticula } from './motion/rodape.js';
import { iniciarRelogio } from './motion/relogio.js';
import { iniciarNumeros } from './motion/numeros.js';
import { iniciarNav } from './motion/nav.js';
import { iniciarBarra } from './motion/barra.js';
import { iniciarContato } from './contato.js';

montarRola();
numerarLinhas();
const busca = iniciarBusca();
iniciarPlanos();
iniciarContato();
iniciarMigracao();
iniciarPainel();
iniciarConversa();
iniciarOferta();
iniciarProjetos();
iniciarMetal();

// emblemas dos planos (foguete, órbita, Lua): animam só com os pacotes na tela; em aparelho lento ficam parados
const pacotes = document.querySelector('#pacotes');
if (pacotes) {
  const svgs = [...pacotes.querySelectorAll('svg.emblema')];
  new IntersectionObserver(([e]) => {
    const parar = !e.isIntersecting || document.documentElement.classList.contains('leve');
    pacotes.classList.toggle('is-parado', parar);
    svgs.forEach(s => (parar ? s.pauseAnimations() : s.unpauseAnimations()));
  }, { rootMargin: '100px' }).observe(pacotes);
  seLento(() => { pacotes.classList.add('is-parado'); svgs.forEach(s => s.pauseAnimations()); });
}
const cromo = document.querySelector('[data-cromo]');
// o cromo do cabeçalho fica sempre na tela: em aparelho lento ele não sobe (fica o símbolo liso)
if (cromo && !fraco) {
  const desmontar = mountCromo(cromo, '', { simbolo: document.querySelector('.nav__marca .marca__simbolo').outerHTML });
  seLento(desmontar);
}
iniciarAcoes();
iniciarReticula();
iniciarRelogio();
iniciarToque();
iniciarNav();
iniciarBarra();
iniciarNumeros();
medirTudo();
iniciarRevelar();

// o texto do hero entra quando a fonte chega (ou em 2,5 s, no máximo)
const figtree = Promise.all([document.fonts.load('500 100px "Figtree Variable"'), document.fonts.load('400 100px "Figtree Variable"')]).then(() => document.fonts.ready);
const fontes = Promise.race([figtree, new Promise(ok => setTimeout(ok, 2500))]);
fontes.then(() => medirTudo());
// pré-loader: sai quando a fonte e a Lua chegam (no máximo 4 s); na primeira visita da sessão fica ao menos 1,8 s para a logo se desenhar
const carga = document.querySelector('[data-carga]');
let luaPronta;
const lua = new Promise(ok => { luaPronta = ok; setTimeout(ok, 4000); });
const vista = document.documentElement.classList.contains('carga-vista');
const minimo = new Promise(ok => setTimeout(ok, vista ? 0 : 1800));
Promise.all([fontes, lua, minimo]).then(() => {
  try { sessionStorage.setItem('apolo-carga', '1'); } catch (e) {}
  carga?.classList.add('carga--fora');
  setTimeout(() => carga?.remove(), 700);
  document.documentElement.classList.add('is-pronto');
});

// o domínio do fecho muda de tamanho quando o visitante digita
document.querySelector('.fecho__dominio').addEventListener('mudou', () => ajustarPalavras());

// a Lua vem depois: o texto não espera o Three.js
const canvas = document.querySelector('.globo');
const leve = tela.celular || fraco;
Promise.all([
  import('./motion/globo.js'),
  import('./motion/coreografia.js'),
  import('./motion/voo.js'),
  import('./motion/arrasto.js'),
]).then(([{ criarGlobo }, { criarCoreografia }, { criarVoo }, { criarArrasto }]) => {
  const globo = criarGlobo(canvas, { leve });
  globo.medir(tela.w, tela.h);
  seLento(() => { globo.baixar(); globo.medir(tela.w, tela.h); });
  const coreografia = criarCoreografia(globo);
  const voo = criarVoo(globo, coreografia, busca);
  const arrasto = criarArrasto(coreografia);
  let estavaNaTela = true;
  let meio = false;
  aCadaQuadro((dt, agora) => {
    arrasto.quadro(dt);
    coreografia.quadro(dt, agora);
    voo.quadro();
    const naTela = coreografia.visivel();
    // aparelho lento: a Lua desenha um quadro sim, um não (30 fps), e sobra tempo para a rolagem
    meio = !meio;
    if ((naTela || estavaNaTela) && !(estaLento() && meio && naTela)) globo.desenhar(); // mais um quadro ao sair, para limpar
    estavaNaTela = naTela;
  });
  globo.onPronto = () => {
    canvas.classList.add('is-pronto');
    luaPronta();
    coreografia.acender(performance.now() / 1000);
  };
  document.querySelector('[data-falha]').addEventListener('revelou', () => coreografia.falhar(), { once: true });
  fontes.then(() => { medirTudo(); coreografia.remedir(); });
  let largura = tela.w;
  window.addEventListener('resize', () => {
    const w = document.documentElement.clientWidth;
    if (tela.celular && w === largura) return;
    largura = w;
    medirTudo();
    coreografia.remedir();
    globo.medir(tela.w, tela.h);
  });
}).catch(() => {
  busca.pousar(true); // sem WebGL: só o ponto do ".com" aceso
});

if (!window.WebGLRenderingContext) busca.pousar(true);
