// Pedido de diagnóstico: valida, abre a conversa já escrita (WhatsApp ou Instagram) e mostra o enviado.
import { movimentoReduzido } from '../preferencias.js';
import { linkConversa, WHATSAPP } from '../contato.js';
import { montarConfete } from '../components/confete/confete.js';

const SITE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

export function iniciarMigracao() {
  const form = document.querySelector('[data-migracao]');
  if (!form) return;
  const site = form.querySelector('[name=site]');
  const nome = form.querySelector('[name=nome]');
  const ok = form.querySelector('.linha-form__ok');
  const botao = montarConfete(form.querySelector('button[type=submit]'), { rotulo: 'Pedir diagnóstico', enviado: 'Pedido aberto', erro: 'Confira os campos', carregando: 'Abrindo a conversa' });

  const erro = (input, msg) => {
    const campo = input.closest('.campo');
    campo.querySelector('.campo__erro').textContent = msg;
    campo.classList.toggle('is-erro', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) {
      campo.classList.remove('is-treme');
      void campo.offsetWidth;
      campo.classList.add('is-treme');
    }
    return !msg;
  };
  [site, nome].forEach(i => i.addEventListener('input', () => {
    i.closest('.campo').classList.toggle('is-cheio', !!i.value);
    if (i.closest('.campo').classList.contains('is-erro')) erro(i, '');
  }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const s = site.value.trim();
    const n = nome.value.trim();
    const a = erro(site, !s ? 'Diga qual é o seu site.' : !SITE.test(s) ? 'Confira o endereço (ex.: seusite.com.br).' : '');
    const b = erro(nome, !n ? 'Como podemos te chamar?' : '');
    if (!a) { botao.status('error'); site.focus(); return; }
    if (!b) { botao.status('error'); nome.focus(); return; }
    // abre na hora do clique (depois o navegador bloquearia a janela)
    const msg = `Olá! Sou ${n} e quero um diagnóstico grátis do site ${s}.`;
    if (!WHATSAPP) navigator.clipboard?.writeText(msg).catch(() => {});
    window.open(linkConversa(msg), '_blank', 'noopener');
    botao.status('loading');
    setTimeout(() => {
      botao.status('success');
    }, 900);
    // o confete cai e então o formulário dá lugar ao recado
    setTimeout(() => {
      form.classList.add('is-enviado');
      ok.textContent = '';
      const p = document.createElement('span');
      p.className = 'ponto ponto--aceso';
      p.setAttribute('aria-hidden', 'true');
      ok.append(p, WHATSAPP
        ? ` Abrimos o WhatsApp com o seu pedido. É só enviar, ${n.split(' ')[0]}.`
        : ` Abrimos o nosso Direct e copiamos o seu pedido. É só colar e enviar, ${n.split(' ')[0]}.`);
    }, 3300);
  });
}

// Painel do diagnóstico (base: Relevo, ProfitizeBuild): sobe e se monta ao entrar na tela,
// a descrição se escreve sozinha, inclina com o mouse e mostra o endereço que a pessoa digita.
export function iniciarPainel() {
  const secao = document.querySelector('.relevo');
  if (!secao) return;
  const palco = secao.querySelector('.relevo__stage');
  const desc = secao.querySelector('.ra-desc');
  const escrito = desc.querySelector('.ra-typed');
  const resto = desc.querySelector('.ra-rest');
  const texto = resto.textContent;
  const parado = movimentoReduzido();
  const pinta = n => {
    escrito.textContent = texto.slice(0, n);
    resto.textContent = texto.slice(n);
    desc.classList.toggle('is-done', n >= texto.length);
  };
  const escrever = () => {
    if (parado) return pinta(texto.length);
    let n = 0;
    const passo = () => { pinta(++n); if (n < texto.length) setTimeout(passo, 26); };
    setTimeout(passo, 650);
  };
  const io = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    secao.classList.add('is-in');
    io.disconnect();
    escrever();
  }, { rootMargin: '0px 0px -20% 0px' });
  io.observe(secao);

  palco.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || parado) return;
    const r = palco.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    palco.style.setProperty('--rx', `${(px - 0.5) * 10}deg`);
    palco.style.setProperty('--ry', `${(0.5 - py) * 10}deg`);
    palco.style.setProperty('--mx', `${px * 100}%`);
    palco.style.setProperty('--my', `${py * 100}%`);
  });
  palco.addEventListener('pointerleave', () => {
    palco.style.setProperty('--rx', '0deg');
    palco.style.setProperty('--ry', '0deg');
  });

  // o endereço digitado aparece na barra do painel
  const url = secao.querySelector('[data-raio-url]');
  const campo = document.getElementById('m-site');
  campo.addEventListener('input', () => {
    url.textContent = campo.value.trim().replace(/^https?:\/\//, '') || 'seusite.com.br';
    secao.classList.toggle('is-com-url', !!campo.value.trim());
  });
}
