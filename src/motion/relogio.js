// A hora de quem visita (HH:MM) num display de 7 segmentos, como um relógio digital: cada traço aceso ou apagado.
// Os dois-pontos piscam pelo CSS. Sem script, fica o texto 00:00 do HTML.
const NS = 'http://www.w3.org/2000/svg';
// segmentos a b c d e f g num dígito de 60 x 100
const hor = c => `8,${c} 13,${c - 5} 47,${c - 5} 52,${c} 47,${c + 5} 13,${c + 5}`;
const ver = (v, y1, y2) => `${v},${y1} ${v + 5},${y1 + 5} ${v + 5},${y2 - 5} ${v},${y2} ${v - 5},${y2 - 5} ${v - 5},${y1 + 5}`;
const SEG = [hor(6), ver(54, 8, 48), ver(54, 52, 92), hor(94), ver(6, 52, 92), ver(6, 8, 48), hor(50)];
const MAPA = ['1111110', '0110000', '1101101', '1111001', '0110011', '1011011', '1011111', '1110000', '1111111', '1111011'];

function digito() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-2 0 64 100');
  svg.classList.add('seg7__dig');
  const partes = SEG.map(p => {
    const el = document.createElementNS(NS, 'polygon');
    el.setAttribute('points', p);
    svg.append(el);
    return el;
  });
  return { svg, mostrar: n => partes.forEach((p, i) => p.classList.toggle('aceso', MAPA[n][i] === '1')) };
}

export function iniciarRelogio() {
  const el = document.querySelector('[data-relogio]');
  if (!el) return;
  const visor = document.createElement('span');
  visor.className = 'seg7';
  visor.setAttribute('aria-hidden', 'true');
  const d = [digito(), digito(), digito(), digito()];
  const dois = document.createElement('span');
  dois.className = 'seg7__dois suporte__dois';
  dois.innerHTML = '<i></i><i></i>';
  visor.append(d[0].svg, d[1].svg, dois, d[2].svg, d[3].svg);
  el.replaceChildren(visor);
  const pinta = () => {
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2, '0');
    const mm = String(agora.getMinutes()).padStart(2, '0');
    [...(hh + mm)].forEach((c, i) => d[i].mostrar(+c));
    el.setAttribute('aria-label', `Agora são ${hh}:${mm} aí`);
  };
  pinta();
  setInterval(pinta, 1000);
}
