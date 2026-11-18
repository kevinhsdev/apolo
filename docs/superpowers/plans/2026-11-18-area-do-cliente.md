# Área do cliente profissional + confiança no site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o painel de 3 abas de `conta.html` por um painel com menu lateral e 8 seções, e dar ao site inteiro acessibilidade, rodapé de confiança e as páginas Termos, Reembolso e Acessibilidade.

**Architecture:** Lógica pura (próximo passo, progresso, máscaras, exportação, preferências) em módulos testáveis com `node --test`; o DOM fica em `conta.js` e `acessibilidade.js`. Trechos de HTML repetidos (rodapé de confiança, aplicação antecipada das preferências) vivem em `src/partials/` e entram nas páginas por um plugin de `transformIndexHtml` no `vite.config.js`, sem template engine.

**Tech Stack:** Vite (multi-page), JS ES modules sem framework, CSS com `src/styles/tokens.css`, Supabase JS (já instalado), `node:test` (Node 24, sem dependência nova).

**Spec:** `docs/superpowers/specs/2026-11-18-area-do-cliente-design.md`

## Global Constraints

- Sem dependência nova; sem mudança no banco (`clientes`, `pedidos`, `etapas` como estão).
- Identidade: preto, branco, laranja `#FF5A1F`, Figtree; tokens de `src/styles/tokens.css`.
- Login por código (6 dígitos) e a tela de entrada atual ficam como estão.
- Acessível: teclado no menu (setas e Tab), foco visível, `aria-current="page"` na seção ativa, contraste AA.
- Funciona a partir de 360 px de largura.
- Nada de selos falsos, logos de bandeiras, depoimentos ou "nota fiscal".
- Texto que depende de dados da empresa ou regra comercial: **[preencher]**.
- `localStorage` sempre em try/catch (pode estar bloqueado).
- Tudo lido com a chave pública + RLS; nenhum dado de outro cliente.

## Review Focus

- Cliente logado sem linha em `clientes` (nunca pagou): painel abre com estados vazios e "Meus dados" deixa cadastrar, com CPF/CNPJ editável só nesse caso (upsert via `salvarCliente`).
- Hash desconhecido (`conta.html#xyz`) ou vazio: abre Visão geral sem erro.
- `localStorage` bloqueado: preferências não quebram a página; só não são lembradas.
- Mais de um pedido de site (ou um cancelado e um pago): Meu projeto ignora cancelados/aguardando e mostra seletor quando há 2+.
- Sessão que expira com o painel aberto: qualquer leitura que voltar sem sessão leva para a tela de entrar.

---

### Task 1: Preferências de acessibilidade no site inteiro

**Files:**
- Create: `src/preferencias.js` (lógica pura + aplicar no `<html>`)
- Create: `src/acessibilidade.js` (botão flutuante + painel)
- Create: `src/acessibilidade.css`
- Create: `src/partials/a11y-cedo.html` (script inline no `<head>`)
- Create: `tests/preferencias.test.js`
- Modify: `vite.config.js` (plugin de partials)
- Modify: todas as páginas de entrada (`index.html`, `privacidade.html`, `projetos.html`, `pagar.html`, `conta.html`, `404.html`): `<!-- partial:a11y-cedo -->` no fim do `<head>`
- Modify: `src/main.js`, `src/paginas/simples.js`, `src/paginas/projetos.js`, `src/paginas/pagar.js`, `src/paginas/conta.js`: `import '../acessibilidade.js'` (ou `./acessibilidade.js`)
- Modify: `src/motion/rolagem.js` (`reduzido` passa a considerar a preferência)

