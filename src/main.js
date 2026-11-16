import '@fontsource-variable/figtree';
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
fontes.then(() => document.documentElement.classList.add('is-pronto'));

// o domínio do fecho muda de tamanho quando o visitante digita
document.querySelector('.fecho__dominio').addEventListener('mudou', () => ajustarPalavras());

// a Lua vem depois: o texto não espera o Three.js
const canvas = document.querySelector('.globo');
const leve = tela.celular || (navigator.hardwareConcurrency || 8) <= 4;
Promise.all([
  import('./motion/globo.js'),
  import('./motion/coreografia.js'),
  import('./motion/voo.js'),
  import('./motion/arrasto.js'),
]).then(([{ criarGlobo }, { criarCoreografia }, { criarVoo }, { criarArrasto }]) => {
  const globo = criarGlobo(canvas, { leve });
  globo.medir(tela.w, tela.h);
  const coreografia = criarCoreografia(globo);
  const voo = criarVoo(globo, coreografia, busca);
  const arrasto = criarArrasto(coreografia);
  let estavaNaTela = true;
  aCadaQuadro((dt, agora) => {
    arrasto.quadro(dt);
    coreografia.quadro(dt, agora);
    voo.quadro();
    const naTela = coreografia.visivel();
    if (naTela || estavaNaTela) globo.desenhar(); // mais um quadro ao sair, para limpar
    estavaNaTela = naTela;
  });
  globo.onPronto = () => {
    canvas.classList.add('is-pronto');
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
