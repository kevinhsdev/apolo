// O ponto que se solta do globo e pousa no ponto do ".com" da busca de domínio.
// Segue a rolagem (é imagem, não texto): ida e volta no mesmo caminho, sem prender nada.
import { L } from './layout.js';
import { tela, faixa, misturar, reduzido } from './rolagem.js';


const IDX = 3; // Apollo 17, de frente quando a Lua sai pelo alto
const curva = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function criarVoo(globo, coreografia, busca) {
  const el = document.querySelector('.ponto-voo');
  const luz = busca.luz;
  const p = {};
  let estado = 'globo';

  function mudar(novo) {
    if (novo === estado) return;
    estado = novo;
    el.classList.toggle('is-voando', novo === 'voando');
    coreografia.segurar(IDX, novo !== 'globo');
    busca.pousar(novo === 'pousado');
  }

  function quadro() {
    if (reduzido) {
      mudar(tela.y > L.busca.topo - tela.h ? 'pousado' : 'globo');
      return;
    }
    const s0 = L.regioes.topo + L.regioes.altura - tela.h * (tela.celular ? 1.05 : 0.8);
    const s1 = L.busca.topo - tela.h * (tela.celular ? 0.58 : 0.62);
    const t = faixa(tela.y, s0, s1);
    if (t <= 0) { mudar('globo'); return; }
    if (t >= 1) { mudar('pousado'); return; }
    mudar('voando');
    globo.projetar(IDX, p);
    const c = luz.getBoundingClientRect();
    const x1 = c.left + c.width / 2;
    const y1 = c.top + c.height / 2;
    const e = curva(t);
    // desce pelo vão à direita do título e cai na vertical no ponto do ".com", entre as letras
    const cx = x1;
    const cy = Math.min(p.y, y1 - tela.h * 0.3);
    const u = 1 - e;
    const x = u * u * p.x + 2 * u * e * cx + e * e * x1;
    const y = u * u * p.y + 2 * u * e * cy + e * e * y1;
    const tam = misturar(7, c.width || 10, e);
    el.style.transform = `translate3d(${(x - tam / 2).toFixed(1)}px, ${(y - tam / 2).toFixed(1)}px, 0)`;
    el.style.width = el.style.height = `${tam.toFixed(1)}px`;
  }

  return { quadro };
}
