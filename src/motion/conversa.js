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

  // sugestões prontas por assunto: um clique preenche a caixa, e a pessoa ainda pode editar antes de enviar
  const PRESETS = {
    'Site novo': ['Quero um site para o meu negócio e não sei por onde começar.', 'Quero aparecer no Google quando procurarem o meu serviço.', 'Preciso de um site com botão de WhatsApp e agendamento.'],
    'Manutenção': ['Já tenho um site e quero que vocês cuidem dele todo mês.', 'Meu site está lento ou fora do ar. Vocês conseguem ajudar?', 'Quero trocar textos e fotos do meu site.'],
    'Orçamento': ['Qual pacote vocês indicam para o meu negócio?', 'Quanto fica um site com até 5 páginas?', 'Dá para parcelar no cartão?'],
    'Só uma dúvida': ['O domínio está incluso?', 'Em quanto tempo o site fica pronto?', 'Depois de pronto, o site fica no meu nome?'],
  };
  const lista = document.createElement('div');
  lista.className = 'caixa__presets';
  lista.setAttribute('role', 'group');
  lista.setAttribute('aria-label', 'Mensagens prontas');
  form.querySelector('.caixa__chips').after(lista);
  const mostrar = assunto => {
    lista.innerHTML = '';
    (PRESETS[assunto] || []).forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset';
      b.style.setProperty('--i', i);
      b.textContent = t;
      b.addEventListener('click', () => {
        texto.value = t;
        crescer();
        texto.focus();
        texto.setSelectionRange(t.length, t.length);
      });
      lista.append(b);
    });
  };

  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(o => o.setAttribute('aria-pressed', String(o === c)));
    mostrar(c.dataset.assunto);
    texto.focus();
  }));
  mostrar(chips.find(c => c.getAttribute('aria-pressed') === 'true')?.dataset.assunto);
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
