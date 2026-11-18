// Preferências de acessibilidade e tema, guardadas no navegador e aplicadas como classes no <html>.
// A cópia em src/partials/a11y-cedo.html aplica as mesmas classes antes da página aparecer.
// O tema só vale nas páginas com <html data-com-tema> (área do cliente, pagamento, admin, textos);
// a página inicial fica sempre escura (a Lua e o cromo são feitos para o preto).
export const CHAVE = 'apolo-pref';
export const TEMAS = ['escuro', 'claro', 'auto'];
export const PADRAO = { texto: 0, contraste: false, movimento: false, links: false, tema: 'escuro' };

// o acesso a localStorage fica dentro do try: com cookies bloqueados, só ler a propriedade já lança
export function lerPreferencias(storage) {
  try {
    const p = JSON.parse((storage ?? globalThis.localStorage).getItem(CHAVE)) || {};
    return {
      texto: Math.min(2, Math.max(0, Math.trunc(Number(p.texto)) || 0)),
      contraste: p.contraste === true, movimento: p.movimento === true, links: p.links === true,
      tema: TEMAS.includes(p.tema) ? p.tema : 'escuro',
    };
  } catch { return { ...PADRAO }; }
}

export function salvarPreferencias(p, storage) {
  try { (storage ?? globalThis.localStorage).setItem(CHAVE, JSON.stringify(p)); } catch {}
}

const sistemaClaro = () => globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;

export const classesDe = (p, claroDoSistema = sistemaClaro()) => [
  p.texto ? `a-texto-${p.texto}` : '', p.contraste ? 'a-contraste' : '',
  p.movimento ? 'a-sem-movimento' : '', p.links ? 'a-links' : '',
  p.tema === 'claro' || (p.tema === 'auto' && claroDoSistema) ? 't-claro' : '',
].filter(Boolean);

export const temTema = (html = document.documentElement) => html.hasAttribute('data-com-tema');

export function aplicar(p, html = document.documentElement) {
  html.classList.remove('a-texto-1', 'a-texto-2', 'a-contraste', 'a-sem-movimento', 'a-links', 't-claro');
  html.classList.add(...classesDe(p).filter(c => c !== 't-claro' || temTema(html)));
  html.style.background = '';
  // barra do navegador no celular na cor do fundo
  if (temTema(html)) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', html.classList.contains('t-claro') ? '#f5f5f3' : '#0a0a0a');
  document.dispatchEvent(new CustomEvent('preferencias', { detail: p }));
}

// no automático, acompanha o sistema quando ele troca de claro para escuro
globalThis.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
  if (lerPreferencias().tema === 'auto') aplicar(lerPreferencias());
});

export const movimentoReduzido = () =>
  lerPreferencias().movimento || matchMedia('(prefers-reduced-motion: reduce)').matches;
