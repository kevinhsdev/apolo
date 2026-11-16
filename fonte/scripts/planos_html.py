# Gera a seção de planos do index.html (cartões no padrão Profitize) a partir dos dados do contrato.
# Rode: python fonte/scripts/planos_html.py  (substitui a <section class="planos"> inteira)
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from emblemas import EMB_NOVO
SETA_M = '<svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
p = os.path.join(RAIZ, 'index.html')
s = open(p, encoding='utf-8').read()
a = s.index('    <section class="planos" id="pacotes"')
b = s.index('    <section class="relevo"')

I = {
    'rel': '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    'aj': '<path d="M4 20h4L18 10l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    'zap': '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    'map': '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
    'busca': '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    'txt': '<path d="M5 6h14M5 12h14M5 18h9"/>',
    'cal': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    'graf': '<path d="M5 19V11M12 19V5M19 19v-6"/>',
    'blog': '<path d="M6 4h9l3 3v13H6z"/><path d="M9 11h6M9 15h6"/>',
    'logo': '<path d="M12 3l8 15H4z"/>',
    'img': '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="M20 15l-5-5-9 9"/>',
    'esc': '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    'ok': '<path d="M5 12l4 4L19 6"/>',
    'ssl': '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    'nuvem': '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
    'back': '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>',
    'dom': '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/>',
    'hora': '<circle cx="12" cy="12" r="8"/><path d="M12 7v5h4"/>',
    'doc': '<path d="M7 4h7l4 4v12H7z"/><path d="M14 4v4h4"/>',
    'escudo': '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
}


def ic(nome):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true">{I[nome]}</svg>'


def li(nome, texto, forte=False):
    cls = ' class="is-forte"' if forte else ''
    return f'<li{cls}>{ic(nome)}<span>{texto}</span></li>'


EMB = {
    # foguete subindo numa trajetória, a partir do chão
    'decolagem': '<path class="e-chao" d="M14 98h92"/><path class="e-traj" d="M26 98C40 72 60 46 98 22"/><circle class="e-luz e-sobe" r="4"/>',
    # planeta com o anel da órbita e o satélite girando
    'orbita': '<circle class="e-corpo" cx="60" cy="60" r="16"/><ellipse class="e-traj" cx="60" cy="60" rx="44" ry="17" transform="rotate(-18 60 60)"/><g class="e-gira-el"><circle class="e-luz" r="4"/></g>',
    # lua com a sombra da fase e o ponto de pouso aceso
    'lua': '<circle class="e-corpo" cx="60" cy="60" r="34"/><path class="e-fase" d="M60 26a34 34 0 0 1 0 68a24 34 0 0 0 0-68z"/><circle class="e-crat" cx="48" cy="48" r="5"/><circle class="e-crat" cx="66" cy="74" r="4"/><circle class="e-crat" cx="44" cy="72" r="3"/><circle class="e-luz e-pulsa" cx="56" cy="62" r="4"/>',
    # manutenção: satélites em volta, um anel por plano
    'base': '<circle class="e-corpo" cx="60" cy="60" r="12"/><g class="e-anel"><circle class="e-traj" cx="60" cy="60" r="30"/><circle class="e-luz" cx="90" cy="60" r="4"/></g>',
    'plus': '<circle class="e-corpo" cx="60" cy="60" r="12"/><g class="e-anel"><circle class="e-traj" cx="60" cy="60" r="28"/><circle class="e-luz" cx="88" cy="60" r="4"/></g><g class="e-anel e-anel--2"><circle class="e-traj" cx="60" cy="60" r="44"/><circle class="e-sat" cx="60" cy="16" r="3"/></g>',
    'pro': '<circle class="e-corpo" cx="60" cy="60" r="12"/><g class="e-anel"><circle class="e-traj" cx="60" cy="60" r="24"/><circle class="e-luz" cx="84" cy="60" r="4"/></g><g class="e-anel e-anel--2"><circle class="e-traj" cx="60" cy="60" r="37"/><circle class="e-sat" cx="60" cy="23" r="3"/></g><g class="e-anel e-anel--3"><circle class="e-traj" cx="60" cy="60" r="50"/><circle class="e-sat" cx="10" cy="60" r="3"/></g>',
}
EMB.update(EMB_NOVO)
NUM = {'decolagem': '01', 'orbita': '02', 'lua': '03', 'base': '01', 'plus': '02', 'pro': '03'}


