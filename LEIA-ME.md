# Site da Apolo Studio

Vite + Three.js (a Lua) + Lenis. Base: template Norte (Profitize), adaptado.

- `npm run dev`: abre em http://localhost:5183
- `npm run build`: gera a pasta `dist/`. O GitHub Actions publica no GitHub Pages a cada push na `main`.
- `npm test`: testes das regras da área do cliente e das preferências (`tests/`).

## Preencher antes de publicar
- `src/contato.js` → `WHATSAPP` (55 + DDD + número do WhatsApp Business). Vazio = os botões abrem o Direct do Instagram.
- Quando abrir o CNPJ: colocar CNPJ e cidade/UF no rodapé (`src/partials/rodape-confianca.html`) e em `termos.html` (item 9). O comércio eletrônico pede CNPJ (ou CPF) e endereço de quem vende (Decreto 7.962/2013).
- `reembolso.html`: confirmar a regra depois de 7 dias.

## Onde mexer
- Textos: `index.html`. Preços: atributos `data-avista` / `data-parcelado` dos `.plano`. Prazos: `src/motion/estado.js`.
- Cores: `src/styles/tokens.css`. Lua: `fonte/scripts/lua.py` (texturas NASA em `fonte/nasa/`).
- Imagem de compartilhamento: `fonte/og/og.html` → `public/og.png`.
- Trechos repetidos nas páginas (`<!-- partial:NOME -->`) vêm de `src/partials/NOME.html`, colados no build pelo `vite.config.js`. Página nova: entra em `rollupOptions.input` e leva os dois partials (`a11y-cedo` no `<head>`, `rodape-confianca` no fim do `<body>`).
- Acessibilidade: botão em `src/acessibilidade.js`; regras das preferências em `src/preferencias.js` (a cópia curta em `src/partials/a11y-cedo.html` aplica antes da página aparecer: mude as duas juntas).
- Depois do pagamento o Mercado Pago volta para `obrigado.html?pedido=ID` (regra em `src/paginas/obrigado-dados.js`): agradece, ou espera o webhook, ou oferece tentar de novo.
- Área do cliente (`conta.html#inicio`, `#pedidos`, `#projeto`, `#manutencao`, `#dados`, `#privacidade`, `#preferencias`, `#ajuda`): marcação em `conta.html`, tela em `src/paginas/conta.js`, regras testadas em `src/paginas/conta-dados.js`. As perguntas da Ajuda ficam direto em `conta.html`.

## Área do cliente e cobrança (Supabase + Mercado Pago)

Projeto Supabase `apolo-site` (ref `zmjrzeuwowqgoaazcrgs`, São Paulo). O build de produção lê a URL e a chave
pública de `.env.production`; no `npm run dev`, o `.env.development.local` liga o Supabase local.

- **Banco**: `npx supabase db push --remote` aplica as migrações de `supabase/migrations/`.
- **Funções**: `npx supabase functions deploy criar-cobranca`, `npx supabase functions deploy mercadopago-webhook --no-verify-jwt` `npx supabase functions deploy renovar-mensalidades --no-verify-jwt` e `npx supabase functions deploy cancelar-manutencao`.
- **Segredos**: `MP_ACCESS_TOKEN` (token de produção do Mercado Pago), `MP_WEBHOOK_SECRET` (assinatura secreta do
  webhook) e `SITE_URL`. Troque com `npx supabase secrets set NOME=valor --yes` no PowerShell (nunca no chat).
- **Webhook no Mercado Pago**: Suas integrações › Apolo Studio Site › Webhooks, nos modos teste e produção:
  `https://zmjrzeuwowqgoaazcrgs.supabase.co/functions/v1/mercadopago-webhook`, eventos Pagamentos e Planos e assinaturas.
  Pagamentos com o token de teste chegam como produção (live_mode), por isso as duas URLs.
