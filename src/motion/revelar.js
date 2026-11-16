// Texto entra uma vez, por tempo, quando chega na tela. Numera as linhas (--i) para o atraso.
export function numerarLinhas(raiz = document) {
  raiz.querySelectorAll('.titulo, .hero__lead, .hero__preco').forEach(t => {
    t.querySelectorAll('.linha').forEach((l, i) => l.style.setProperty('--i', i));
  });
}

export function iniciarRevelar() {
  const alvos = document.querySelectorAll('[data-revela], [data-numero]');
  if (!('IntersectionObserver' in window)) {
    alvos.forEach(el => { el.classList.add('is-visivel'); el.dispatchEvent(new Event('revelou')); });
    return;
  }
  const io = new IntersectionObserver(entradas => {
    entradas.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-visivel');
      en.target.dispatchEvent(new Event('revelou'));
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -14% 0px' });
  alvos.forEach(el => io.observe(el));
}
