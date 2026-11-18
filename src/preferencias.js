// Preferências de acessibilidade, guardadas no navegador e aplicadas como classes no <html>.
// A cópia em src/partials/a11y-cedo.html aplica as mesmas classes antes da página aparecer.
export const CHAVE = 'apolo-pref';
export const PADRAO = { texto: 0, contraste: false, movimento: false, links: false };

export function lerPreferencias(storage = globalThis.localStorage) {
  try {
    const p = JSON.parse(storage.getItem(CHAVE)) || {};
    return {
      texto: Math.min(2, Math.max(0, Math.trunc(Number(p.texto)) || 0)),
      contraste: p.contraste === true, movimento: p.movimento === true, links: p.links === true,
    };
  } catch { return { ...PADRAO }; }
}

export function salvarPreferencias(p, storage = globalThis.localStorage) {
  try { storage.setItem(CHAVE, JSON.stringify(p)); } catch {}
}

export const classesDe = p => [
  p.texto ? `a-texto-${p.texto}` : '', p.contraste ? 'a-contraste' : '',
  p.movimento ? 'a-sem-movimento' : '', p.links ? 'a-links' : '',
].filter(Boolean);

export function aplicar(p, html = document.documentElement) {
  html.classList.remove('a-texto-1', 'a-texto-2', 'a-contraste', 'a-sem-movimento', 'a-links');
  html.classList.add(...classesDe(p));
  document.dispatchEvent(new CustomEvent('preferencias', { detail: p }));
}

export const movimentoReduzido = () =>
  lerPreferencias().movimento || matchMedia('(prefers-reduced-motion: reduce)').matches;