def card(id_, rotulo, nome, cor, preco, sub, para, itens, cta, rec=False, unidade=''):
    selo = '<span class="cartao__selo">Mais escolhido</span>' if rec else ''
    cheio = ' cartao__cta--cheio' if rec else ''
    classe = f'cartao cartao--{cor}' + (' is-recomendado' if rec else '')
    lista = '\n            '.join(itens)
    return f'''        <article class="{classe}" data-cartao="{id_}">
          <div class="cartao__topo"><p class="cartao__rotulo">{rotulo}</p>{selo}</div>
          <div class="cartao__missao">
            <svg class="emblema" viewBox="0 0 120 120" aria-hidden="true">{EMB[id_]}</svg>
            <div><p class="cartao__num">{'Missão' if unidade == '' else 'Órbita'} {NUM[id_]}</p><h3 class="cartao__nome">{nome}</h3></div>
          </div>
          <p class="cartao__de" data-de hidden><s></s><span class="cartao__off"></span></p>
          <p class="cartao__preco" data-preco="{preco}"><span class="cartao__moeda">R$</span><span class="cartao__valor">{preco}</span><span class="cartao__por">{unidade}</span></p>
          <p class="cartao__sub">{sub}</p>
          <ul class="cartao__lista">
            {lista}
          </ul>
          <p class="cartao__nota">{ic('esc')} {para}</p>
          <a class="metal-btn cartao__cta{cheio}" href="#contato" data-pedir="{id_}"><span class="metal-btn__metal" aria-hidden="true"></span><span class="metal-btn__label">{cta}</span><span class="metal-btn__orb" aria-hidden="true">{SETA_M}{SETA_M}</span></a>
        </article>'''


UNICO = 'Pagamento único'
PAG = '50% para começar e 50% na entrega, no Pix. Ou em até 3x de R$ {} no cartão.'
sites = [
    card('decolagem', UNICO, 'Decolagem', 'laranja', '1.200', PAG.format('400'),
         'Para quem precisa aparecer no Google já.',
         [li('doc', '1 página com até 6 seções', True), li('rel', 'Pronto em 7 dias úteis'), li('aj', '2 rodadas de ajuste'),
          li('zap', 'Botão de WhatsApp e mapa'), li('map', 'Google Meu Negócio'), li('busca', 'SEO básico'),
          li('dom', 'Domínio do 1º ano incluso, no seu nome'), li('escudo', 'Padrão Apolo: 30 itens conferidos')],
         'Quero o Decolagem'),
    card('orbita', UNICO, 'Órbita', 'laranja', '2.200', PAG.format('733,33'),
         'O site completo de quem atende o bairro ou a cidade.',
         [li('doc', 'Até 5 páginas', True), li('rel', 'Pronto em 14 dias úteis'), li('aj', '3 rodadas de ajuste'),
          li('txt', 'Textos escritos pela Apolo'), li('map', 'SEO local'), li('cal', 'Link de agendamento'),
          li('graf', 'Google Analytics'), li('ok', 'Tudo do Decolagem', True)],
         'Quero o Órbita', rec=True),
    card('lua', UNICO, 'Lua', 'laranja', '3.800', PAG.format('1.266,67'),
         'Marca, site e conteúdo de uma vez só.',
         [li('doc', 'Até 10 páginas, com blog', True), li('rel', 'Pronto em 21 dias úteis'), li('aj', '3 rodadas de ajuste'),
          li('logo', 'Logotipo simples'), li('img', '10 artes para o Instagram'), li('blog', '3 artigos no blog'),
          li('nuvem', '1 mês de manutenção Plus'), li('ok', 'Tudo do Órbita', True)],
         'Quero o Lua'),
]
MENSAL = 'Assinatura mensal'
MPAG = 'Vence todo dia 10, no Pix ou boleto. Cancele com 30 dias de aviso, sem multa.'
mensais = [
    card('base', MENSAL, 'Base', 'laranja', '89', MPAG, 'Para o site ficar no ar sem você se preocupar.',
         [li('nuvem', 'Hospedagem', True), li('dom', 'Renovação do domínio'), li('ssl', 'Certificado de segurança'),
          li('back', 'Backup'), li('aj', 'Até 2 pequenas alterações por mês')],
         'Assinar o Base', unidade='/mês'),
    card('plus', MENSAL, 'Plus', 'laranja', '189', MPAG, 'Para quem muda preço, horário ou cardápio com frequência.',
         [li('hora', '2 horas de alterações por mês', True), li('map', 'Google Meu Negócio sempre atualizado'),
          li('graf', 'Relatório mensal de visitas'), li('ok', 'Tudo do Base', True)],
         'Assinar o Plus', rec=True, unidade='/mês'),
    card('pro', MENSAL, 'Pro', 'laranja', '390', MPAG, 'Para subir no Google mês a mês.',
         [li('blog', '2 artigos de blog por mês', True), li('busca', 'Ajustes de SEO todo mês'), li('ok', 'Tudo do Plus', True)],
         'Assinar o Pro', unidade='/mês'),
]
faq = [
    ('Como funciona o pagamento?', 'Metade para começar e metade na entrega, depois da sua aprovação e antes do site ir ao ar, no Pix. Se preferir, parcelamos em até 3x no cartão, por link de pagamento.'),
    ('Os prazos contam a partir de quando?', 'São dias úteis, contados depois que chega o material: textos, fotos e logo (ou o briefing, quando a Apolo escreve os textos). Quanto antes o material chega, antes o site sobe.'),
    ('O site e o domínio ficam no meu nome?', 'Ficam. O domínio é registrado no seu CPF ou CNPJ, e no fim entregamos todos os logins e senhas do site, do domínio e do Google Meu Negócio.'),
    ('Preciso assinar a manutenção?', 'Não, ela é opcional. Sem ela, o site é seu e você renova o domínio a partir do segundo ano. Com ela, a gente cuida de hospedagem, segurança, backup e alterações. Dá para cancelar com 30 dias de aviso, e entregamos todos os arquivos.'),
    ('E se der algum erro depois que o site for ao ar?', 'Por 30 dias depois da publicação corrigimos sem custo qualquer erro técnico: página que não abre, botão ou formulário que não funciona, falha no celular.'),
    ('Quero mais ajustes do que o pacote prevê. Pode?', 'Pode. Cada rodada é uma lista única de pedidos. Ajustes além das rodadas do pacote custam R$ 80 por hora, sempre com a estimativa de horas antes.'),
]
perguntas = ''.join(
    f'        <details class="pergunta"><summary>{q}<span class="pergunta__mais" aria-hidden="true"></span></summary><p>{r}</p></details>\n'
    for q, r in faq)
