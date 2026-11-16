# Rodapé novo: chamada final, colunas com ações de verdade e a marca em retícula (canvas).
# Rode: python fonte/scripts/rodape_html.py
import os

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
p = os.path.join(RAIZ, 'index.html')
s = open(p, encoding='utf-8').read()
a = s.index('  <footer class="rodape">')
b = s.index('</footer>', a) + len('</footer>')

MARCA = '<svg viewBox="210 226 315 280" aria-hidden="true"><path d="M318 241h100l97 169-25 45L367.5 302 245 455l-25-45z"/><path d="M245 455Q367.5 355 490 455l-20 38Q367.5 407 265 493z"/></svg>'
SETA = '<svg class="r-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'


def acao(attrs, nome, extra=''):
    return f'<button type="button" class="r-item" {attrs}><span>{nome}</span>{f"<em>{extra}</em>" if extra else ""}{SETA}</button>'


pacotes = ''.join([
    acao('data-ir-plano="decolagem"', 'Decolagem', 'R$ 1.200'),
    acao('data-ir-plano="orbita"', 'Órbita', 'R$ 2.200'),
    acao('data-ir-plano="lua"', 'Lua', 'R$ 3.800'),
    acao('data-ir-medida', 'Sob medida', 'orçamento'),
])
manter = ''.join([
    acao('data-ir-plano="base"', 'Base', 'R$ 89/mês'),
    acao('data-ir-plano="plus"', 'Plus', 'R$ 189/mês'),
    acao('data-ir-plano="pro"', 'Pro', 'R$ 390/mês'),
    acao('data-ir-cupom', 'Cupom de lançamento'),
])
falar = ''.join([
    f'<a class="r-item" href="#contato" data-whats="Olá! Vim pelo site da Apolo e quero conversar sobre um site."><span>WhatsApp</span>{SETA}</a>',
    f'<a class="r-item" href="https://www.instagram.com/apolostudio.br/" target="_blank" rel="noopener"><span>Instagram</span><em>@apolostudio.br</em>{SETA}</a>',
    f'<a class="r-item" href="mailto:[preencher]@apolostudio.com.br"><span>E-mail</span>{SETA}</a>',
    acao('data-ir-campo="m-site"', 'Diagnóstico grátis', 'do seu site'),
    acao('data-ir-campo="busca-input"', 'Buscar meu domínio'),
])

rodape = f'''  <footer class="rodape">
    <div class="rodape__chamada">
      <p class="rodape__eyebrow"><span class="ponto ponto--vivo" aria-hidden="true"></span> Agenda aberta para novos projetos</p>
      <h2 class="rodape__frase">O próximo site no ar <span>pode ser o seu.</span></h2>
      <div class="rodape__acoes">
        <a class="botao" href="#contato" data-whats="Olá! Vim pelo site da Apolo e quero começar o meu site."><span class="rola">Começar meu site</span></a>
        <button class="botao botao--vazado" type="button" data-ir-plano="orbita"><span class="rola">Ver os pacotes</span></button>
      </div>
    </div>
    <div class="rodape__grade">
      <div class="rodape__marca">
        <p class="rodape__logo">{MARCA}<span>apolo</span></p>
        <p class="rodape__sobre">Agência de desenvolvimento de sites para empresas de todos os ramos. Dois sócios, um faz e o outro confere.</p>
      </div>
      <nav class="rodape__coluna" aria-label="Pacotes"><p class="rodape__titulo">Criar meu site</p>{pacotes}</nav>
      <nav class="rodape__coluna" aria-label="Manutenção"><p class="rodape__titulo">Manter no ar</p>{manter}</nav>
      <nav class="rodape__coluna" aria-label="Contato"><p class="rodape__titulo">Falar com a gente</p>{falar}</nav>
    </div>
    <div class="rodape__base">
      <p>© 2026 Apolo Studio · Lua: NASA / LRO · os pontos acesos são pousos reais</p>
      <p><a class="link" href="./privacidade.html">Privacidade</a> · <button type="button" class="link rodape__topo-btn" data-ir-topo>Voltar ao topo ↑</button></p>
    </div>
    <div class="reticula" aria-hidden="true"><canvas></canvas></div>
  </footer>'''
s = s[:a] + rodape + s[b:]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
