// Botão de acessibilidade (todas as páginas): texto maior, alto contraste, menos animação, links sublinhados.
// montarPainelPreferencias também é usado na seção Preferências da área do cliente.
import './acessibilidade.css';
import { PADRAO, lerPreferencias, salvarPreferencias, aplicar } from './preferencias.js';

const TEXTOS = ['Normal', 'Maior', 'Muito maior'];
const CHAVES = [
  ['contraste', 'Alto contraste', 'Textos e bordas mais fortes.'],
  ['movimento', 'Reduzir animações', 'Para a Lua, o metal e os efeitos ao rolar (vale ao recarregar).'],
  ['links', 'Sublinhar links', 'Deixa claro o que é clicável.'],
];

export function montarPainelPreferencias(container) {
  const desenhar = () => {
    const p = lerPreferencias();
    container.replaceChildren();
    const grupo = document.createElement('div');
    grupo.className = 'pref__grupo';
    grupo.setAttribute('role', 'radiogroup');
    grupo.setAttribute('aria-label', 'Tamanho do texto');
    grupo.innerHTML = '<p class="pref__rotulo">Tamanho do texto</p>';
    const opcoes = document.createElement('div');
    opcoes.className = 'pref__opcoes';
    TEXTOS.forEach((nome, i) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'pref__opcao', textContent: nome });
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(p.texto === i));
      b.style.setProperty('--tam', `${1 + i * 0.125}em`);
      b.addEventListener('click', () => mudar({ texto: i }));
      opcoes.append(b);
    });
    grupo.append(opcoes);
    container.append(grupo);
    CHAVES.forEach(([chave, nome, ajuda]) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'pref__chave' });
      b.setAttribute('role', 'switch');
      b.setAttribute('aria-checked', String(p[chave]));
      b.innerHTML = `<span class="pref__texto"><strong></strong><small></small></span><span class="pref__trilho" aria-hidden="true"><span></span></span>`;
      b.querySelector('strong').textContent = nome;
      b.querySelector('small').textContent = ajuda;
      b.addEventListener('click', () => mudar({ [chave]: !p[chave] }));
      container.append(b);
    });
    const rodape = document.createElement('div');
    rodape.className = 'pref__rodape';
    rodape.innerHTML = '<button type="button" class="pref__restaurar">Restaurar padrão</button><a class="pref__sobre" href="./acessibilidade.html">Sobre a acessibilidade</a>';
    rodape.querySelector('button').addEventListener('click', () => mudar(PADRAO, true));
    container.append(rodape);
  };
  const mudar = (parte, trocar) => {
    const p = trocar ? { ...parte } : { ...lerPreferencias(), ...parte };
    salvarPreferencias(p);
    aplicar(p);
  };
  document.addEventListener('preferencias', () => {
    const foco = document.activeElement && container.contains(document.activeElement)
      ? [...container.querySelectorAll('button')].indexOf(document.activeElement) : -1;
    desenhar();
    if (foco >= 0) container.querySelectorAll('button')[foco]?.focus();
  });
  desenhar();
}

function montarBotao() {
  const botao = Object.assign(document.createElement('button'), { type: 'button', className: 'a11y-botao' });
  botao.setAttribute('aria-label', 'Acessibilidade');
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', 'a11y-painel');
  botao.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5c2.3.7 4.6 1 7 1s4.7-.3 7-1M12 9.5V14m0 0-3 6.5M12 14l3 6.5"/></svg>';
  const painel = Object.assign(document.createElement('div'), { id: 'a11y-painel', className: 'a11y-painel', hidden: true });
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-labelledby', 'a11y-titulo');
  painel.innerHTML = '<div class="a11y-painel__topo"><h2 id="a11y-titulo">Acessibilidade</h2><button type="button" class="a11y-painel__fechar" aria-label="Fechar">×</button></div><div class="pref"></div>';
  montarPainelPreferencias(painel.querySelector('.pref'));
  const abrir = sim => {
    painel.hidden = !sim;
    botao.setAttribute('aria-expanded', String(sim));
    if (sim) painel.querySelector('.pref button')?.focus(); else botao.focus();
  };
  botao.addEventListener('click', () => abrir(painel.hidden));
  painel.querySelector('.a11y-painel__fechar').addEventListener('click', () => abrir(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !painel.hidden) abrir(false); });
  document.addEventListener('pointerdown', e => {
    if (!painel.hidden && !painel.contains(e.target) && !botao.contains(e.target)) abrir(false);
  });
  document.body.append(botao, painel);
}

if (typeof document !== 'undefined') montarBotao();
