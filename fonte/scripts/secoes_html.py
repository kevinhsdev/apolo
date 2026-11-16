# Troca as seções de foto (diagnóstico e contato) por seções sem imagem.
# Rode: python fonte/scripts/secoes_html.py
import os

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
p = os.path.join(RAIZ, 'index.html')
s = open(p, encoding='utf-8').read()

IC = {
    'grade': '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    'raio': '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    'busca': '<path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.6-4.6"/>',
    'escudo': '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    'cadeado': '<path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
    'cel': '<path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2"/>',
    'arquivo': '<path d="M6.5 3.5h7l4 4v13h-11zM13.5 3.5v4h4M9 13h6M9 16.5h6"/>',
    'moeda': '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 9.5c0-1 1-1.8 3-1.8s3 .8 3 2-1.3 1.7-3 2.1-3 .9-3 2.2 1 2 3 2 3-.8 3-1.8M12 6v1.7M12 16.3V18"/>',
    'chat': '<path d="M4.5 18.5 6 15a7.5 7.5 0 1 1 3 3z"/>',
    'lista': '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    'pontos': '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
    'mao': '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5"/>',
}


def i(n, t=16):
    return f'<svg viewBox="0 0 24 24" width="{t}" height="{t}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{IC[n]}</svg>'


MARCA = '<svg class="ra-marca" viewBox="210 226 315 280" aria-hidden="true"><path d="M318 241h100l97 169-25 45L367.5 302 245 455l-25-45z"/><path d="M245 455Q367.5 355 490 455l-20 38Q367.5 407 265 493z"/></svg>'

NAV = [('grade', 'Visão geral', True), ('raio', 'Velocidade', False), ('busca', 'Google', False),
       ('escudo', 'LGPD', False), ('cadeado', 'Segurança', False), ('cel', 'Celular', False)]
LISTA = [
    ('Tempo para abrir no 4G', 'Velocidade'),
    ('Imagens pesadas demais', 'Velocidade'),
    ('Título e descrição no Google', 'Google'),
    ('Google Meu Negócio ligado ao site', 'Google'),
    ('Aviso de cookies e privacidade', 'LGPD'),
    ('Consentimento nos formulários', 'LGPD'),
    ('Cadeado de segurança (HTTPS)', 'Segurança'),
    ('Botões no tamanho do dedo', 'Celular'),
]
DESC = 'O que deixa o seu site lento no celular, o que impede ele de aparecer no Google e o que falta para ficar dentro da LGPD, na ordem do que corrigir primeiro.'
ETAPAS = [
    ('1', 'Você manda o endereço', 'Aqui ao lado, em dez segundos.'),
    ('2', 'A gente passa o Padrão Apolo', 'Os mesmos 30 itens que conferimos nos nossos sites.'),
    ('3', 'Você recebe e decide', 'Pelo WhatsApp. Corrigir com a gente é opcional.'),
]

nav = ''.join(f'<span class="ra-nav{" is-ativo" if on else ""}">{i(ic)}<span>{n}</span></span>' for ic, n, on in NAV)
lista = ''.join(
    f'<span class="ra-item{" is-ativo" if k == 0 else ""}" style="--i:{k}">{i("arquivo", 17)}<span class="ra-item-main"><b>{t}</b><small>{c}</small></span><span class="ra-check" aria-hidden="true"></span></span>'
    for k, (t, c) in enumerate(LISTA))
etapas = ''.join(
    f'<li class="{"is-atual" if k == 0 else ""}" style="--i:{k}"><span class="ra-dot"></span><span class="ra-vh-body"><b>{t}</b><span>{d}</span></span></li>'
    for k, (_, t, d) in enumerate(ETAPAS))

