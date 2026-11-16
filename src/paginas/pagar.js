// Tela de cobrança: resumo do pedido + dados + Pix ou cartão (até 3x sem juros).
// Com a área do cliente ligada (src/supabase.js), confirma o e-mail por código, cria a cobrança no servidor
// e leva à página oficial de pagamento do Asaas. Desligada, o pedido segue pela conversa já escrita.
import '@fontsource-variable/figtree';
import '@fontsource-variable/sora';
import '../styles/tokens.css';
import '../styles/base.css';
import './pagar.css';
import '../estilo.js';
import { CATALOGO, precoCartao, descontoPix, brl, PARCELAS_SEM_JUROS } from '../precos.js';
import { ligado, sb, sessao, enviarCodigo, conferirCodigo, salvarCliente, criarCobranca } from '../supabase.js';
import { OFERTA, ofertaNoAr } from '../oferta.js';
import { linkConversa, WHATSAPP } from '../contato.js';

const $ = s => document.querySelector(s);
const q = new URLSearchParams(location.search);
const id = CATALOGO[q.get('plano')] ? q.get('plano') : 'orbita';
const plano = CATALOGO[id];
const site = plano.tipo === 'site';
const estado = { forma: site ? 'pix' : 'pix', parcelas: PARCELAS_SEM_JUROS, cupom: '' };

// preço do Pix: o de lançamento enquanto a oferta vale; depois, o cheio (oferta.js)
const base = site ? (ofertaNoAr() ? plano.pix : OFERTA.cheio[id]) : plano.mes;
const comCupom = () => {
  const c = OFERTA.cupons[estado.cupom];
  return c && site ? Math.round(base * (1 - c.desconto / 100) * 100) / 100 : base;
};

// resumo fixo
document.title = `${plano.nome} · Finalizar pedido · Apolo Studio`;
$('[data-r-nome]').textContent = plano.nome;
$('[data-r-tipo]').textContent = site ? 'Criação de site · pagamento único' : 'Manutenção mensal';
$('[data-r-prazo]').textContent = site ? `Pronto em ${plano.prazo}` : 'Vence todo dia 10. Cancele com 30 dias de aviso, sem multa.';
$('[data-r-itens]').replaceChildren(...plano.itens.map(t => Object.assign(document.createElement('li'), { textContent: t })));
if (q.get('dominio')) $('#c-dominio').value = q.get('dominio');
if (!site) $('[data-cupom-linha]').hidden = true;

// formas de pagamento
const formas = $('[data-formas]');
function opcao(valor, titulo, detalhe, selo) {
  const l = document.createElement('label');
  l.className = 'forma';
  l.innerHTML = `<input type="radio" name="forma" value="${valor}"><span class="forma__marca" aria-hidden="true"></span>
    <span class="forma__texto"><b></b><small></small></span>${selo ? '<em class="forma__selo"></em>' : ''}<strong class="forma__valor"></strong>`;
  l.querySelector('b').textContent = titulo;
  l.querySelector('small').textContent = detalhe;
  if (selo) l.querySelector('.forma__selo').textContent = selo;
  return l;
}
if (site) {
  formas.append(
    opcao('pix', 'Pix', '50% para começar e 50% na entrega', `${descontoPix(base)}% off`),
    opcao('cartao', 'Cartão de crédito', `Até ${PARCELAS_SEM_JUROS}x sem juros`),
  );
} else {
  formas.append(opcao('pix', 'Pix', 'Todo dia 10'), opcao('boleto', 'Boleto', 'Todo dia 10'));
}
formas.querySelector('input').checked = true;
formas.addEventListener('change', e => { estado.forma = e.target.value; pintar(); });
$('[data-parcelas]').addEventListener('change', e => { estado.parcelas = +e.target.value; pintar(); });

