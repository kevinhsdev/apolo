// E-mails do Apolo Studio (envio: avisar.ts), todos na mesma moldura. Testado em tests/aviso.test.js.
// HTML de e-mail: tabelas e estilo inline (Gmail e Outlook ignoram CSS moderno), logo em PNG (e-mail não mostra SVG).
// O código de login usa a mesma cara, à mão, em supabase/templates/codigo.html.
import { CATALOGO, brl } from './precos.js';

export const escapar = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const F = 'font-family:Figtree,Segoe UI,Helvetica,Arial,sans-serif';
const td = (estilo, html) => `<tr><td style="${F};${estilo}">${html}</td></tr>`;

// moldura: faixa laranja, logo, rótulo, título, texto, quadro de dados, botão, nota e rodapé
export function moldura({ site, previa, rotulo, titulo, paragrafos = [], linhas = [], botao, nota, rodape }) {
  const quadro = !linhas.length ? '' : `<tr><td style="padding:22px 40px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:14px">
${linhas.map(([k, v], i) => {
    const borda = i ? 'border-top:1px solid #2a2a2a;' : '';
    return `<tr><td style="${F};padding:13px 20px;${borda}font-size:13px;color:#8f8f8f;white-space:nowrap">${escapar(k)}</td><td align="right" style="${F};padding:13px 20px;${borda}font-size:14px;font-weight:600;color:#f4f4f2">${escapar(v)}</td></tr>`;
  }).join('\n')}
</table></td></tr>`;
  const btn = !botao ? '' : `<tr><td style="padding:28px 40px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ff5a1f" style="border-radius:999px">
<a href="${escapar(botao.href)}" style="${F};display:inline-block;padding:15px 30px;font-size:15px;font-weight:700;color:#120600;text-decoration:none;border-radius:999px">${escapar(botao.texto)} &rarr;</a></td></tr></table></td></tr>`;
  const pe = rodape ? escapar(rodape)
    : `Apolo Studio · sites que colocam o seu negócio no mapa<br><a href="${escapar(site)}" style="color:#8f8f8f">apolostudio.com.br</a> · <a href="mailto:contato@apolostudio.com.br" style="color:#8f8f8f">contato@apolostudio.com.br</a>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapar(previa ?? titulo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#121212;border:1px solid #242424;border-radius:20px;overflow:hidden">
<tr><td style="height:4px;line-height:4px;font-size:0;background:#ff5a1f;background-image:linear-gradient(90deg,#ff5a1f,#ffb08e 55%,#ff5a1f)">&nbsp;</td></tr>
<tr><td style="padding:32px 40px 0"><a href="${escapar(site)}"><img src="${escapar(site)}/email-logo.png" width="150" height="18" alt="Apolo Studio" style="display:block;border:0;color:#f4f4f2;font-size:18px;font-weight:bold"></a></td></tr>
${td('padding:36px 40px 0;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ff7a45', escapar(rotulo))}
${td('padding:10px 40px 0;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-.02em;color:#ffffff', escapar(titulo))}
${paragrafos.map(t => td('padding:14px 40px 0;font-size:15px;line-height:1.6;color:#b8b8b4', escapar(t))).join('\n')}
${quadro}
${btn}
${nota ? td('padding:22px 40px 0;font-size:13px;line-height:1.55;color:#8a8a8a', escapar(nota)) : ''}
<tr><td style="padding:36px 40px 0"><div style="height:1px;line-height:1px;font-size:0;background:#242424">&nbsp;</div></td></tr>
${td('padding:18px 40px 32px;font-size:12px;line-height:1.6;color:#6f6f6f', pe)}
</table></td></tr></table></body></html>`;
}

const formaTxt = p => (p.forma === 'cartao' ? `Cartão em ${p.parcelas}x` : p.forma === 'pix' ? 'Pix' : p.forma);
const pacoteDe = p => `${p.tipo === 'mensal' ? 'Manutenção' : 'Site'} ${CATALOGO[p.plano]?.nome ?? p.plano}`;