sites_html = '\n'.join(sites)
mensais_html = '\n'.join(mensais)

novo = f'''    <section class="planos" id="pacotes" aria-labelledby="planos-titulo">
      <div class="planos__cabeca" data-revela>
        <p class="pilula"><span class="ponto ponto--vivo" aria-hidden="true"></span> <span data-pilula>Pix ou até 3x no cartão</span></p>
        <h2 class="planos__titulo" id="planos-titulo">Escolha a sua missão. <span>A gente cuida do lançamento.</span></h2>
        <p class="planos__intro">Do primeiro voo à órbita completa: pague uma vez e o site é seu para sempre. Depois, se quiser, mantemos ele no ar todo mês.</p>
        <div class="seletor" role="tablist" aria-label="Tipo de plano">
          <span class="seletor__fundo" aria-hidden="true"></span>
          <button type="button" role="tab" id="aba-site" aria-controls="painel-site" aria-selected="true" data-aba="site">Criar meu site <em>pagamento único</em></button>
          <button type="button" role="tab" id="aba-mensal" aria-controls="painel-mensal" aria-selected="false" data-aba="mensal" tabindex="-1">Manter no ar <em>mensal</em></button>
        </div>
      </div>
      <div class="cartoes" id="painel-site" role="tabpanel" aria-labelledby="aba-site" data-painel="site">
{sites_html}
      </div>
      <div class="cartoes" id="painel-mensal" role="tabpanel" aria-labelledby="aba-mensal" data-painel="mensal" hidden>
{mensais_html}
      </div>
      <div class="cupom" data-cupom data-revela hidden>
        <div class="cupom__bilhete">
          <span class="cupom__rotulo">Cupom de lançamento</span>
          <button class="cupom__codigo" type="button" data-cupom-copiar><b data-cupom-codigo></b><span data-cupom-copiado>Copiar</span></button>
          <span class="cupom__texto" data-cupom-texto></span>
        </div>
        <form class="cupom__form" data-cupom-form novalidate>
          <label for="cupom-campo">Tem um cupom?</label>
          <div class="cupom__linha">
            <input id="cupom-campo" name="cupom" placeholder="Digite o código" autocomplete="off" autocapitalize="characters" spellcheck="false">
            <button class="botao" type="submit"><span class="rola">Aplicar</span></button>
          </div>
          <p class="cupom__estado" data-cupom-estado role="status"></p>
        </form>
      </div>
      <a class="medida" href="#contato" data-pedir="medida" data-revela>
        <span class="medida__rotulo">Sob medida</span>
        <span class="medida__texto">Loja virtual, sistema ou app? Conte o que precisa e mandamos o orçamento em até 48 h.</span>
        <span class="medida__acao">Pedir orçamento <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>
      </a>
      <p class="garantia" data-revela>{ic('escudo')}<span><strong>Garantia de 30 dias:</strong> qualquer erro técnico depois do site no ar, a gente corrige sem custo.</span></p>
      <div class="perguntas" data-revela>
        <h3 class="perguntas__titulo">Perguntas</h3>
{perguntas}      </div>
    </section>

'''
open(p, 'w', encoding='utf-8').write(s[:a] + novo + s[b:])
print('ok')
