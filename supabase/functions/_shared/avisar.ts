// Envia o aviso aos admins pelo Resend. Nunca lança: um e-mail que falha não pode travar pedido nem pagamento.
// Segredos: RESEND_API_KEY e ADMIN_EMAILS (separados por vírgula). Sem eles, não faz nada.
export async function avisarAdmins(aviso: { assunto: string; html: string; texto: string }) {
  const chave = Deno.env.get('RESEND_API_KEY');
  const para = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!chave || !para.length) return;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Apolo Studio <no-reply@apolostudio.com.br>', to: para, subject: aviso.assunto, html: aviso.html, text: aviso.texto }),
    });
    if (!r.ok) console.error('aviso: Resend respondeu', r.status, await r.text());
  } catch (e) {
    console.error('aviso:', e);
  }
}
