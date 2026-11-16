import '@fontsource-variable/figtree';
import '../styles/tokens.css';
import '../styles/base.css';
import './simples.css';
import '../sections/projetos.css';
import '../estilo.js';
import { montarRola } from '../motion/toque.js';
import { PROJETOS, montarVitrine } from '../projetos.js';
import { iniciarMetal } from '../motion/metal.js';

montarVitrine(document.querySelector('[data-biblioteca]'), Math.max(6, PROJETOS.length), './#pacotes');
document.querySelector('[data-total]').textContent = PROJETOS.length;
montarRola();
iniciarMetal();