**Interfaces:**
- Produces (`src/preferencias.js`):
  - `CHAVE = 'apolo-pref'`
  - `PADRAO = { texto: 0, contraste: false, movimento: false, links: false }` (`texto`: 0, 1 ou 2)
  - `lerPreferencias(storage = globalThis.localStorage): typeof PADRAO` — JSON inválido, chave ausente ou storage que lança → `PADRAO`; valores fora do domínio são corrigidos (`texto` limitado a 0..2).
  - `salvarPreferencias(p, storage = globalThis.localStorage): void` — nunca lança.
  - `classesDe(p): string[]` — `['a-texto-1'|'a-texto-2', 'a-contraste', 'a-sem-movimento', 'a-links']` conforme ligado.
  - `aplicar(p, html = document.documentElement): void` — tira as classes `a-*` e põe as de `classesDe(p)`; dispara `document.dispatchEvent(new CustomEvent('preferencias', { detail: p }))`.
  - `movimentoReduzido(): boolean` — preferência `movimento` OU `prefers-reduced-motion`.
- Produces (`src/acessibilidade.js`): `montarPainelPreferencias(container: HTMLElement): void` (os mesmos controles, reutilizado na seção Preferências da conta) e, ao ser importado, o botão flutuante.

- [ ] **Step 1: Write the failing test** — `tests/preferencias.test.js` com `node:test`, storage falso `{ getItem, setItem }`:
  - `lerPreferencias` com storage vazio → `PADRAO`; com `'{"texto":5,"contraste":true}'` → `{ texto: 2, contraste: true, movimento: false, links: false }`; com `'xx'` → `PADRAO`; com storage cujo `getItem` lança → `PADRAO`.
  - `salvarPreferencias` com storage que lança não lança.
  - `classesDe({ texto: 1, contraste: true, movimento: true, links: false })` deep-equal `['a-texto-1', 'a-contraste', 'a-sem-movimento']`.
- [ ] **Step 2: Run** `node --test tests/` → FAIL (módulo não existe).
- [ ] **Step 3: Implement `src/preferencias.js`** com as assinaturas acima (`aplicar`/`movimentoReduzido` tocam `document`/`matchMedia` só quando chamadas, para o teste rodar no Node).
- [ ] **Step 4: Run** `node --test tests/` → PASS.
- [ ] **Step 5: Plugin de partials em `vite.config.js`**: `transformIndexHtml(html)` troca cada `<!-- partial:NOME -->` pelo conteúdo de `src/partials/NOME.html` (lido com `readFileSync`; partial inexistente → erro de build com o nome).
- [ ] **Step 6: `src/partials/a11y-cedo.html`**: `<script>` inline, sem import, que lê `localStorage['apolo-pref']` em try/catch e põe as mesmas classes de `classesDe` no `<html>` antes da pintura (lógica duplicada de propósito, 6 linhas; comentário apontando para `preferencias.js`).
- [ ] **Step 7: `src/acessibilidade.js` + `.css`**: botão fixo canto inferior esquerdo (ícone de acessibilidade, `aria-label="Acessibilidade"`, `aria-expanded`), abre um painel (`role="dialog"`, `aria-labelledby`, fecha com Esc e clique fora, foco volta ao botão) com: Tamanho do texto (Normal / Maior / Muito maior, `role="radiogroup"`), Alto contraste, Reduzir animações, Sublinhar links (switches `role="switch"` com `aria-checked`), "Restaurar padrão" e link "Sobre a acessibilidade" → `./acessibilidade.html`. Cada mudança: `salvarPreferencias` + `aplicar`. CSS das classes: `html.a-texto-1 { font-size: 112.5% }`, `.a-texto-2 { 125% }`; `.a-contraste` troca tokens de texto secundário para branco puro e bordas para alto contraste; `.a-sem-movimento *` zera `animation`/`transition` duration; `.a-links a` sublinhado. No celular o botão não pode cobrir a barra inferior da conta (sobe com `body.conta`).
- [ ] **Step 8: Reduzir animações de verdade**: em `src/motion/rolagem.js`, `reduzido` usa `movimentoReduzido()`; os outros módulos que leem `prefers-reduced-motion` direto (`metal.js`, `migracao.js`, `rodape.js`, `cromo-shader.js`) passam a usar `movimentoReduzido()`. Mudança em tempo real não é exigida: vale a partir da próxima carga (texto no painel: "vale ao recarregar a página" só para animações 3D).
- [ ] **Step 9: Verificar** `npm run build` sem erro e `grep -L "apolo-pref" dist/*.html` não lista nenhuma página.
- [ ] **Step 10: Commit** `git add` dos arquivos acima; mensagem `Acessibilidade: texto maior, alto contraste, menos animação e links sublinhados em todo o site`.

