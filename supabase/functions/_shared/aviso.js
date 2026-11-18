// Monta o e-mail que avisa os admins de um pedido criado ou pago (envio: avisar.ts). Testado em tests/aviso.test.js.
import { CATALOGO, brl } from './precos.js';

export const escapar = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function montarAviso({ evento, pedido, cliente, site }) {
  const plano = CATALOGO[pedido.plano];
  const pacote = `${pedido.tipo === 'mensal' ? 'Manutenção' : 'Site'} ${plano?.nome ?? pedido.plano}`;
  const quem = cliente?.nome || 'cliente sem cadastro';
  const assunto = `${evento === 'pago' ? 'Pedido pago' : 'Novo pedido (ainda não pago)'}: ${pacote} · ${quem}`;
  const link = `${site}/admin.html#pedido=${pedido.id}`;
  const linhas = [
    ['Pacote', pacote],
    ['Pagamento', `${pedido.forma === 'cartao' ? `Cartão em ${pedido.parcelas}x` : pedido.forma === 'pix' ? 'Pix' : pedido.forma} · R$ ${brl(Number(pedido.valor))}${pedido.tipo === 'mensal' ? '/mês' : ''}`],
    ...(pedido.dominio ? [['Domínio', pedido.dominio]] : []),
    ['Cliente', quem],
    ...(cliente ? [['WhatsApp', cliente.whatsapp], ['E-mail', cliente.email]] : []),
  ];
  const texto = `${assunto}\n\n${linhas.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nAbrir no admin: ${link}\n`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p style="font-size:18px;font-weight:600;margin:0 0 16px">${escapar(assunto)}</p>
<table style="border-collapse:collapse">${linhas.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#666">${escapar(k)}</td><td style="padding:4px 0">${escapar(v)}</td></tr>`).join('')}</table>
<p style="margin:24px 0 0"><a href="${escapar(link)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#ff5a1f;color:#120600;text-decoration:none;font-weight:600">Abrir no admin</a></p>
</div>`;
  return { assunto, html, texto };
}
