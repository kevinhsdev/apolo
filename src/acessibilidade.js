// Botão de acessibilidade (todas as páginas): tema, texto maior, alto contraste, menos animação, links sublinhados.
// montarPainelPreferencias também é usado na seção Preferências da área do cliente.
import './acessibilidade.css';
import { PADRAO, lerPreferencias, salvarPreferencias, aplicar, temTema } from './preferencias.js';

const TEXTOS = ['Normal', 'Maior', 'Muito maior'];
const TEMAS = [['escuro', 'Escuro'], ['claro', 'Claro'], ['auto', 'Automático']];
const CHAVES = [
  ['contraste', 'Alto contraste', 'Textos e bordas mais fortes.'],
  ['movimento', 'Reduzir animações', 'Para a Lua, o metal e os efeitos ao rolar (vale ao recarregar).'],
  ['links', 'Sublinhar links', 'Deixa claro o que é clicável.'],
];

export function montarPainelPreferencias(container) {
  // grupo de botões de escolha única (tema, tamanho do texto)
  const escolha = (rotulo, itens, ajuda) => {
    const grupo = document.createElement('div');
    grupo.className = 'pref__grupo';
    grupo.setAttribute('role', 'radiogroup');
    grupo.setAttribute('aria-label', rotulo);
    const r = Object.assign(document.createElement('p'), { className: 'pref__rotulo', textContent: rotulo });
    const opcoes = document.createElement('div');
    opcoes.className = 'pref__opcoes';
    itens.forEach(({ nome, ativo, aoEscolher, tam }) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'pref__opcao', textContent: nome });
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(ativo));
      if (tam) b.style.setProperty('--tam', tam);
      b.addEventListener('click', aoEscolher);
      opcoes.append(b);
    });
    grupo.append(r, opcoes);
    if (ajuda) grupo.append(Object.assign(document.createElement('p'), { className: 'pref__ajuda', textContent: ajuda }));
    container.append(grupo);
  };
  const desenhar = () => {
    const p = lerPreferencias();
    container.replaceChildren();
    if (temTema()) {
      escolha('Tema', TEMAS.map(([id, nome]) => ({ nome, ativo: p.tema === id, aoEscolher: () => mudar({ tema: id }) })),
        p.tema === 'auto' ? 'Segue o modo claro ou escuro do seu aparelho.' : '');
    }
    escolha('Tamanho do texto', TEXTOS.map((nome, i) => ({ nome, ativo: p.texto === i, tam: `${1 + i * 0.125}em`, aoEscolher: () => mudar({ texto: i }) })));
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

// botões de trocar o tema (ex.: no cabeçalho da página inicial): alterna entre claro e escuro
function ligarTrocaTema() {
  const botoes = document.querySelectorAll('[data-trocar-tema]');
  if (!botoes.length) return;
  const claro = () => document.documentElement.classList.contains('t-claro');
  const rotular = () => botoes.forEach(b => {
    const texto = claro() ? 'Usar tema escuro' : 'Usar tema claro';
    b.setAttribute('aria-label', texto);
    b.title = texto;
  });
  botoes.forEach(b => b.addEventListener('click', () => {
    const p = { ...lerPreferencias(), tema: claro() ? 'escuro' : 'claro' };
    salvarPreferencias(p);
    aplicar(p);
  }));
  document.addEventListener('preferencias', rotular);
  rotular();
}

if (typeof document !== 'undefined') { montarBotao(); ligarTrocaTema(); }