export function montarAviso({ evento, pedido, cliente, site }) {
  const pacote = pacoteDe(pedido);
  const quem = cliente?.nome || 'cliente sem cadastro';
  const assunto = `${evento === 'pago' ? 'Pedido pago' : 'Novo pedido (ainda não pago)'}: ${pacote} · ${quem}`;
  const link = `${site}/admin.html#pedido=${pedido.id}`;
  const linhas = [
    ['Pacote', pacote],
    ['Pagamento', `${formaTxt(pedido)} · R$ ${brl(Number(pedido.valor))}${pedido.tipo === 'mensal' ? '/mês' : ''}`],
    ...(pedido.dominio ? [['Domínio', pedido.dominio]] : []),
    ['Cliente', quem],
    ...(cliente ? [['WhatsApp', cliente.whatsapp], ['E-mail', cliente.email]] : []),
  ];
  const texto = `${assunto}\n\n${linhas.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nAbrir no admin: ${link}\n`;
  const pago = evento === 'pago';
  const html = moldura({
    site, previa: `${pacote} · ${quem} · R$ ${brl(Number(pedido.valor))}`,
    rotulo: pago ? 'Pagamento confirmado' : 'Novo pedido',
    titulo: pago ? `${quem} pagou: ${pacote}` : `Pedido aberto: ${pacote}`,
    paragrafos: [pago
      ? (pedido.tipo === 'mensal' ? 'A manutenção está ativa. Combine o acesso ao site com o cliente em até 1 dia útil.' : 'Hora de chamar para o briefing: o cliente espera contato em até 1 dia útil.')
      : `${quem} ainda não pagou. Se não pagar em 1 dia, o pedido aparece em "cobrar" no admin.`],
    linhas, botao: { texto: 'Abrir no admin', href: link },
    rodape: 'Aviso automático do site da Apolo Studio, enviado aos admins.',
  });
  return { assunto, html, texto };
}

// Lembrete ao cliente: a mensalidade do mês seguinte está disponível (envio: renovar-mensalidades)
export function montarLembrete({ pedido, cliente, vence, link, site }) {
  const pacote = `Manutenção ${CATALOGO[pedido.plano]?.nome ?? pedido.plano}`;
  const primeiro = String(cliente?.nome ?? '').trim().split(/\s+/)[0];
  const data = new Date(`${vence}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  const assunto = `Sua mensalidade da ${pacote} vence em ${data}`;
  const corpo = [
    `Olá${primeiro ? `, ${primeiro}` : ''}!`,
    `A mensalidade da sua ${pacote} (R$ ${brl(Number(pedido.valor))}) vence em ${data}. Você pode pagar no Pix ou no cartão, pelo link abaixo ou na sua área do cliente.`,
    'Se já pagou, pode ignorar este e-mail. Quer cancelar ou mudar de plano? É só responder.',
  ];
  const texto = `${corpo.join('\n\n')}\n\nPagar: ${link}\nÁrea do cliente: ${site}/conta.html#manutencao\n\nApolo Studio`;
  const html = moldura({
    site, previa: `R$ ${brl(Number(pedido.valor))} no Pix ou no cartão, vence em ${data}.`,
    rotulo: 'Mensalidade disponível', titulo: `${primeiro ? `${primeiro}, sua` : 'Sua'} mensalidade vence em ${data}`,
    paragrafos: [`A mensalidade da sua ${pacote} já pode ser paga, no Pix ou no cartão. Leva menos de um minuto.`],
    linhas: [['Plano', pacote], ['Valor', `R$ ${brl(Number(pedido.valor))}`], ['Vencimento', data]],
    botao: { texto: 'Pagar mensalidade', href: link },
    nota: 'Se já pagou, pode ignorar este e-mail. Quer mudar de plano ou cancelar? Responda este e-mail ou use a sua área do cliente.',
  });
  return { assunto, html, texto };
}

// Aviso aos admins: o cliente cancelou a manutenção pela área dele (envio: cancelar-manutencao)
export function montarCancelamento({ pedido, cliente, ate, site }) {
  const pacote = pacoteDe(pedido), quem = cliente?.nome || 'Cliente';
  const fim = ate ? ate.split('-').reverse().join('/') : null;
  const assunto = `Manutenção cancelada: ${pacote} · ${quem}`;
  const linhas = [['Plano', pacote], ['Cliente', quem], ...(cliente?.email ? [['E-mail', cliente.email]] : []), ['Serviço até', fim ?? 'sem mês pago']];
  const texto = `${quem} cancelou a ${pacote} pela área do cliente.${fim ? ` O serviço segue até ${fim}.` : ''}\n\n${linhas.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nAdmin: ${site}/admin.html`;
  const html = moldura({
    site, previa: `${quem} cancelou${fim ? `, serviço até ${fim}` : ''}.`, rotulo: 'Manutenção cancelada', titulo: `${quem} cancelou a ${pacote}`,
    paragrafos: [fim ? `O serviço segue até ${fim} e o mês seguinte não será cobrado. Vale uma mensagem para entender o motivo.` : 'Era a primeira mensalidade, ainda sem pagamento: o link deixou de valer.'],
    linhas, botao: { texto: 'Abrir o admin', href: `${site}/admin.html` },
    rodape: 'Aviso automático do site da Apolo Studio, enviado aos admins.',
  });
  return { assunto, html, texto };
}