### Task 2: Rodapé de confiança e páginas legais

**Files:**
- Create: `src/partials/rodape-confianca.html`
- Create: `termos.html`, `reembolso.html`, `acessibilidade.html` (estrutura e script iguais a `privacidade.html`: `simples.js` + `simples.css`)
- Modify: `vite.config.js` (entradas `termos`, `reembolso`, `acessibilidade`)
- Modify: `index.html:586-589` (bloco `rodape__base` vira `<!-- partial:rodape-confianca -->` + a linha ©)
- Modify: `privacidade.html`, `projetos.html`, `pagar.html`, `conta.html`, `404.html`, páginas novas: `<!-- partial:rodape-confianca -->` antes de `</body>` (na conta, só visível fora do painel ou no fim da Ajuda — ver Task 4)
- Modify: `privacidade.html` (seção "Cookies e armazenamento")
- Modify: `src/paginas/simples.css` (estilo do rodapé simples; `index` usa o estilo de `rodape`)

**Interfaces:**
- Produces: partial com `<div class="confianca">` contendo: linha "Apolo Studio · CNPJ [preencher] · [cidade/UF preencher]"; links Termos de uso, Reembolso e cancelamento, Privacidade, Acessibilidade, Área do cliente; "Formas de pagamento: Pix · Cartão de crédito em até 6x sem juros"; "Pagamento processado pelo Mercado Pago" e "Site seguro (HTTPS)" com ícones SVG simples (cadeado, escudo); e-mail `contato@apolostudio.com.br`.

- [ ] **Step 1: Partial** com o conteúdo acima (links relativos `./termos.html` etc.).
- [ ] **Step 2: Páginas novas** com conteúdo-padrão em PT-BR, títulos `Termos de uso · Apolo Studio` etc., `<meta name="description">`:
  - `termos.html`: objeto (criação e manutenção de sites), contratação e pagamento (Pix com 50% de entrada e 50% na entrega; cartão até 6x), prazos (a partir do briefing completo), revisões incluídas [preencher], propriedade (site é do cliente após quitação; domínio no nome do cliente), manutenção mensal (renova todo mês, cancela a qualquer momento sem multa, vale até o fim do mês pago), responsabilidades, foro [preencher], dados da empresa [preencher].
  - `reembolso.html`: arrependimento em até 7 dias da contratação online (art. 49 do CDC) com devolução integral; depois de iniciado o trabalho, regra [preencher] (texto-padrão: entrada retida proporcional ao que já foi entregue); manutenção: cancela quando quiser, sem reembolso do mês em curso; como pedir (e-mail/WhatsApp, prazo de resposta [preencher]); estorno pelo mesmo meio de pagamento via Mercado Pago (prazo da operadora).
  - `acessibilidade.html`: o que o site oferece (botão de acessibilidade e cada opção, navegação por teclado, textos alternativos, respeito a "reduzir movimento" do sistema), compromisso com WCAG 2.1 AA, como relatar um problema (e-mail).
