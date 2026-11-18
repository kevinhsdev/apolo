// Gera um link de acesso de uso único para a área do cliente, sem mandar e-mail (útil quando o e-mail do Supabase trava).
// Uso, no PowerShell, na pasta site:  node supabase/link-acesso.mjs seu@email.com
// Copie o link que aparecer e cole na barra de endereço do navegador onde vai fazer o pagamento. Não compartilhe: ele dá acesso à conta.
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const REF = 'zmjrzeuwowqgoaazcrgs';
const email = process.argv[2];
if (!email) { console.log('Uso: node supabase/link-acesso.mjs seu@email.com'); process.exit(1); }

const chaves = JSON.parse(execSync(`npx supabase projects api-keys --project-ref ${REF} -o json`, { encoding: 'utf8' }).replace(/^[^\[{]*/, ''));
const service = chaves.find(k => k.name === 'service_role').api_key;
const admin = createClient(`https://${REF}.supabase.co`, service, { auth: { persistSession: false } });

const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
if (error) { console.error(error.message); process.exit(1); }
console.log('\nCole no navegador (vale uma vez, por pouco tempo):\n\n' + data.properties.action_link + '\n');
