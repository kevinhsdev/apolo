// Para onde a Lua vai em cada ponto da rolagem: posição, tamanho e giro.
// A página nunca para: a Lua é uma camada fixa que sobe mais devagar que o conteúdo.
import { L } from './layout.js';
import { tela, amortecer, limitar, suave, misturar, faixa, reduzido } from './rolagem.js';

// quadros-chave: s = posição da rolagem (px); o resto é o estado do globo
function quadros() {
  // a Lua fica no hero e sobe mais devagar que a página até sair pelo alto
  const { h: H } = tela;
  const { cx, cy, d } = L.hero;
  const r = d / 2;
  return [
    { s: 0, cx, cy, r, lat: -6, lon: -22 },
    { s: H * 0.9, cx: cx + r * 0.08, cy: -r - 80, r: r * 0.92, lat: 4, lon: 30 },
  ];
}

function interpolar(qs, s) {
  if (s <= qs[0].s) return { ...qs[0] };
  for (let i = 1; i < qs.length; i++) {
    if (s <= qs[i].s) {
      const a = qs[i - 1];
      const b = qs[i];
      const t = suave(limitar((s - a.s) / (b.s - a.s)));
      const o = {};
      for (const k of ['cx', 'cy', 'r', 'lat', 'lon']) o[k] = misturar(a[k], b[k], t);
      return o;
    }
  }
  return { ...qs[qs.length - 1] };
}

export function criarCoreografia(globo) {
  let qs = quadros();
  const atual = interpolar(qs, tela.y);
  const aplicado = {};
  const giro = { lat: 0, lon: 0 }; // somado ao roteiro quando a mão gira o globo no hero

  function remedir() { qs = quadros(); }

  let ultimoY = tela.y;
  function quadro(dt, agora) {
    let alvo = interpolar(qs, tela.y);
    // salto grande (âncora, recarregar no meio): o globo vai direto, sem atravessar a tela
    const salto = Math.abs(tela.y - ultimoY) > tela.h * 1.5;
    ultimoY = tela.y;
    // balanço lento e limitado (nunca acumula): o globo está vivo mesmo parado
    alvo.lon += reduzido ? 0 : Math.sin(agora * 0.16) * 4;
    const k = reduzido || salto ? 1e3 : 7.5;
    for (const c of ['cx', 'cy', 'r', 'lat', 'lon']) atual[c] = amortecer(atual[c], alvo[c], k, dt);
    // o giro da mão (arrasto.js) entra por cima do roteiro, sem suavização: o globo segue o dedo
    aplicado.cx = atual.cx;
    aplicado.cy = atual.cy;
    aplicado.r = atual.r;
    aplicado.lat = atual.lat + giro.lat;
    aplicado.lon = atual.lon + giro.lon;
    globo.aplicar(aplicado);

    // sem pontos acesos: a luz laranja do hero é o satélite da órbita
    document.documentElement.style.setProperty('--rolou', Math.min(1, tela.y / (tela.h * 0.35)).toFixed(3));
  }

  const visivel = () => atual.cy + atual.r > -80 && atual.cy - atual.r < tela.h + 80;

  return { quadro, remedir, visivel, atual, giro };
}
