// Conexão com a área do cliente (Supabase). Preencha depois de criar o projeto:
// Supabase › Project Settings › API › Project URL e a chave "anon public" (é pública, pode ficar no site).
// Vazio: a área do cliente fica desligada e a tela de cobrança envia o pedido pela conversa.
// (no "npm run dev", o .env.development.local liga o Supabase local)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''; // [preencher] ex.: 'https://abcdxyz.supabase.co'
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || ''; // [preencher]
export const ligado = !!(SUPABASE_URL && SUPABASE_ANON);
// onde o supabase-js guarda a sessão: o botão do topo lê daqui sem carregar a biblioteca
export const CHAVE_SESSAO = ligado ? `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token` : '';
