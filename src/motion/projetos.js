// Seção da home: os primeiros projetos da vitrine e o caminho para a biblioteca inteira.
import { PROJETOS, montarVitrine } from '../projetos.js';

export function iniciarProjetos() {
  const grade = document.querySelector('[data-projetos-destaque]');
  if (!grade) return;
  montarVitrine(grade, 3);
  const total = document.querySelector('[data-projetos-total]');
  if (total) total.textContent = PROJETOS.length;
}