function pintar() {
  const pix = comCupom();
  const cartao = precoCartao(pix);
  const valores = { pix: site ? pix : base, cartao, boleto: base };
  formas.querySelectorAll('.forma').forEach(l => {
    const v = l.querySelector('input').value;
    l.querySelector('.forma__valor').textContent = site ? `R$ ${brl(valores[v])}` : `R$ ${brl(base)}/mês`;
    l.classList.toggle('is-ativa', v === estado.forma);
  });
  // parcelas: todas sem juros sobre o preço do cartão
  const sel = $('[data-parcelas]');
  sel.replaceChildren(...Array.from({ length: PARCELAS_SEM_JUROS }, (_, i) => {
    const n = i + 1;
    return new Option(`${n}x de R$ ${brl(Math.round(cartao / n * 100) / 100)}${n > 1 ? ' sem juros' : ''}`, n, false, n === estado.parcelas);
  }));
  $('[data-parcelas-campo]').hidden = estado.forma !== 'cartao';

  const total = valores[estado.forma];
  const c = OFERTA.cupons[estado.cupom];
  $('[data-r-subtotal]').textContent = site ? `R$ ${brl(base)}` : `R$ ${brl(base)}/mês`;
  $('[data-r-linha-cupom]').hidden = !(c && site);
  if (c && site) { $('[data-r-cupom]').textContent = estado.cupom; $('[data-r-desconto]').textContent = `− R$ ${brl(base - pix)}`; }
  const forma = { pix: 'Pix', cartao: `Cartão em ${estado.parcelas}x`, boleto: 'Boleto' }[estado.forma];
  $('[data-r-forma]').textContent = estado.forma === 'cartao' ? `${forma} · + R$ ${brl(cartao - pix)}` : forma;
  $('[data-r-total]').textContent = site ? `R$ ${brl(total)}` : `R$ ${brl(base)}/mês`;
  $('[data-r-hoje]').textContent = !site ? 'A primeira cobrança vence no próximo dia 10.'
    : estado.forma === 'pix' ? `Hoje você paga R$ ${brl(pix / 2)} (50%). O restante, na entrega.`
    : `${estado.parcelas}x de R$ ${brl(Math.round(cartao / estado.parcelas * 100) / 100)} no cartão, sem juros.`;
  // "Pagar" só quando a cobrança é gerada de verdade (área do cliente ligada); sem ela, o botão envia o pedido
  $('[data-finalizar]').textContent = !ligado ? (site ? 'Finalizar pedido' : 'Assinar')
    : estado.forma === 'pix' && site ? `Pagar R$ ${brl(pix / 2)} no Pix` : estado.forma === 'cartao' ? `Pagar em ${estado.parcelas}x no cartão` : `Assinar no ${estado.forma === 'pix' ? 'Pix' : 'boleto'}`;
}

// cupom (só nos planos de site, enquanto a oferta vale)
const campoCupom = $('#c-cupom'), estadoCupom = $('[data-cupom-estado]');
function aplicarCupom(codigo, silencioso) {
  const c = codigo.trim().toUpperCase();
  if (!c) { if (!silencioso) estadoCupom.textContent = 'Digite o código do cupom.'; return; }
  if (!ofertaNoAr() || !OFERTA.cupons[c]) { estadoCupom.textContent = 'Esse cupom não existe ou já acabou.'; estado.cupom = ''; pintar(); return; }
  estado.cupom = c;
  campoCupom.value = c;
  estadoCupom.textContent = `Cupom ${c} aplicado: ${OFERTA.cupons[c].desconto}% off.`;
  pintar();
}
$('[data-cupom-aplicar]').addEventListener('click', () => aplicarCupom(campoCupom.value));
campoCupom.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); aplicarCupom(campoCupom.value); } });
if (site && q.get('cupom')) aplicarCupom(q.get('cupom'), true);

// finalizar
const form = $('[data-checkout]'), saida = $('[data-estado]'), botao = $('[data-finalizar]');
const passoCodigo = $('[data-codigo]');
const docOk = v => [11, 14].includes(v.replace(/\D/g, '').length);

if (ligado) {
  document.querySelectorAll('[data-so-conta]').forEach(e => { e.hidden = false; });
  $('#c-doc').required = true;
  // já logado: preenche com o cadastro
  sessao().then(async s => {
    if (!s) return;
    const { data } = await sb.from('clientes').select('*').eq('id', s.user.id).maybeSingle();
    $('#c-email').value = s.user.email;
    $('#c-email').readOnly = true;
    if (data) { $('#c-nome').value = data.nome; $('#c-whats').value = data.whatsapp; $('#c-doc').value = data.cpf_cnpj; }
  });
}

