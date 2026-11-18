// Preços, oferta e cobrança num lugar só. O site (src/precos.js) e as funções do servidor (Supabase)
// importam este arquivo: o que aparece na tela é exatamente o que o servidor cobra.
// O preço base é o do Pix. O do cartão repassa o custo real de receber parcelado, para você
// ficar com o mesmo líquido nos dois. Os valores do index.html (data-preco) devem bater com o `pix` abaixo.

// Taxas do Mercado Pago, Checkout, recebendo na hora (painel › Taxas e parcelas, conferido em 17/11/2026).
// Se o Mercado Pago mudar as taxas, atualize aqui: site e servidor recalculam sozinhos.
export const TAXAS = {
  pix: 0.0099,
  avista: 0.0498,        // cartão em 1x
  parcelado: 0.0299,     // cartão de 2x a 6x, somado ao custo do "parcelado vendedor" abaixo
  // custo do parcelado vendedor (sem juros para o cliente), por número de parcelas
  semJuros: { 2: 0.0452, 3: 0.0661, 4: 0.0868, 5: 0.1065, 6: 0.1195 },
};
// o painel do Mercado Pago está em "até 6x"; aqui pode ser igual ou menor
export const PARCELAS_SEM_JUROS = 6;

const taxaCartao = n => (n <= 1 ? TAXAS.avista : TAXAS.parcelado + TAXAS.semJuros[n]);

// Preço no cartão: o mesmo em 1x ou em N parcelas, e mesmo no pior caso (todas as parcelas)
// sobra o mesmo líquido do Pix. Quem paga em menos vezes só deixa um pouco a mais para você.
export function precoCartao(pix, n = PARCELAS_SEM_JUROS) {
  const liquido = pix * (1 - TAXAS.pix);
  const pior = Math.max(...Array.from({ length: n }, (_, i) => taxaCartao(i + 1)));
  return Math.ceil(liquido / (1 - pior) / n - 1e-9) * n; // parcelas em reais inteiros
}
export const liquidoCartao = (total, n) => total * (1 - taxaCartao(n));
// mensalidade no cartão com a taxa repassada: sobra o líquido pedido.
// ponytail: supõe que a assinatura paga a taxa do cartão à vista; confira no 1º extrato.
const mensal = liquido => Math.ceil(liquido / (1 - TAXAS.avista));
export const descontoPix = pix => Math.round((1 - pix / precoCartao(pix)) * 100);

export const OFERTA = {
  ativa: true,
  nome: 'Preço de lançamento',
  ate: '2026-12-31T23:59:59-03:00', // [ajustar] fim da oferta
  cheio: { decolagem: 1590, orbita: 2890, lua: 4990, base: 119, plus: 249, pro: 490 }, // [ajustar]
  cupons: {
    // [ajustar] código: desconto em % sobre o pacote do site (pagamento único)
    APOLO10: { desconto: 10, texto: '10% a mais de desconto no pacote do site' },
  },
};
export const ofertaNoAr = (agora = Date.now()) => OFERTA.ativa && agora < new Date(OFERTA.ate).getTime();

// preço do Pix de um plano de site hoje (lançamento ou cheio) e com cupom: o servidor cobra exatamente isto
export function precoPix(id, cupom, agora = Date.now()) {
  const p = CATALOGO[id];
  const base = ofertaNoAr(agora) ? p.pix : OFERTA.cheio[id];
  const c = ofertaNoAr(agora) && OFERTA.cupons[String(cupom || '').trim().toUpperCase()];
  return c ? Math.round(base * (1 - c.desconto / 100) * 100) / 100 : base;
}

export const brl = n => n.toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export const CATALOGO = {
  decolagem: { nome: 'Decolagem', tipo: 'site', pix: 1200, prazo: '7 dias úteis',
    itens: ['1 página com até 6 seções', '2 rodadas de ajuste', 'Botão de WhatsApp, mapa e Google Meu Negócio', 'Domínio do 1º ano incluso'] },
  orbita: { nome: 'Órbita', tipo: 'site', pix: 2200, prazo: '14 dias úteis',
    itens: ['Até 5 páginas', '3 rodadas de ajuste', 'Textos escritos pela Apolo', 'SEO local, agendamento e Google Analytics'] },
  lua: { nome: 'Lua', tipo: 'site', pix: 3800, prazo: '21 dias úteis',
    itens: ['Até 10 páginas, com blog', 'Logotipo simples e 10 artes para o Instagram', '3 artigos no blog', '1 mês de manutenção Plus'] },
  base: { nome: 'Base', tipo: 'mensal', mes: mensal(89),
    itens: ['Hospedagem e renovação do domínio', 'Certificado de segurança e backup', 'Até 2 pequenas alterações por mês'] },
  plus: { nome: 'Plus', tipo: 'mensal', mes: mensal(189),
    itens: ['2 horas de alterações por mês', 'Google Meu Negócio sempre atualizado', 'Relatório mensal de visitas', 'Tudo do Base'] },
  pro: { nome: 'Pro', tipo: 'mensal', mes: mensal(390),
    itens: ['2 artigos de blog por mês', 'Ajustes de SEO todo mês', 'Tudo do Plus'] },
};


// autoteste: node src/precos.js
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('precos.js')) {
  for (const [id, p] of Object.entries(CATALOGO)) if (p.mes) console.log(`${p.nome}: R$ ${p.mes}/mês, líquido ${(p.mes * (1 - TAXAS.avista)).toFixed(2)}`);
  // em qualquer número de parcelas, o cartão nunca deixa menos que o Pix
  for (const n of [3, 4, 5, 6]) for (const pix of [1200, 2200, 3800, 1080, 1590, 2890, 4990]) {
    const c = precoCartao(pix, n), alvo = pix * (1 - TAXAS.pix);
    for (let k = 1; k <= n; k++) if (liquidoCartao(c, k) < alvo - 1e-9) throw new Error(`${pix} em ${k}x: prejuízo`);
    if (c % n) throw new Error(`${c} não divide em ${n}x`);
    if (n === PARCELAS_SEM_JUROS || pix <= 3800 && [1200, 2200, 3800].includes(pix))
      console.log(`até ${n}x · Pix R$ ${pix} (líquido ${alvo.toFixed(2)}) → cartão R$ ${c} = ${n}x ${c / n}, pior líquido ${liquidoCartao(c, n).toFixed(2)}, ${Math.round((1 - pix / c) * 100)}% off no Pix`);
  }
}