- **Parcelamento**: "parcelado vendedor" até 6x na conta do Mercado Pago; os preços do cartão em `precos.js` cobrem a taxa.
- **E-mail com código**: SMTP do Resend (domínio verificado; DNS na Hostinger: `resend._domainkey`, `send`, `rsend`),
  remetente `no-reply@apolostudio.com.br`. Modelos "Magic link" e "Confirm sign up" = `supabase/templates/codigo.html`.
  Em Sign In / Providers › Email, "Email OTP length" = 6 (o padrão do Supabase é 8; o site só aceita 6).
- **Sem e-mail?** `node supabase/link-acesso.mjs email@cliente` gera um link de acesso de uso único.

**Manutenção (mensalidade)**: a assinatura do Mercado Pago recusava os cartões (nov/2026), então cada mês é um pedido pago
no Checkout Pro (Pix ou cartão). Todo dia às 9h o GitHub Actions (`.github/workflows/mensalidades.yml`) chama a função
`renovar-mensalidades`: 3 dias antes de vencer, ela cria o pedido do mês seguinte e manda o link por e-mail ao cliente
(que também vê "Pagar mensalidade" na área dele). Pago, o webhook grava `vence_em` (+1 mês). **Cliente cancela** pelo botão "Cancelar manutenção" na área dele (função
`cancelar-manutencao`, avisa os admins por e-mail). Pelo admin, cancelar a mensalidade aberta também para a cadeia. Segredo `CRON_SECRET` igual no Supabase e no GitHub (Settings › Secrets).
Para rodar na hora: GitHub › Actions › Mensalidades › Run workflow.

**No dia a dia**: o andamento de cada projeto você atualiza no Supabase › Table Editor › `etapas`
(marque `feita` e escreva um recado em `nota`, ex.: o link da prévia). O pagamento se marca sozinho pelo webhook.

**Testar no computador** (precisa do Docker aberto):
`npx supabase start` → `npx supabase functions serve --env-file supabase/functions/.env.teste` →
`node supabase/teste-local.mjs` (com um Mercado Pago falso; nada é cobrado de verdade).
As portas locais são 55321+ para não brigar com outros projetos.

## Admin (pedidos)

`apolostudio.com.br/admin.html`: todos os pedidos, a ficha de cada um (contato do cliente, status, etapas e notas). O cliente vê na área dele cada etapa marcada e cada nota. A página não aparece no Google (noindex) e só mostra dados para quem está na tabela `admins` do banco.

- **Painel:** Visão geral (receita do mês, meta, líquido, a receber, MRR, gráfico de 6 meses, "O que fazer hoje", funil e planos), Pedidos e Clientes (tabelas com busca, ordem e exportar CSV) e a ficha de cada pedido. A meta do mês fica em `META_MENSAL` (`src/paginas/admin-dados.js`).
- **Pix 50% + 50%:** o Mercado Pago só cobra a entrada. Quando o restante entrar, abra o pedido e clique em "Marcar restante recebido" para ele entrar nas contas.
- **Limpar pedidos de teste:** em Pedidos, marque os pedidos e clique em "Cancelar" (só os aguardando). Depois, filtre por Cancelados, marque e clique em "Excluir" (para sempre). Se alguém pagar um pedido cancelado pelo link, ele volta sozinho como pago.
- **Dar acesso a alguém:** a pessoa entra uma vez em `/admin.html` com o e-mail dela (vai ver "Sem acesso"). Depois, no PowerShell, na pasta `site`: `node supabase/admin.mjs email@dela.com`. Ela recarrega a página e vê os pedidos.
- **Avisos por e-mail:** a cada pedido criado e a cada pedido pago, chega um e-mail com o link direto para a ficha. Segredos no Supabase: `RESEND_API_KEY` (chave do Resend) e `ADMIN_EMAILS` (e-mails separados por vírgula). Para mudar quem recebe: `npx supabase secrets set ADMIN_EMAILS=a@x.com,b@y.com --yes`. Se o e-mail falhar, o pedido e o pagamento seguem normalmente.
- **Teste do banco (local):** `docker exec -i supabase_db_site psql -U postgres -q -v ON_ERROR_STOP=1 < supabase/teste-admin.sql` precisa imprimir `ok: cliente comum` e `ok: admin`.
