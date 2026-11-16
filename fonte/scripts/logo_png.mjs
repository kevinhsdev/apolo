// Gera os PNGs da marca a partir do SVG (pasta ideia/logo e os ícones do site), com o Chrome instalado.
// Rode: node fonte/scripts/logo_png.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const AQUI = import.meta.dirname, LOGO = resolve(AQUI, '../../../logo'), SITE = resolve(AQUI, '../..');
const SIMBOLO = '<path d="M318 241h100l97 169-25 45L367.5 302 245 455l-25-45z"/><path d="M245 455Q367.5 355 490 455l-20 38Q367.5 407 265 493z"/>';
const FONTE = `@font-face{font-family:F;src:url('file:///${SITE.replace(/\\/g, '/')}/node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2') format('woff2');font-weight:300 900}`;
const svg = (cor, larg) => `<svg viewBox="210 226 315 280" style="width:${larg}px;fill:${cor};display:block">${SIMBOLO}</svg>`;
const pagina = (w, h, fundo, miolo) => `<!doctype html><html><head><style>${FONTE}html,body{margin:0;width:${w}px;height:${h}px;background:${fundo};overflow:hidden}
body{display:flex;align-items:center;justify-content:center;gap:120px;font:600 330px/1 F;letter-spacing:-.045em}</style></head><body>${miolo}</body></html>`;
const trava = cor => `${svg(cor, 400)}<span style="color:${cor};margin-top:-40px">apolo</span>`;

const SAIDAS = [
  [join(LOGO, 'apolo-logo-fundo-preto.png'), 2000, 700, '#000', trava('#fff')],
  [join(LOGO, 'apolo-logo-branco-transparente.png'), 2000, 700, 'transparent', trava('#fff')],
  [join(LOGO, 'apolo-logo-preto-transparente.png'), 2000, 700, 'transparent', trava('#000')],
  [join(LOGO, 'apolo-icone-branco.png'), 1024, 1024, '#fff', svg('#000', 600)],
  [join(LOGO, 'apolo-perfil-instagram.png'), 1080, 1080, '#000', svg('#fff', 600)],
];

const pasta = mkdtempSync(join(tmpdir(), 'apolo-logo-'));
const foto = (arq, w, h, html) => {
  const f = join(pasta, 'p.html'); writeFileSync(f, html);
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--default-background-color=00000000', `--window-size=${w},${h}`,
    '--allow-file-access-from-files', '--virtual-time-budget=2000', `--screenshot=${arq}`, `file:///${f.replace(/\\/g, '/')}`], { stdio: 'ignore' });
  console.log('ok', arq);
};
for (const [arq, w, h, fundo, miolo] of SAIDAS) foto(arq, w, h, pagina(w, h, fundo, miolo));
// ícones e imagem de compartilhamento do site, a partir das páginas em fonte/og
const de = p => `file:///${resolve(SITE, p).replace(/\\/g, '/')}`;
for (const [arq, w, h, src] of [[join(SITE, 'public/apple-touch-icon.png'), 180, 180, 'fonte/og/icone.html'], [join(SITE, 'public/og.png'), 1200, 630, 'fonte/og/og.html']]) {
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', `--window-size=${w},${h}`, '--virtual-time-budget=3000', `--screenshot=${arq}`, de(src)], { stdio: 'ignore' });
  console.log('ok', arq);
}
rmSync(pasta, { recursive: true, force: true });
