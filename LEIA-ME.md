# Site da Apolo Studio

Vite + Three.js (a Lua) + Lenis. Base: template Norte (Profitize), adaptado.

- `npm run dev`: abre em http://localhost:5183
- `npm run build`: gera a pasta `dist/`, que vai para a hospedagem (Vercel, Netlify ou Cloudflare Pages: arraste a pasta ou conecte o repositório)

## Preencher antes de publicar
- `src/contato.js` → `WHATSAPP` (55 + DDD + número). Vazio = os botões abrem o Direct do Instagram.
- `index.html` e `privacidade.html` → e-mail `[preencher]@apolostudio.com.br`.
- Registrar **apolostudio.com.br** no Registro.br e o Instagram **@apolostudio.br**.

## Onde mexer
- Textos: `index.html`. Preços: atributos `data-avista` / `data-parcelado` dos `.plano`. Prazos: `src/motion/estado.js`.
- Cores: `src/styles/tokens.css`. Lua: `fonte/scripts/lua.py` (texturas NASA em `fonte/nasa/`).
- Imagem de compartilhamento: `fonte/og/og.html` → `public/og.png`.

## Área do cliente e cobrança (Supabase + Asaas)

Enquanto `src/supabase-config.js` estiver vazio, a área do cliente fica desligada e a tela de cobrança
(`pagar.html`) envia o pedido pela conversa. Para ligar, uma vez só:

1. **Supabase**: crie uma conta e um projeto em supabase.com (plano gratuito; região São Paulo).
2. **Banco**: no terminal, dentro de `site/`:
   `npx supabase login` → `npx supabase link --project-ref <id do projeto>` → `npx supabase db push`
   (cria as tabelas e as regras de acesso de `supabase/migrations/`).
3. **E-mail com código**: Supabase › Authentication › Emails › Templates. Em "Magic Link" e em
   "Confirm signup", cole o HTML de `supabase/templates/codigo.html` (assunto: "Seu código de acesso · Apolo Studio").
   Em Authentication › URL Configuration, ponha o endereço do site em Site URL.
4. **Asaas**: crie a chave de API (Integrações › Chaves de API). Comece pela conta sandbox
   (sandbox.asaas.com) para testar sem dinheiro de verdade.
5. **Segredos das funções**: `npx supabase secrets set ASAAS_API_KEY=<chave> ASAAS_WEBHOOK_TOKEN=<uma senha longa sua>`
   e, quando for para produção, `ASAAS_URL=https://api.asaas.com/v3` (sem ele, usa o sandbox).
6. **Funções**: `npx supabase functions deploy criar-cobranca` e `npx supabase functions deploy asaas-webhook --no-verify-jwt`.
7. **Webhook no Asaas**: Integrações › Webhooks › novo: URL `https://<id>.supabase.co/functions/v1/asaas-webhook`,
   token de autenticação = o mesmo `ASAAS_WEBHOOK_TOKEN`, eventos de cobrança (pagamento recebido/confirmado, estorno).
8. **Site**: em `src/supabase-config.js`, preencha a Project URL e a chave "anon public" (Project Settings › API).
   Ela é pública por natureza; quem protege os dados são as regras do banco.

**No dia a dia**: o andamento de cada projeto você atualiza no Supabase › Table Editor › `etapas`
(marque `feita` e escreva um recado em `nota`, ex.: o link da prévia). O pagamento se marca sozinho pelo webhook.

**Testar no computador** (precisa do Docker aberto):
`npx supabase start` → `npx supabase functions serve --env-file supabase/functions/.env.teste` →
`node supabase/teste-local.mjs` (15 verificações, com um Asaas falso; nada é cobrado de verdade).
As portas locais são 55321+ para não brigar com outros projetos.
