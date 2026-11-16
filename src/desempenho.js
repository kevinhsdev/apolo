// Quanto o aparelho aguenta. "fraco" já na largada só nos casos claros (sem placa de vídeo, economia de dados,
// 2 núcleos ou menos, 2 GB ou menos). O número de núcleos sozinho não serve: o Brave o sorteia (2 a 8) por privacidade.
// Nos outros, mede os quadros depois que a Lua carregou: abaixo de 30 fps, os enfeites pesados desligam.
const nav = navigator;
// sem placa de vídeo de verdade (o navegador desenha no processador): SwiftShader, Basic Render Driver, llvmpipe
function semPlaca() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return true;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const nome = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|basic render|llvmpipe|software/i.test(nome);
  } catch { return true; }
}
export const fraco = (nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory || 8) <= 2 || nav.connection?.saveData === true || semPlaca();

let lento = fraco;
const avisos = new Set();
const virarLento = () => {
  if (lento && avisos.size === 0) return;
  lento = true;
  document.documentElement.classList.add('leve');
  avisos.forEach(f => f());
  avisos.clear();
};

/** o aparelho já se mostrou lento? */
export const estaLento = () => lento;

/** chama f agora se o aparelho é lento, ou quando a medição descobrir que é */
export function seLento(f) {
  if (lento) f();
  else avisos.add(f);
}

if (fraco) document.documentElement.classList.add('leve');

// Mede 3 s de quadros válidos. Intervalos acima de 250 ms são a aba em segundo plano ou a janela coberta (o navegador
// freia de propósito), não lentidão: ficam de fora. Lento = mediana acima de 33 ms (< 30 fps).
let medindo = false;
function medir() {
  if (fraco || medindo) return;
  medindo = true;
  const dts = [];
  let antes = 0;
  const inicio = performance.now();
  const passo = t => {
    if (antes && !document.hidden) { const dt = t - antes; if (dt < 250) dts.push(dt); }
    antes = t;
    const somado = dts.reduce((a, b) => a + b, 0);
    if (somado < 3000 && t - inicio < 10000) return requestAnimationFrame(passo);
    if (dts.length < 30) return; // quase tudo freado: não dá para saber, fica como está
    dts.sort((a, b) => a - b);
    if (dts[dts.length >> 1] > 33) virarLento();
  };
  requestAnimationFrame(passo);
}

/** começa a medir 1,5 s depois que o pesado (as texturas da Lua) carregou; sem esse aviso, mede aos 15 s */
export const podeMedir = () => setTimeout(medir, 1500);
setTimeout(medir, 15000);
