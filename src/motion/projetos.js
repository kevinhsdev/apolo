// Seção da home: os projetos numa faixa (o escolhido abre com o vídeo rodando) e o caminho para a biblioteca inteira.
import { PROJETOS, iniciarVisor } from '../projetos.js';
import { montarSeletor } from '../components/seletor/seletor.js';

export function iniciarProjetos() {
  const faixa = document.querySelector('[data-projetos-faixa]');
  if (!faixa) return;
  montarSeletor(faixa, PROJETOS, { rotulo: 'Projetos' });
  iniciarVisor();
  const total = document.querySelector('[data-projetos-total]');
  if (total) total.textContent = PROJETOS.length;
}