diagnostico = f'''    <section class="relevo" id="diagnostico" aria-labelledby="relevo-titulo">
      <div class="relevo__copy">
        <span class="relevo__eyebrow">Diagnóstico grátis</span>
        <h2 class="relevo__title" id="relevo-titulo">Já tem site? A gente abre ele por dentro.</h2>
        <p class="relevo__texto">Mande o endereço e receba o raio-x do seu site: velocidade no celular, Google e LGPD. Sem compromisso.</p>
        <form class="linha-form" data-migracao novalidate>
          <div class="campo">
            <label for="m-site">Endereço do site</label>
            <input id="m-site" name="site" placeholder="seusite.com.br" autocomplete="url" inputmode="url" autocapitalize="none" spellcheck="false">
            <span class="campo__erro" role="alert"></span>
          </div>
          <div class="campo">
            <label for="m-nome">Seu nome</label>
            <input id="m-nome" name="nome" placeholder="Como podemos te chamar" autocomplete="name">
            <span class="campo__erro" role="alert"></span>
          </div>
          <button class="botao" type="submit"><span class="rola">Pedir diagnóstico</span></button>
          <p class="linha-form__ok" role="status"></p>
        </form>
        <p class="migracao__lgpd">O pedido abre no WhatsApp. Usamos seus dados só para responder. <a class="link" href="./privacidade.html">Privacidade</a></p>
      </div>
      <div class="relevo__stage">
        <div class="relevo__app" aria-hidden="true">
          <div class="ra-top">
            <span class="ra-logo">{MARCA}diagnóstico</span>
            <span class="ra-search">{i('busca', 15)}<span data-raio-url>seusite.com.br</span><kbd>Padrão Apolo</kbd></span>
            <span class="ra-actions">{i('lista', 17)}{i('pontos', 17)}</span>
          </div>
          <div class="ra-body">
            <div class="ra-side">
              {nav}
              <span class="ra-label">Relatório</span>
              <span class="ra-nav">{i('chat')}<span>No WhatsApp</span></span>
            </div>
            <div class="ra-list">
              <span class="ra-list-head"><span>O que conferimos</span><span class="ra-varre" aria-hidden="true"></span></span>
              <div class="ra-rows">{lista}</div>
            </div>
            <div class="ra-detail">
              <h3>O seu relatório</h3>
              <p class="ra-desc" aria-label="{DESC}"><span class="ra-typed"></span><span class="ra-caret"></span><span class="ra-rest">{DESC}</span></p>
              <dl class="ra-meta">
                <div><dt>{i('moeda', 15)} Custo</dt><dd>Grátis</dd></div>
                <div><dt>{i('chat', 15)} Entrega</dt><dd>Pelo WhatsApp</dd></div>
                <div><dt>{i('escudo', 15)} Base</dt><dd class="ra-tags"><span>velocidade</span><span>google</span><span>lgpd</span></dd></div>
                <div><dt>{i('mao', 15)} Compromisso</dt><dd>Nenhum</dd></div>
              </dl>
              <h4 class="ra-vh-title">Como funciona</h4>
              <ol class="ra-vh">{etapas}</ol>
            </div>
          </div>
        </div>
      </div>
    </section>

'''

ASSUNTOS = ['Site novo', 'Manutenção', 'Orçamento', 'Só uma dúvida']
chips = ''.join(
    f'<button type="button" class="chip" aria-pressed="{"true" if k == 0 else "false"}" data-assunto="{a}">{a}</button>'
    for k, a in enumerate(ASSUNTOS))
SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>'
contato = f'''    <section class="suporte" id="contato" aria-labelledby="suporte-titulo">
      <div class="suporte__horizonte" aria-hidden="true"></div>
      <div class="suporte__conteudo">
        <div class="numero numero--c" data-numero>
          <p class="numero__valor suporte__relogio" data-relogio aria-label="Hora local"><span data-h>00</span><span class="suporte__dois">:</span><span data-m>00</span></p>
          <p class="numero__legenda">é a hora aí. Do outro lado, um dos sócios.</p>
        </div>
        <h2 class="titulo" id="suporte-titulo" data-revela><span class="linha"><span>Fale com</span></span><span class="linha"><span>quem faz.</span></span></h2>
        <p class="corpo" data-revela>Sem robô e sem fila. Escreva aqui e a mensagem abre pronta no WhatsApp, direto com quem constrói o seu site.</p>
      </div>
      <div class="conversa" data-revela>
        <div class="conversa__topo">
          <span class="conversa__avatar">{MARCA}</span>
          <span class="conversa__quem"><b>Apolo Studio</b><small><span class="ponto ponto--vivo" aria-hidden="true"></span> Agenda aberta</small></span>
          <a class="link conversa__insta" href="https://www.instagram.com/apolostudio.br/" target="_blank" rel="noopener">@apolostudio.br</a>
        </div>
        <div class="conversa__mensagens" data-mensagens aria-live="polite">
          <p class="balao balao--apolo">Oi! Conta pra gente o que você precisa: um site novo, um ajuste no que já tem ou só uma dúvida.</p>
        </div>
        <form class="caixa" data-caixa novalidate>
          <div class="caixa__chips" role="group" aria-label="Assunto">{chips}</div>
          <label class="sr" for="caixa-texto">Sua mensagem</label>
          <textarea class="caixa__texto" id="caixa-texto" rows="1" placeholder="Ex.: tenho uma clínica e quero aparecer no Google"></textarea>
          <div class="caixa__pe">
            <small class="caixa__dica">Enter envia · Shift+Enter quebra a linha</small>
            <button class="caixa__enviar" type="submit" aria-label="Enviar pelo WhatsApp" disabled>{SETA}</button>
          </div>
        </form>
      </div>
    </section>

'''

a = s.index('    <section class="migracao"'); b = s.index('    <section class="numeros"')
s = s[:a] + diagnostico + s[b:]
a = s.index('    <section class="suporte"'); b = s.index('    <section class="fecho"')
s = s[:a] + contato + s[b:]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
