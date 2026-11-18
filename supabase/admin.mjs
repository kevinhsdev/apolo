// Torna um e-mail admin (vê todos os pedidos em admin.html). A pessoa precisa ter entrado uma vez pelo site.
// Uso, no PowerShell, na pasta site:  node supabase/admin.mjs socio@email.com
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const REF = 'zmjrzeuwowqgoaazcrgs';
const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) { console.log('Uso: node supabase/admin.mjs email@exemplo.com'); process.exit(1); }

const chaves = JSON.parse(execSync(`npx supabase projects api-keys --project-ref ${REF} -o json`, { encoding: 'utf8' }).replace(/^[^\[{]*/, ''));
const service = chaves.find(k => k.name === 'service_role').api_key;
const db = createClient(`https://${REF}.supabase.co`, service, { auth: { persistSession: false } });

let usuario;
for (let page = 1; !usuario; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error(error.message); process.exit(1); }
  usuario = data.users.find(u => u.email?.toLowerCase() === email);
  if (data.users.length < 200) break;
}
if (!usuario) {
  console.log(`Nenhuma conta com ${email}. Entre uma vez em apolostudio.com.br/admin.html com esse e-mail e rode de novo.`);
  process.exit(1);
}
const { error } = await db.from('admins').upsert({ id: usuario.id });
if (error) { console.error(error.message); process.exit(1); }
console.log(`Admin: ${email}`);
