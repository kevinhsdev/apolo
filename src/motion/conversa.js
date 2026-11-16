// Caixa de conversa do contato: assunto em chips, texto que cresce, Enter envia.
// Enviar mostra o balão e abre o WhatsApp (ou o Direct) com a mensagem pronta.
import { linkConversa, WHATSAPP } from '../contato.js';

export function iniciarConversa() {
  const form = document.querySelector('[data-caixa]');
  if (!form) return;
  const texto = form.querySelector('textarea');
  const enviar = form.querySelector('.caixa__enviar');
  const chips = [...form.querySelectorAll('.chip')];
  const mensagens = document.querySelector('[data-mensagens]');

  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(o => o.setAttribute('aria-pressed', String(o === c)));
    texto.focus();
  }));
  const crescer = () => {
    texto.style.height = 'auto';
    texto.style.height = `${Math.min(texto.scrollHeight, 180)}px`;
    enviar.disabled = !texto.value.trim();
  };
  texto.addEventListener('input', crescer);
  texto.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });

  const balao = (t, quem) => {
    const p = document.createElement('p');
    p.className = `balao balao--${quem}`;
    p.textContent = t;
    mensagens.append(p);
    mensagens.scrollTop = mensagens.scrollHeight;
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const t = texto.value.trim();
    if (!t) return;
    const assunto = chips.find(c => c.getAttribute('aria-pressed') === 'true')?.dataset.assunto || '';
    const msg = `Olá, Apolo! (${assunto}) ${t}`;
    // o Direct não recebe texto pronto: sem WhatsApp, a mensagem vai para a área de transferência
    if (!WHATSAPP) navigator.clipboard?.writeText(msg).catch(() => {});
    window.open(linkConversa(msg), '_blank', 'noopener');
    balao(t, 'voce');
    texto.value = '';
    crescer();
    setTimeout(() => balao(WHATSAPP
      ? 'Abrimos o WhatsApp com a sua mensagem. É só enviar por lá.'
      : 'Abrimos o nosso Direct e copiamos a sua mensagem: é só colar e enviar.', 'apolo'), 700);
  });
}
