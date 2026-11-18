# Site da Apolo Studio

Vite + Three.js (a Lua) + Lenis. Base: template Norte (Profitize), adaptado.

- `npm run dev`: abre em http://localhost:5183
- `npm run build`: gera a pasta `dist/`. O GitHub Actions publica no GitHub Pages a cada push na `main`.

## Preencher antes de publicar
- `src/contato.js` → `WHATSAPP` (55 + DDD + número). Vazio = os botões abrem o Direct do Instagram.
- `index.html` e `privacidade.html` → e-mail `[preencher]@apolostudio.com.br`.
- Registrar **apolostudio.com.br** no Registro.br e o Instagram **@apolostudio.br**.

## Onde mexer
- Textos: `index.html`. Preços: atributos `data-avista` / `data-parcelado` dos `.plano`. Prazos: `src/motion/estado.js`.
- Cores: `src/styles/tokens.css`. Lua: `fonte/scripts/lua.py` (texturas NASA em `fonte/nasa/`).
- Imagem de compartilhamento: `fonte/og/og.html` → `public/og.png`.

## Área do cliente e cobrança (Supabase + Mercado Pago)

Projeto Supabase `apolo-site` (ref `zmjrzeuwowqgoaazcrgs`, São Paulo). O build de produção lê a URL e a chave
pública de `.env.production`; no `npm run dev`, o `.env.development.local` liga o Supabase local.

- **Banco**: `npx supabase db push --remote` aplica as migrações de `supabase/migrations/`.
- **Funções**: `npx supabase functions deploy criar-cobranca` e `npx supabase functions deploy mercadopago-webhook --no-verify-jwt`.
- **Segredos**: `MP_ACCESS_TOKEN` (token de produção do Mercado Pago), `MP_WEBHOOK_SECRET` (assinatura secreta do
  webhook) e `SITE_URL`. Troque com `npx supabase secrets set NOME=valor --yes` no PowerShell (nunca no chat).
- **Webhook no Mercado Pago**: Suas integrações › Apolo Studio Site › Webhooks, nos modos teste e produção:
  `https://zmjrzeuwowqgoaazcrgs.supabase.co/functions/v1/mercadopago-webhook`, eventos Pagamentos e Planos e assinaturas.
  Pagamentos com o token de teste chegam como produção (live_mode), por isso as duas URLs.
- **Parcelamento**: "parcelado vendedor" até 6x na conta do Mercado Pago; os preços do cartão em `precos.js` cobrem a taxa.
- **E-mail com código**: SMTP do Resend (domínio verificado; DNS na Hostinger: `resend._domainkey`, `send`, `rsend`),
  remetente `no-reply@apolostudio.com.br`. Modelos "Magic link" e "Confirm sign up" = `supabase/templates/codigo.html`.
- **Sem e-mail?** `node supabase/link-acesso.mjs email@cliente` gera um link de acesso de uso único.

**No dia a dia**: o andamento de cada projeto você atualiza no Supabase › Table Editor › `etapas`
(marque `feita` e escreva um recado em `nota`, ex.: o link da prévia). O pagamento se marca sozinho pelo webhook.

**Testar no computador** (precisa do Docker aberto):
`npx supabase start` → `npx supabase functions serve --env-file supabase/functions/.env.teste` →
`node supabase/teste-local.mjs` (com um Mercado Pago falso; nada é cobrado de verdade).
As portas locais são 55321+ para não brigar com outros projetos.
