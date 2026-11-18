// Botão Mercúrio (ProfitizeBuild): anel de metal líquido em shader correndo pela borda da pílula.
// Até o shader subir, um anel liso de 1 px segura o lugar. Tinta do metal no tom de luz da Apolo.
import { movimentoReduzido } from '../preferencias.js';
import {
  ShaderMount,
  liquidMetalFragmentShader,
  toProcessedLiquidMetal,
  getShaderColorFromString,
  ShaderFitOptions,
  LiquidMetalShapes,
} from '@paper-design/shaders';
import { fraco, seLento } from '../desempenho.js';

function ringMask(w, h, ring) {
  const k = 4;
  const c = new OffscreenCanvas(Math.round(w * k), Math.round(h * k));
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.beginPath();
  x.roundRect(0, 0, c.width, c.height, c.height / 2);
  x.fill();
  const t = ring * k;
  x.globalCompositeOperation = 'destination-out';
  x.beginPath();
  x.roundRect(t, t, c.width - t * 2, c.height - t * 2, c.height / 2 - t);
  x.fill();
  return c;
}

const cache = new Map();
let queue = Promise.resolve();
function processed(w, h, ring) {
  const key = `${w}x${h}:${ring}`;
  let p = cache.get(key);
  if (!p) {
    p = queue.then(async () => {
      const blob = await ringMask(w, h, ring).convertToBlob({ type: 'image/png' });
      const { pngBlob } = await toProcessedLiquidMetal(new File([blob], 'mask.png', { type: 'image/png' }));
      const img = new Image();
      img.src = URL.createObjectURL(pngBlob);
      await img.decode();
      return img;
    });
    queue = p.catch(() => {});
    cache.set(key, p);
  }
  return p;
}

async function mountMetalRing(el) {
  const image = await processed(el.offsetWidth, el.offsetHeight, 2);
  if (!el.isConnected) return () => {};
  const still = movimentoReduzido();
  const mount = new ShaderMount(
    el,
    liquidMetalFragmentShader,
    {
      u_colorBack: getShaderColorFromString('rgba(0,0,0,0)'),
      u_colorTint: getShaderColorFromString('#f6ece6'),
      u_image: image,
      u_isImage: true,
      u_shape: LiquidMetalShapes.none,
      u_repetition: 1.5,
      u_softness: 0.15,
      u_shiftRed: 0.3,
      u_shiftBlue: 0.3,
      u_distortion: 0.08,
      u_contour: 0.2,
      u_angle: 90,
      u_fit: ShaderFitOptions.contain,
      u_scale: 1,
      u_rotation: 0,
      u_offsetX: 0,
      u_offsetY: 0,
      u_originX: 0.5,
      u_originY: 0.5,
      u_worldWidth: 0,
      u_worldHeight: 0,
    },
    undefined,
    still ? 0 : 1,
    0,
    2,
    undefined,
    ['u_image'],
  );
  el.classList.add('is-ready');
  return () => {
    const gl = mount.canvasElement.getContext('webgl2');
    mount.dispose();
    gl?.getExtension('WEBGL_lose_context')?.loseContext(); // libera o contexto na hora
    el.classList.remove('is-ready');
  };
}

// Cada anel é um contexto WebGL animando sem parar; com uns 20 botões na página, isso derrubava PCs medianos.
// Agora o anel só existe enquanto o botão está na tela (sai da tela, desmonta) e, em aparelho lento, nem sobe:
// fica o anel liso de 1 px.
export function iniciarMetal(root = document) {
  if (typeof OffscreenCanvas === 'undefined' || fraco) return;
  const vivos = new Map(); // el -> promessa da função de desmontar
  let desligado = false;
  const io = new IntersectionObserver(entradas => {
    for (const e of entradas) {
      const el = e.target;
      if (e.isIntersecting && el.offsetWidth > 0 && !vivos.has(el)) {
        vivos.set(el, mountMetalRing(el).catch(err => { console.warn('metal: ficou o anel liso', err); return () => {}; }));
      } else if (!e.isIntersecting && vivos.has(el)) {
        vivos.get(el).then(d => d());
        vivos.delete(el);
      }
    }
  }, { rootMargin: '120px' });
  root.querySelectorAll('.metal-btn__metal').forEach(el => io.observe(el));
  seLento(() => {
    if (desligado) return;
    desligado = true;
    io.disconnect();
    vivos.forEach(p => p.then(d => d()));
    vivos.clear();
  });
}