- [ ] **Step 3: `privacidade.html`**: seção "Cookies e armazenamento": não usamos cookies de rastreamento nem anúncios; o navegador guarda só a sessão da área do cliente e as preferências de acessibilidade; pagamentos no Mercado Pago seguem a política deles (link).
- [ ] **Step 4: Inserir o partial** nas páginas listadas e registrar as 3 entradas no `vite.config.js`.
- [ ] **Step 5: Verificar** `npm run build`; `ls dist/termos.html dist/reembolso.html dist/acessibilidade.html`; `grep -c "Mercado Pago" dist/index.html` ≥ 1; nenhum link quebrado: `grep -oh 'href="\./[a-z]*\.html"' dist/*.html | sort -u` só lista páginas que existem em `dist/`.
- [ ] **Step 6: Commit** `Rodapé de confiança e páginas de termos, reembolso e acessibilidade`.

### Task 3: Lógica pura do painel

**Files:**
- Create: `src/paginas/conta-dados.js`
- Create: `tests/conta-dados.test.js`

**Interfaces:**
- Consumes: `CATALOGO` de `src/precos.js`.
- Produces (todas puras; `pedidos` e `etapas` no formato das tabelas):
  - `SECOES = ['inicio', 'pedidos', 'projeto', 'manutencao', 'dados', 'privacidade', 'preferencias', 'ajuda']`
  - `secaoDoHash(hash: string): string` — `'#pedidos'` → `'pedidos'`; desconhecido/vazio → `'inicio'`.
  - `projetosAtivos(pedidos): Pedido[]` — `tipo === 'site'` e status em `pago | em_andamento | entregue`, mais recente primeiro.
  - `manutencao(pedidos): { estado: 'ativa' | 'pendente' | 'nenhuma', pedido?: Pedido }` — `tipo === 'mensal'`: `pago` → ativa; `aguardando` → pendente; ignora `cancelado`.
  - `progresso(etapas): { feitas: number, total: number, pct: number, atual: Etapa | null }` — `pct` inteiro 0..100; `total` 0 → `pct` 0.
  - `proximoPasso(pedidos, etapas): { tipo: 'pagar' | 'etapa' | 'entregue' | 'comecar', texto: string, link?: string }` — prioridade: pedido `aguardando` mais recente com `link_fatura` → `pagar` (texto "Conclua o pagamento do <nome>", link); senão projeto ativo com etapa não feita → `etapa` (texto = nome da etapa atual); senão projeto ativo todo feito → `entregue`; senão `comecar`.
  - `mascararDoc(doc: string): string` — 11 dígitos → `***.456.***-09` (mesma regra de `conta.js:153`), 14 → `**.345.***/****-90`, outro → `''`.
  - `montarExportacao({ cliente, pedidos, etapas, email }): string` — JSON com 2 espaços, chaves `exportado_em`, `conta: { email }`, `cadastro`, `pedidos`, `etapas`; remove `cobranca` dos pedidos.
  - `nomePedido(p): string` — `Site Órbita` / `Manutenção Plus` (usa `CATALOGO`), fallback `p.plano`.
  - `linkProximaEtapa(nota: string): string | null` — primeira URL `https://…` na nota.

- [ ] **Step 1: Write the failing tests** em `tests/conta-dados.test.js` cobrindo: `secaoDoHash('#xyz') === 'inicio'`, `secaoDoHash('') === 'inicio'`, `secaoDoHash('#ajuda') === 'ajuda'`; `projetosAtivos` ignora `cancelado` e `aguardando` e ordena por `criado_em` desc com 2 sites; `manutencao` → `nenhuma` só com cancelada, `pendente` com aguardando, `ativa` com paga; `progresso([])` → `{ feitas: 0, total: 0, pct: 0, atual: null }` e 2 de 5 feitas → `pct === 40`, `atual` = 3ª; `proximoPasso` nas quatro situações (pagar ganha de etapa); `mascararDoc('12345678909') === '***.456.***-09'`, `mascararDoc('12345678000190') === '**.345.***/****-90'`, `mascararDoc('') === ''`; `montarExportacao` não contém `"cobranca"` e `JSON.parse` dá `conta.email`; `linkProximaEtapa('veja https://previa.apolo.dev/x ok') === 'https://previa.apolo.dev/x'`, sem URL → `null`.
- [ ] **Step 2: Run** `node --test tests/` → FAIL.
- [ ] **Step 3: Implement** `src/paginas/conta-dados.js`.
- [ ] **Step 4: Run** `node --test tests/` → PASS (inclui os testes da Task 1).
- [ ] **Step 5: Commit** `Área do cliente: regras do painel (próximo passo, progresso, exportação)`.

