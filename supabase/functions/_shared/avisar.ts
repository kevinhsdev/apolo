// E-mails pelo Resend (avisos aos admins e lembretes de mensalidade). Nunca lança: um e-mail que falha
// não pode travar pedido nem pagamento. Segredos: RESEND_API_KEY e ADMIN_EMAILS (separados por vírgula).
export async function enviarEmail(para: string[], email: { assunto: string; html: string; texto: string }) {
  const chave = Deno.env.get('RESEND_API_KEY');
  if (!chave || !para.length) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000), // Resend travado não segura o link de pagamento
      body: JSON.stringify({ from: 'Apolo Studio <no-reply@apolostudio.com.br>', reply_to: 'contato@apolostudio.com.br', to: para, subject: email.assunto, html: email.html, text: email.texto }),
    });
    if (!r.ok) console.error('e-mail: Resend respondeu', r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error('e-mail:', e);
    return false;
  }
}

export const avisarAdmins = (aviso: { assunto: string; html: string; texto: string }) =>
  enviarEmail((Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map(s => s.trim()).filter(Boolean), aviso);
