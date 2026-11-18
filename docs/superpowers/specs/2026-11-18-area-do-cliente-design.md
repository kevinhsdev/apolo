# Área do cliente profissional + confiança no site

Data: 2026-11-18

## Intenção

A Apolo vende sites com pagamento online (Mercado Pago). Hoje a área do cliente (`conta.html`) é uma página com 3 abas
e o site não tem o que um comprador procura antes de pagar (termos, reembolso, CNPJ, acessibilidade).
Objetivo: **passar o máximo de confiança**, com uma área do cliente com cara de produto de empresa grande e os itens de
confiança que sites que vendem online têm.

## Metas

- Área do cliente em formato de **painel com menu lateral** (desktop) e **barra inferior** (celular), com seções:
  1. **Visão geral**: saudação, cartão do projeto atual (etapa atual, % concluído), "próximo passo" com ação
     (pagar pendência → link do Mercado Pago; briefing → WhatsApp), resumo de pagamentos e manutenção.
  2. **Pedidos e pagamentos**: lista de pedidos (plano, data, forma, parcelas, valor, status com selo colorido);
     pendentes com botão "Pagar agora" (`link_fatura`); filtro por status.
  3. **Meu projeto**: linha do tempo vertical das etapas (`etapas`: feita, data, `nota`); links em `nota` viram botões
     (ex.: "Ver prévia"). Se houver mais de um pedido de site, seletor do projeto.
  4. **Manutenção**: plano mensal ativo (nome, valor/mês, desde quando, status) ou convite para assinar;
     "Alterar ou cancelar" → WhatsApp/Direct com o pedido já escrito (o Mercado Pago também permite cancelar
     pela conta do cliente; texto explica).
  5. **Meus dados**: nome, WhatsApp, CPF/CNPJ (mascarado), e-mail (só leitura). Salvar como hoje.
  6. **Privacidade e segurança**: "Baixar meus dados" (JSON com cliente, pedidos, etapas, gerado no navegador),
     "Sair de todos os aparelhos" (`signOut({ scope: 'global' })`), "Pedir exclusão da conta" (mensagem pronta;
     explica que registros fiscais são guardados pelo prazo legal), último acesso.
  7. **Preferências**: as mesmas opções do botão de acessibilidade (abaixo), com explicação.
  8. **Ajuda**: perguntas frequentes curtas (prazo, pagamento, reembolso, alterações, manutenção) e contato.
- **No site inteiro** (todas as páginas, via um módulo comum):
  - **Botão de acessibilidade** flutuante: texto maior (2 passos), alto contraste, reduzir animações,
    sublinhar links. Guardado no `localStorage`; aplicado antes da pintura (sem piscar). "Reduzir animações"
    também respeita `prefers-reduced-motion` e desliga Lua/cromo animados.
  - **Rodapé de confiança**: razão social e CNPJ, links (Termos, Reembolso, Privacidade, Acessibilidade),
    formas de pagamento (Pix, cartão em até 6x), "Pagamento processado pelo Mercado Pago", "Site seguro (HTTPS)",
    contato.
  - **Páginas novas**: `termos.html`, `reembolso.html` (reembolso e cancelamento, alinhado ao CDC: arrependimento
    em 7 dias para compra online), `acessibilidade.html` (o que o site oferece e como pedir ajuda).
    Texto-padrão com dados da empresa e regras comerciais marcados **[preencher]**.
  - `privacidade.html`: acrescentar a seção "Cookies e armazenamento": o site **não usa cookies de rastreamento**;
    só guarda no navegador a sessão da conta e as preferências.

## Fora do escopo (pedido para depois)

Chat de suporte, avaliações de clientes, nova seção de projetos/biblioteca, nota fiscal para baixar (precisa de
serviço de NFS-e), tema claro no site inteiro.

## Anti-metas

- Cara de template genérico de dashboard; perder a identidade (preto, branco, laranja #FF5A1F, Figtree, a Lua).
- Prometer o que não existe (selos falsos, "nota fiscal" sem emissão, depoimentos inventados).
- Banner de cookies pedindo consentimento sem haver rastreamento (ruído que passa a impressão contrária).
- Expor dados de outro cliente: tudo continua lido com a chave pública + RLS.

## Restrições

- Mesmo stack: Vite, HTML + JS sem framework, CSS com os tokens de `src/styles/tokens.css`.
- Sem mudança no banco: as seções usam `clientes`, `pedidos`, `etapas` como estão.
- Login por código (6 dígitos) e tela de entrada atual são mantidos.
- Acessível: navegação por teclado no menu (setas/Tab), foco visível, rótulos, contraste AA, `aria-current`.
- Funciona a partir de 360 px de largura.

## Abordagens consideradas

- **A. Painel com menu lateral** (escolhida pelo Kevin): formato que o cliente reconhece (bancos, Stripe, Hostinger);
  mais trabalho, mais confiança.
- B. Página única com seções empilhadas: rápida, mas com cara de página comum.
- C. Modelo pronto de dashboard: rápido, genérico e contra a identidade da marca.

## Decisões do builder (chamadas minhas, podem ser corrigidas)

- Navegação por hash (`conta.html#pedidos`) para o botão voltar funcionar e dar para mandar link direto de uma seção.
- Sem tema claro: "alto contraste" cobre a necessidade de acessibilidade sem refazer o site todo.
- Exclusão de conta por pedido (mensagem), não automática: pedidos pagos precisam ficar registrados.
- Selo de pagamento em texto + ícones simples, sem logos de bandeiras de cartão.
- Visual dos detalhes (espaçamentos, ícones, estados vazios) segue a skill de direção de arte do projeto e é
  conferido no navegador em desktop e celular.
