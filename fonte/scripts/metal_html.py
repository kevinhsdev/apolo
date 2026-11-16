# Troca os CTAs principais (hero, fecho, rodapé) pelo botão Mercúrio. Rode depois dos outros geradores.
import os, re

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
p = os.path.join(RAIZ, 'index.html')
s = open(p, encoding='utf-8').read()
SETA = '<svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def metal(attrs, texto):
    return (f'<a class="metal-btn" {attrs}><span class="metal-btn__metal" aria-hidden="true"></span>'
            f'<span class="metal-btn__label">{texto}</span><span class="metal-btn__orb" aria-hidden="true">{SETA}{SETA}</span></a>')


# hero: botão + bolinha da seta viram um Mercúrio só, que leva à prévia
s = re.sub(r'(<div class="hero__acoes">)\s*<a class="botao" href="#dominio">.*?</a>\s*<a class="botao-seta".*?</a>',
           lambda m: m.group(1) + '\n        ' + metal('href="#dominio"', 'Quero meu site'), s, flags=re.S)
# fecho
s = re.sub(r'<a class="botao" href="#contato" data-whats-pedido><span class="rola">Começar agora</span></a>\s*<a class="botao-seta".*?</a>',
           lambda m: metal('href="#contato" data-whats-pedido target="_blank" rel="noopener"', 'Começar agora'), s, flags=re.S)
# rodapé
s = s.replace('<a class="botao" href="#contato" data-whats="Olá! Vim pelo site da Apolo e quero começar o meu site."><span class="rola">Começar meu site</span></a>',
              metal('href="#contato" data-whats="Olá! Vim pelo site da Apolo e quero começar o meu site." target="_blank" rel="noopener"', 'Começar meu site'))
open(p, 'w', encoding='utf-8').write(s)
print(s.count('class="metal-btn"'), 'mercúrios')
