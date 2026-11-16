// Quanto o aparelho aguenta. "fraco" já na largada (poucos núcleos, pouca memória, economia de dados);
// nos outros, mede os quadros depois que a página assenta: abaixo de ~40 fps, os enfeites pesados desligam.
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
export const fraco = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) < 4 || nav.connection?.saveData === true || semPlaca();

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
else {
  // espera 4 s (carregamento, texturas) e soma 3 s de quadros válidos. Intervalos acima de 250 ms são a aba em segundo plano
  // ou a janela coberta (o navegador freia de propósito), não lentidão: ficam de fora. Lento = mediana acima de 25 ms (< 40 fps).
  setTimeout(() => {
    const dts = [];
    let antes = 0;
    const passo = t => {
      if (antes && !document.hidden) { const dt = t - antes; if (dt < 250) dts.push(dt); }
      antes = t;
      const somado = dts.reduce((a, b) => a + b, 0);
      if (somado < 3000 && t - inicio < 10000) return requestAnimationFrame(passo);
      if (dts.length < 10) return; // quase tudo freado: não dá para saber, fica como está
      dts.sort((a, b) => a - b);
      if (dts[dts.length >> 1] > 25) virarLento();
    };
    const inicio = performance.now();
    requestAnimationFrame(passo);
  }, 4000);
}
