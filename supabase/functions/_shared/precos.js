// Preços, oferta e cobrança num lugar só. O site (src/precos.js) e as funções do servidor (Supabase)
// importam este arquivo: o que aparece na tela é exatamente o que o servidor cobra.
// O preço base é o do Pix. O do cartão repassa o custo real de receber parcelado, para você
// ficar com o mesmo líquido nos dois. Os valores do index.html (data-preco) devem bater com o `pix` abaixo.

// Taxas cheias do Asaas (asaas.com/precos-e-taxas, consultado em 16/11/2026). A página mostra
// taxas menores "válidas por 3 meses"; usamos as cheias para o preço não ficar errado quando a promoção acabar.
export const TAXAS = {
  cartao: 0.0349,        // crédito de 2 a 6 parcelas, sobre o valor total
  fixo: 0.49,            // R$ por cobrança no cartão
  antecipacaoMes: 0.0125, // 1,25% ao mês por parcela adiantada (recebe tudo em até 2 dias úteis)
};
export const PARCELAS_SEM_JUROS = 3;

// Total no cartão: o que sobra, depois da taxa e da antecipação das parcelas, é o preço do Pix.
// Em 3x, as parcelas ficam adiantadas 1, 2 e 3 meses: média de 2 meses de antecipação.
export function precoCartao(pix, n = PARCELAS_SEM_JUROS) {
  const custo = TAXAS.cartao + TAXAS.antecipacaoMes * (n + 1) / 2;
  const bruto = (pix + TAXAS.fixo) / (1 - custo);
  return Math.ceil(bruto / n - 1e-9) * n; // arredonda para parcelas inteiras
}
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
  base: { nome: 'Base', tipo: 'mensal', mes: 89,
    itens: ['Hospedagem e renovação do domínio', 'Certificado de segurança e backup', 'Até 2 pequenas alterações por mês'] },
  plus: { nome: 'Plus', tipo: 'mensal', mes: 189,
    itens: ['2 horas de alterações por mês', 'Google Meu Negócio sempre atualizado', 'Relatório mensal de visitas', 'Tudo do Base'] },
  pro: { nome: 'Pro', tipo: 'mensal', mes: 390,
    itens: ['2 artigos de blog por mês', 'Ajustes de SEO todo mês', 'Tudo do Plus'] },
};


// autoteste: node src/precos.js
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('precos.js')) {
  const t = (pix, esperado) => { const c = precoCartao(pix); if (c !== esperado) throw new Error(`${pix}: ${c} != ${esperado}`); };
  t(1200, 1278); t(2200, 2343); t(3800, 4044);
  for (const pix of [1200, 2200, 3800, 1080]) {
    const c = precoCartao(pix);
    const liquido = c * (1 - TAXAS.cartao - TAXAS.antecipacaoMes * 2) - TAXAS.fixo;
    if (liquido < pix || c % 3) throw new Error(`líquido ${liquido} < ${pix}`);
    console.log(`Pix R$ ${pix} → cartão R$ ${c} (3x ${c / 3}), líquido R$ ${liquido.toFixed(2)}, ${descontoPix(pix)}% off no Pix`);
  }
}