### Task 4: Estrutura e visual do painel

**Files:**
- Modify: `conta.html:78-113` (substitui a seção `data-vista="painel"`)
- Modify: `src/paginas/conta.css`
- Uses: skill `direcao-de-arte` para o acabamento visual

**Interfaces:**
- Produces (marcação que a Task 5 preenche):
  - `<nav class="painel__menu" aria-label="Área do cliente">` com 8 links `<a href="#inicio" data-ir="inicio">` … na ordem de `SECOES`, ícone SVG + rótulo (Visão geral, Pedidos e pagamentos, Meu projeto, Manutenção, Meus dados, Privacidade e segurança, Preferências, Ajuda); rodapé do menu com nome/e-mail do cliente (`data-menu-nome`, `data-menu-email`) e botão Sair (`data-sair`).
  - `<main class="painel__conteudo">` com 8 `<section id="s-<secao>" data-secao="<secao>" tabindex="-1" hidden>`, cada uma com `<h1>` próprio.
  - Visão geral: `data-ola`, `data-passo` (cartão com texto + botão), `data-projeto-resumo` (nome, barra de progresso `role="progressbar"` com `aria-valuenow`, etapa atual), `data-resumo-pagamentos` (total pago, pendentes), `data-resumo-manutencao`.
  - Pedidos: filtros `data-filtro="todos|aguardando|pago|cancelado"` (`aria-pressed`), lista `data-pedidos`, vazio `data-pedidos-vazio`.
  - Projeto: `<select data-projeto-escolha hidden>`, `data-projeto-nome`, `data-projeto-rotulo`, `ol data-etapas`, vazio `data-projeto-vazio`.
  - Manutenção: `data-manutencao` (cartão por estado), botão `data-manutencao-alterar`.
  - Dados: form `data-dados` (campos atuais + `#d-doc` editável quando `data-doc-livre`), `data-dados-estado`.
  - Privacidade: botões `data-baixar-dados`, `data-sair-todos`, `data-pedir-exclusao`, texto `data-ultimo-acesso`, `data-privacidade-estado`.
  - Preferências: `<div data-preferencias>` (preenchido por `montarPainelPreferencias`).
  - Ajuda: `<details>` com 6 perguntas (prazo de entrega, formas de pagamento e parcelamento, reembolso → link, pedir alterações, cancelar manutenção, segurança do pagamento) e cartão de contato (`data-whats` texto padrão "Olá! Sou cliente da Apolo e preciso de ajuda.", e-mail `contato@apolostudio.com.br`); o partial `rodape-confianca` no fim.
- Layout: ≥ 960 px, grade `260px 1fr`, menu fixo à esquerda com altura da tela; < 960 px, menu vira barra inferior fixa com 5 itens (Visão geral, Pedidos, Projeto, Ajuda, "Mais") onde "Mais" abre folha com os outros 3 + Sair; `padding-bottom` do conteúdo para a barra; o cabeçalho `pagar__topo` some no painel (logo vai para o topo do menu).

- [ ] **Step 1: Marcação** conforme acima (sem JS novo além do que a Task 5 liga; a vista "entrar" e "desligada" ficam intactas).
- [ ] **Step 2: CSS** do painel com os tokens; estados: item ativo (`aria-current`), foco visível, selos de status (`is-aguardando` laranja, `is-pago` verde, `is-cancelado` cinza), estados vazios com ícone e ação, barra de progresso.
- [ ] **Step 3: Conferir visual** com a skill `direcao-de-arte` (captura em 1440×900 e 390×844 via `npm run dev` + navegador), ajustar até não parecer template.
- [ ] **Step 4: Commit** `Área do cliente: painel com menu lateral e 8 seções`.

