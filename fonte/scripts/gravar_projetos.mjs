// Grava a capa (jpg) e um vídeo curto rolando (mp4) de cada projeto, para a biblioteca.
// Usa o Chrome instalado (sem baixar nada) e o ffmpeg. Rode: node fonte/scripts/gravar_projetos.mjs [slug]
// Saída: public/projetos/<slug>.jpg e <slug>.mp4
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const PROJETOS = [
  { slug: 'rumo', url: 'https://kevinhsdev.github.io/rumo/' },
  { slug: 'kevinhs', url: 'https://www.kevinhs.dev/pt', espera: 32000 }, // abre com uma animação de entrada
];
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = 1440, H = 900, SEG = 10, FPS = 30; // segundos de rolagem
const SAIDA = resolve(import.meta.dirname, '../../public/projetos');
mkdirSync(SAIDA, { recursive: true });

const espera = ms => new Promise(r => setTimeout(r, ms));

async function abrirChrome() {
  const perfil = mkdtempSync(join(tmpdir(), 'apolo-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${perfil}`,
    `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', 'about:blank']);
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch('http://127.0.0.1:9333/json/list'); const l = await r.json(); const p = l.find(t => t.type === 'page'); if (p) return { proc, ws: p.webSocketDebuggerUrl, perfil }; } catch {}
    await espera(200);
  }
  throw new Error('Chrome não abriu');
}

function cdp(url) {
  const ws = new WebSocket(url);
  let id = 0; const pend = new Map(); const ouv = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method && ouv.has(m.method)) ouv.get(m.method)(m.params);
  };
  return new Promise(ok => ws.onopen = () => ok({
    enviar: (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, m => r(m.result)); ws.send(JSON.stringify({ id: i, method, params })); }),
    ouvir: (ev, f) => ouv.set(ev, f),
    fechar: () => ws.close(),
  }));
}

async function gravar(c, { slug, url, espera: e = 5000 }) {
  console.log('gravando', slug);
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await c.enviar('Page.navigate', { url });
  await espera(e); // carregar fontes, imagens e a animação de entrada
  const capa = await c.enviar('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  writeFileSync(join(SAIDA, `${slug}.jpg`), Buffer.from(capa.data, 'base64'));

  // quadro a quadro: põe a rolagem na posição exata, espera a tela desenhar e fotografa.
  // Assim o vídeo sai liso a 30 qps mesmo que o site pesado leve 200 ms para desenhar cada quadro.
  const pasta = mkdtempSync(join(tmpdir(), `apolo-${slug}-`));
  const { result: { value: alvo } } = await c.enviar('Runtime.evaluate', { returnByValue: true,
    expression: 'Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 4)' });
  const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const N = SEG * FPS, PAUSA = FPS; // 1 s parado no início e no fim
  for (let i = 0; i < N + 2 * PAUSA; i++) {
    const k = Math.min(1, Math.max(0, (i - PAUSA) / N));
    await c.enviar('Runtime.evaluate', { awaitPromise: true, expression:
      `window.scrollTo(0, ${(alvo * ease(k)).toFixed(1)}); new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 40))))` });
    const q = await c.enviar('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
    writeFileSync(join(pasta, `q${String(i).padStart(5, '0')}.jpg`), Buffer.from(q.data, 'base64'));
  }
  const quadros = { length: N + 2 * PAUSA };

  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(pasta, 'q%05d.jpg'),
    '-vf', 'scale=1280:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', join(SAIDA, `${slug}.mp4`)]);
  rmSync(pasta, { recursive: true, force: true });
  console.log(' ', quadros.length, 'quadros →', `public/projetos/${slug}.mp4`);
}

const so = process.argv[2];
const { proc, ws, perfil } = await abrirChrome();
const c = await cdp(ws);
await c.enviar('Page.enable');
for (const p of PROJETOS) if (!so || p.slug === so) await gravar(c, p);
c.fechar(); proc.kill();
await espera(500);
try { rmSync(perfil, { recursive: true, force: true }); } catch {}
