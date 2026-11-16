# Emblemas da criação de site (viewBox 120), na mesma linguagem dos mensais: traço fino, corpo central
# e uma luz laranja com rastro. Os três contam a viagem: sair do chão, entrar em órbita, ir à Lua e voltar.


def viagem(d, dur, curva='linear'):
    # trajetória tracejada + rastro que corre por ela + a luz na ponta, no mesmo tempo
    est = f"--dur:{dur}s;--curva:{curva}"
    return (f'<path class="e-traj" d="{d}"/>'
            f'<path class="e-rastro" d="{d}" pathLength="100" style="{est}"/>'
            f'<circle class="e-luz e-viaja" r="3.4" style="offset-path:path(\'{d}\');{est}"/>')


def estrelas(pts):
    return ''.join(f'<circle class="e-estrela" cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in pts)


# Decolagem: do horizonte de um planeta, a luz sobe acelerando; a base pulsa a cada lançamento
DECOLAGEM = (estrelas([(22, 30, .9), (60, 18, .7), (96, 62, .8)]) +
             '<path class="e-chao" d="M8 106Q60 84 112 106"/>'
             '<path class="e-hachura" d="M20 112h10M44 110h16M74 110h14M96 113h8"/>'
             + viagem('M38 96C44 66 66 40 104 24', 2.8, 'cubic-bezier(.55,0,.75,.6)') +
             '<circle class="e-onda" cx="38" cy="96" r="3"/>'
             '<path class="e-base" d="M32 97h12M35 97l3-5 3 5"/>')

# Órbita: planeta com anel, a luz dá a volta numa órbita inclinada
ORBITA = (estrelas([(18, 34, .8), (102, 26, .9), (98, 94, .7)]) +
          '<g transform="rotate(-20 60 60)">'
          '<path class="e-anel-p" d="M38 60a22 5.5 0 0 1 44 0"/></g>'
          '<circle class="e-corpo" cx="60" cy="60" r="14"/>'
          '<path class="e-sombra" d="M60 46a14 14 0 0 1 0 28a9 14 0 0 0 0-28z"/>'
          '<g transform="rotate(-20 60 60)">'
          '<path class="e-anel-p" d="M38 60a22 5.5 0 0 0 44 0"/>'
          + viagem('M14 60a46 17 0 1 0 92 0a46 17 0 1 0 -92 0', 5) +
          '</g>')

# Lua: o espelho da Decolagem. A luz desce do céu freando e pousa no solo lunar; a Terra fica no alto
LUA = (estrelas([(52, 16, .8), (104, 34, .9), (14, 56, .7), (100, 64, .6)]) +
       '<circle class="e-corpo" cx="26" cy="28" r="7"/>'
       '<path class="e-sombra" d="M26 21a7 7 0 0 1 0 14a4.5 7 0 0 0 0-14z"/>'
       '<path class="e-solo" d="M6 98Q60 80 114 98V122H6z"/>'
       '<path class="e-chao" d="M6 98Q60 80 114 98"/>'
       '<ellipse class="e-crat" cx="30" cy="99" rx="6" ry="1.8"/><ellipse class="e-crat" cx="88" cy="97" rx="8" ry="2.2"/>'
       '<ellipse class="e-crat" cx="56" cy="104" rx="3.5" ry="1.1"/><ellipse class="e-crat" cx="102" cy="104" rx="3" ry="1"/>'
       + viagem('M90 12C84 40 68 62 64 89', 3.6, 'cubic-bezier(.15,.6,.25,1)') +
       '<circle class="e-onda e-onda--pouso" cx="64" cy="89" r="2.6"/>'
       '<path class="e-base" d="M58 89h12M60 89l4-4 4 4"/>')

EMB_NOVO = {'decolagem': DECOLAGEM, 'orbita': ORBITA, 'lua': LUA}
