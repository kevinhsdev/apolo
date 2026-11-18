# Admin da Apolo: etapas dos projetos e aviso de pedidos

Data: 18/11/2026 · Aprovado na conversa (esboço da tela e decisões abaixo).

## Por quê

Os dois sócios hoje atualizam as etapas que o cliente vê editando tabelas no painel do Supabase (feio, arriscado, ruim no celular) e só ficam sabendo de um pedido pelo app do Mercado Pago, que avisa o pagamento sem dizer cliente nem pacote e não avisa quem criou o pedido e não pagou. Querem, nesta ordem: **atualizar as etapas** com facilidade e **saber quando entra pedido**.

## Objetivos

- Página `admin.html` no próprio site, só para os admins (os dois sócios).
- Lista de pedidos, mais novos primeiro, com filtros e contagem: Aguardando, Em produção (pago + em_andamento), Entregues, Todos. Cada linha: cliente, pacote, status, há quanto tempo entrou, etapa atual ("Primeira versão · 3 de 5") e, nos aguardando, botão de WhatsApp para chamar o cliente.
- Ficha do pedido (abre por `admin.html#pedido=<id>`, para o link do e-mail cair direto nela): dados do cliente (nome, e-mail, WhatsApp com botões de conversa e e-mail, CPF/CNPJ mascarado), pacote, forma, valor, domínio, data; troca de status (Pago, Em produção, Entregue) quando já pago; as etapas com "feita" e uma nota editável cada, salvas no banco e vistas na hora pela área do cliente (a nota com link vira o botão "Abrir" lá).
- E-mail para os admins em dois momentos: **pedido criado** ("Novo pedido (ainda não pago): Site Lua · João Lima") e **pedido pago** ("Pedido pago: Site Órbita · Mariana Costa"), cada um com link para a ficha.

## Não objetivos (desta versão)

- Criar, renomear ou apagar etapas (as 5 padrão continuam vindo do gatilho `etapas_padrao`).
- Visão financeira do mês; avisar o cliente por e-mail quando uma etapa avança; notificação push/app; Telegram.
- Editar valor, forma ou cobrança de um pedido; cancelar pelo admin (cancelamento continua vindo do Mercado Pago).
- Atualização ao vivo da lista (recarrega ao abrir, ao voltar para a aba e num botão "Atualizar").

## Anti-objetivos

- Qualquer dado de cliente visível para quem não é admin, mesmo com a página aberta ou chamando a API direto.
- Um erro no envio do e-mail atrapalhar a criação do pedido ou a confirmação do pagamento.
- Admin conseguir mudar campos de pagamento por acidente.
- Página de admin achável: fora de menus, rodapé e busca (`noindex`).

## Restrições

- Mesma stack: Vite multi-page, JS sem framework, Supabase (RLS), Edge Functions em Deno, Resend (domínio apolostudio.com.br já verificado).
- Entrada pelo mesmo código de 6 dígitos no e-mail (`enviarCodigo`/`conferirCodigo` de `src/supabase.js`).
- Visual da área do cliente nova (`src/paginas/conta.css`: superfícies #111, laranja só na ação). Funciona a partir de 360 px.
- Chaves só nos segredos do Supabase, cadastradas pelo Kevin no terminal dele.

## Abordagens consideradas

1. **Página de admin no site (escolhida):** reaproveita login, banco e visual; sem custo; dá para pôr na tela inicial do celular. Exige cuidado de segurança (resolvido com RLS e permissão por coluna).
2. Continuar no painel do Supabase: zero trabalho, mas é o problema de hoje.
3. App nativo: notificação nativa, mas caro e lento para dois usuários.

Aviso: **e-mail pelo Resend (escolhido)**; Telegram (instantâneo, mas exige bot e app) e notificação web (instável no iPhone) ficaram de fora.

## Como (decidido)

- **Quem é admin:** tabela `admins (id uuid → auth.users)`; função `eh_admin()` (security definer) usada nas regras. Cadastro por script `node supabase/admin.mjs <email>` (mesmo jeito do `link-acesso.mjs`: pega a chave service_role pela CLI), depois que a pessoa entrou uma vez pelo site.
- **Regras do banco:** admin lê todos os `clientes`, `pedidos` e `etapas`; admin atualiza só `pedidos.status` e `etapas.feita/nota/atualizado_em` (permissão por coluna, além da regra de linha). Clientes seguem como hoje.
- **Avisos:** módulo compartilhado das funções que monta o e-mail (testável) e envia pela API do Resend sem nunca lançar erro; chamado em `criar-cobranca` depois de gerar o link e em `mercadopago-webhook` quando marca como pago. Destinatários no segredo `ADMIN_EMAILS` (separados por vírgula); chave no segredo `RESEND_API_KEY`.
- **Dois e-mails por venda** quando o cliente paga na hora (decisão do Claude: avisar só quem não pagou depois de 1 h exigiria agendador; ajustar se incomodar).

## Deixado para quem constrói

Reaproveitar o fluxo de entrar da conta sem duplicar código; o layout exato da lista e da ficha (seguindo a área do cliente); como marcar a "etapa atual"; textos de vazio e erro; o que acontece ao tocar numa etapa (salvar na hora ou com botão).
