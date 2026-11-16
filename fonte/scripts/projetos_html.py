# Seção "Projetos" da home (substitui a antiga prévia). Os cards vêm de src/projetos.js.
# Rode: python fonte/scripts/projetos_html.py
import os, re

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
p = os.path.join(RAIZ, 'index.html')
s = open(p, encoding='utf-8').read()
SETA = '<svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

secao = f'''    <section class="projetos" id="projetos" aria-labelledby="projetos-titulo">
      <div class="projetos__cabeca">
        <div>
          <p class="projetos__eyebrow">Projetos</p>
          <h2 class="projetos__titulo" id="projetos-titulo">O que sai daqui <span>já está no ar.</span></h2>
        </div>
        <p class="projetos__intro">Abra qualquer projeto para ver a prévia no computador e no celular, do jeito que o cliente dele vê.</p>
      </div>
      <div class="projetos__grade" data-projetos-destaque></div>
      <div class="projetos__acao">
        <a class="metal-btn" href="./projetos.html"><span class="metal-btn__metal" aria-hidden="true"></span><span class="metal-btn__label">Ver a biblioteca de projetos (<span data-projetos-total>0</span>)</span><span class="metal-btn__orb" aria-hidden="true">{SETA}{SETA}</span></a>
      </div>
    </section>
'''
if 'class="previa"' in s:
    s = re.sub(r'    <section class="previa".*?</section>\n', lambda m: secao, s, flags=re.S)
elif 'class="projetos"' in s:
    s = re.sub(r'    <section class="projetos".*?</section>\n', lambda m: secao, s, flags=re.S)
s = s.replace('href="#previa">Prévia</a>', 'href="#projetos">Projetos</a>')
open(p, 'w', encoding='utf-8').write(s)
print('ok')