function conferir() {
  const invalido = [...form.querySelectorAll('input[required]')].find(i => !i.value.trim() || !i.checkValidity()
    || (i.type === 'tel' && i.value.replace(/\D/g, '').length < 10) || (i.name === 'doc' && !docOk(i.value)));
  form.querySelectorAll('.campo').forEach(c => c.classList.remove('is-erro'));
  if (!invalido) return true;
  invalido.closest('.campo').classList.add('is-erro');
  saida.textContent = { tel: 'Confira o WhatsApp, com DDD.', email: 'Confira o e-mail.' }[invalido.type]
    || (invalido.name === 'doc' ? 'Confira o CPF (11 números) ou CNPJ (14 números).' : 'Preencha seu nome.');
  invalido.focus();
  return false;
}

async function pagarComConta(d) {
  let s = await sessao();
  if (!s) {
    if (passoCodigo.hidden) {
      const { error } = await enviarCodigo(d.email);
      if (error) throw new Error('Não conseguimos enviar o código. Confira o e-mail.');
      $('[data-codigo-email]').textContent = d.email;
      passoCodigo.hidden = false;
      $('#c-codigo').focus();
      saida.textContent = 'Digite o código que chegou no seu e-mail e aperte o botão de novo.';
      return;
    }
    const { data, error } = await conferirCodigo(d.email, $('#c-codigo').value.trim());
    if (error || !data.session) throw new Error('Código inválido ou vencido. Confira e tente de novo.');
    s = data.session;
  }
  await salvarCliente({ nome: d.nome.trim(), whatsapp: d.whats.trim(), cpf_cnpj: d.doc.replace(/\D/g, '') });
  saida.textContent = 'Gerando a sua cobrança…';
  const { link } = await criarCobranca({ plano: id, forma: estado.forma, parcelas: estado.parcelas, cupom: estado.cupom, dominio: d.dominio });
  location.href = link || './conta.html';
}

async function pedirPelaConversa(d) {
  const pix = comCupom(), cartao = precoCartao(pix);
  const pagamento = !site ? `${estado.forma === 'pix' ? 'Pix' : 'Boleto'}, R$ ${brl(base)}/mês`
    : estado.forma === 'pix' ? `Pix, R$ ${brl(pix)} (50% agora, 50% na entrega)`
    : `Cartão em ${estado.parcelas}x de R$ ${brl(Math.round(cartao / estado.parcelas * 100) / 100)} sem juros (total R$ ${brl(cartao)})`;
  const texto = [
    `Olá! Quero fechar o ${site ? 'site no pacote' : 'plano de manutenção'} ${plano.nome}.`,
    `Pagamento: ${pagamento}.${estado.cupom ? ` Cupom ${estado.cupom}.` : ''}`,
    d.dominio ? `Site: ${d.dominio}` : '',
    `Nome: ${d.nome}`, `WhatsApp: ${d.whats}`, `E-mail: ${d.email}`,
    'Pode me mandar o link de pagamento?',
  ].filter(Boolean).join('\n');
  if (!WHATSAPP) {
    // sem WhatsApp configurado, o link abre o Direct do Instagram sem texto: copia o pedido antes
    try { await navigator.clipboard.writeText(texto); saida.textContent = 'Pedido copiado. Cole no Direct do Instagram que abrimos e envie.'; }
    catch { saida.textContent = 'Abrimos o Direct do Instagram: mande o seu pedido por lá.'; }
  }
  window.open(linkConversa(texto), '_blank', 'noopener');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!conferir()) return;
  const d = Object.fromEntries(new FormData(form));
  if (!ligado) return pedirPelaConversa(d);
  botao.disabled = true;
  try { await pagarComConta(d); }
  catch (err) { saida.textContent = err.message; }
  finally { botao.disabled = false; }
});

pintar();