### Task 5: Ligar o painel aos dados

**Files:**
- Modify: `src/paginas/conta.js:78-181` (substitui abas e pintura atuais; mantém o fluxo de entrar das linhas 23-76)

**Interfaces:**
- Consumes: Task 3 (todas as funções), Task 1 (`montarPainelPreferencias`), `sb`, `sessao`, `salvarCliente` de `src/supabase.js`, `linkConversa` de `src/contato.js`.

- [ ] **Step 1: Navegação**: `irPara(secao)` mostra só `#s-<secao>`, põe `aria-current="page"` no link, atualiza `document.title` ("<Rótulo> · Área do cliente · Apolo Studio"), foca o `<h1>` da seção; ouve `hashchange`; abre em `secaoDoHash(location.hash)`; setas ↑/↓ movem o foco no menu.
- [ ] **Step 2: Carregar**: após `sessao()`, busca cliente, pedidos e as etapas de todos os `projetosAtivos` (uma consulta `.in('pedido_id', ids)`); se alguma resposta vier com erro de autenticação (status 401) → `mostrar('entrar')`.
- [ ] **Step 3: Pintar** cada seção com as funções da Task 3: Visão geral (`proximoPasso`, `progresso`, totais: soma de `valor` dos pagos de site, contagem de aguardando; `manutencao`), Pedidos (lista atual de `pintarPedidos` + filtro), Projeto (seletor quando `projetosAtivos().length > 1`; botão "Abrir" para `linkProximaEtapa(nota)`), Manutenção (ativa: plano, valor/mês, desde `criado_em`; pendente: botão pagar; nenhuma: link `./#pacotes`; "Alterar ou cancelar" abre `linkConversa('Olá! Quero alterar/cancelar minha manutenção <nome>.')`).
- [ ] **Step 4: Dados**: sem linha em `clientes`, `#d-doc` fica editável e vazio, e salvar usa `salvarCliente({ nome, whatsapp, cpf_cnpj })` validando 11 ou 14 dígitos; com cadastro, segue o `update` atual e o doc mascarado com `mascararDoc`.
- [ ] **Step 5: Privacidade**: "Baixar meus dados" gera `Blob` de `montarExportacao` e baixa `apolo-meus-dados.json`; "Sair de todos os aparelhos" → `sb.auth.signOut({ scope: 'global' })` + limpar `apolo-nome` + recarregar; "Pedir exclusão" → `linkConversa('Olá! Quero excluir minha conta da Apolo (e-mail <email>).')` em nova aba, com texto explicando a guarda de registros fiscais; último acesso de `s.user.last_sign_in_at`.
- [ ] **Step 6: Preferências**: `montarPainelPreferencias($('[data-preferencias]'))`.
- [ ] **Step 7: Verificar no navegador** com `npm run build && npm run preview` (o build usa o Supabase na nuvem de `.env.production`; o `npm run dev` usaria o local), logado: cada seção abre pelo menu e pelo hash, `#xyz` cai em Visão geral, filtro de pedidos funciona, exportação baixa JSON sem `cobranca`, celular mostra barra inferior; `node --test tests/` PASS.
- [ ] **Step 8: Commit** `Área do cliente: seções ligadas aos pedidos, projeto, manutenção e privacidade`.

### Task 6: Fechamento

**Files:**
- Modify: `LEIA-ME.md` (seção curta: seções da conta, onde editar FAQ, páginas legais com [preencher], `node --test tests/`)

- [ ] **Step 1:** `node --test tests/` PASS e `npm run build` sem erro.
- [ ] **Step 2:** Listar para o Kevin todos os `[preencher]` (`grep -rn "\[preencher\]" *.html src/partials`).
- [ ] **Step 3: Commit** `LEIA-ME: área do cliente e páginas legais`. Push só quando o Kevin pedir.
