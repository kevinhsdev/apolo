// Cliente do Supabase (a configuração fica em supabase-config.js).
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON, ligado } from './supabase-config.js';

export { ligado };
export const sb = ligado ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

// entrar sem senha: um código de 6 dígitos chega no e-mail
export const enviarCodigo = email => sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
export const conferirCodigo = (email, token) => sb.auth.verifyOtp({ email, token, type: 'email' });

export async function sessao() {
  if (!ligado) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

// guarda o cadastro do cliente (o RLS só deixa gravar o próprio)
export async function salvarCliente(dados) {
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('clientes').upsert({ id: user.id, email: user.email, ...dados });
  if (error) throw error;
}

export async function criarCobranca(pedido) {
  const { data, error } = await sb.functions.invoke('criar-cobranca', { body: pedido });
  if (error) {
    const corpo = await error.context?.json?.().catch(() => null);
    throw new Error(corpo?.erro || 'Não foi possível gerar a cobrança.');
  }
  return data;
}
