// A hora de quem visita (HH:MM); os dois-pontos piscam pelo CSS.
export function iniciarRelogio() {
  const el = document.querySelector('[data-relogio]');
  if (!el) return;
  const h = el.querySelector('[data-h]');
  const m = el.querySelector('[data-m]');
  const pinta = () => {
    const d = new Date();
    h.textContent = String(d.getHours()).padStart(2, '0');
    m.textContent = String(d.getMinutes()).padStart(2, '0');
    el.setAttribute('aria-label', `Agora são ${h.textContent}:${m.textContent} aí`);
  };
  pinta();
  setInterval(pinta, 1000);
}
