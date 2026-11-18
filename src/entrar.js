// Entrar por código no e-mail (área do cliente e admin): e-mail → código de 6 dígitos, que entra sozinho ao completar.
// Usa dentro de `raiz`: [data-entrar] (form), #e-email, [data-entrar-codigo], #e-codigo, [data-entrar-botao],
// [data-entrar-estado], [data-entrar-para], [data-trocar], [data-reenviar].
import { enviarCodigo, conferirCodigo } from './supabase.js';

export function montarEntrada(raiz, aoEntrar) {
  const $ = s => raiz.querySelector(s);
  const fEntrar = $('[data-entrar]'), eEstado = $('[data-entrar-estado]'), eCodigo = $('[data-entrar-codigo]');
  const eBotao = $('[data-entrar-botao]'), eEmail = $('#e-email'), eCod = $('#e-codigo'), eReenviar = $('[data-reenviar]');
  let espera;
  function contar() {
    let s = 60;
    clearInterval(espera);
    eReenviar.disabled = true;
    eReenviar.textContent = `Reenviar em ${s}s`;
    espera = setInterval(() => {
      if (--s > 0) { eReenviar.textContent = `Reenviar em ${s}s`; return; }
      clearInterval(espera); eReenviar.disabled = false; eReenviar.textContent = 'Reenviar';
    }, 1000);
  }
  async function pedirCodigo() {
    const email = eEmail.value.trim();
    const { error } = await enviarCodigo(email);
    if (error) throw new Error('Não conseguimos enviar o código. Tente de novo em instantes.');
    $('[data-entrar-para]').textContent = `Enviado para ${email}`;
    eEmail.readOnly = true;
    eCodigo.hidden = false;
    eBotao.textContent = 'Entrar';
    eEstado.textContent = '';
    contar();
    eCod.focus();
  }
  async function entrar() {
    if (eCodigo.hidden) {
      if (!eEmail.value.trim() || !eEmail.checkValidity()) throw new Error('Confira o e-mail.');
      return pedirCodigo();
    }
    if (!/^\d{6}$/.test(eCod.value)) throw new Error('Digite os 6 números do código.');
    const { error } = await conferirCodigo(eEmail.value.trim(), eCod.value);
    if (error) { eCod.select(); throw new Error('Código inválido ou vencido.'); }
    await aoEntrar();
  }
  async function enviar() {
    eBotao.disabled = true;
    try { await entrar(); } catch (err) { eEstado.textContent = err.message; }
    finally { eBotao.disabled = false; }
  }
  fEntrar.addEventListener('submit', e => { e.preventDefault(); enviar(); });
  eCod.addEventListener('input', () => {
    eCod.value = eCod.value.replace(/\D/g, '').slice(0, 6);
    if (eCod.value.length === 6) enviar();
  });
  $('[data-trocar]').addEventListener('click', () => {
    clearInterval(espera);
    eCodigo.hidden = true; eCod.value = ''; eEmail.readOnly = false; eBotao.textContent = 'Receber código'; eEstado.textContent = '';
    eEmail.focus();
  });
  eReenviar.addEventListener('click', async () => {
    try { await pedirCodigo(); eEstado.textContent = 'Mandamos um código novo.'; } catch (err) { eEstado.textContent = err.message; }
  });
}
