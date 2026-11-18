// Chamada à API do Mercado Pago com o Access Token da conta.
// Segredos (Supabase › Edge Functions › Secrets): MP_ACCESS_TOKEN; MP_URL só no teste local (servidor falso).
export const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
const MP = Deno.env.get('MP_URL') ?? 'https://api.mercadopago.com';

export async function mp(caminho: string, corpo?: unknown, idempotencia?: string) {
  const r = await fetch(MP + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${MP_TOKEN}`,
      'content-type': 'application/json',
      ...(idempotencia ? { 'x-idempotency-key': idempotencia } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(json?.message ?? `Mercado Pago respondeu ${r.status}`), { status: r.status });
  return json;
}
