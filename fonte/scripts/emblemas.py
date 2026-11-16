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


# Decolagem: foguete em contorno único, chama acesa e o vento passando: está subindo
DECOLAGEM = ('<defs><linearGradient id="g-chama" x1="0" y1="0" x2="0" y2="1">'
             '<stop offset="0" stop-color="#FFD2BE"/><stop offset=".35" stop-color="#FF5A1F"/><stop offset="1" stop-color="#FF5A1F" stop-opacity="0"/></linearGradient>'
             '<linearGradient id="g-vento" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
             + estrelas([(24, 30, .9), (98, 22, .8)]) +
             '<g transform="rotate(32 60 62)">'  # inclinado para a direita, o vento acompanha
             '<path class="e-vento" d="M34 14v34M88 40v34M30 70v30"/>'
             '<g class="e-foguete">'
             '<path class="e-chama" d="M54.5 82Q60 100 60 108Q60 100 65.5 82z"/>'
             '<path class="e-bocal" d="M53.5 76l-1.5 5h16l-1.5-5"/>'
             '<path class="e-corpo" d="M60 18C70 27 73.5 42 72 59l-1.6 17H49.6L48 59C46.5 42 50 27 60 18z"/>'
             '<path class="e-asa" d="M48.6 62C42 66 39.5 72 39.5 81l10.6-5M71.4 62C78 66 80.5 72 80.5 81l-10.6-5"/>'
             '<circle class="e-janela" cx="60" cy="45" r="5.5"/>'
             '</g></g>')

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

# Lua: o plano completo. Da Terra sai a rota; a luz cruza o céu e chega à bandeira fincada no solo lunar
_BAND = ['M62.6 31C70 28 80 35 92 31V50C80 54 70 47 62.6 50z', 'M62.6 31C70 35 80 27 92 31V50C80 46 70 54 62.6 50z']
LUA = ('<defs><linearGradient id="g-solo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26262a"/><stop offset=".5" stop-color="#121214"/><stop offset="1" stop-color="#0b0b0c" stop-opacity="0"/></linearGradient>'
       '<linearGradient id="g-borda" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
       '<linearGradient id="g-bandeira" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5A1F"/><stop offset="1" stop-color="#FF9466"/></linearGradient>'
       '<radialGradient id="g-halo"><stop offset="0" stop-color="#FF5A1F" stop-opacity=".5"/><stop offset="1" stop-color="#FF5A1F" stop-opacity="0"/></radialGradient></defs>'
       + estrelas([(50, 6, .8), (106, 16, 1), (104, 60, .7), (12, 58, .8), (86, 70, .6)]) +
       '<circle class="e-halo" cx="76" cy="42" r="30"/>'
       '<circle class="e-terra" cx="22" cy="26" r="11"/>'
       '<path class="e-sombra" d="M22 15a11 11 0 0 1 0 22a6 11 0 0 0 0-22z"/>'
       '<path class="e-fio" d="M12.5 21.5q9.5 4 19 0M12 30q10 3.5 20 0"/>'
       '<path class="e-solo" d="M-8 128V97Q60 74 128 97V128z"/>'
       '<path class="e-borda" d="M-8 97Q60 74 128 97"/>'
       '<ellipse class="e-crat" cx="22" cy="100" rx="9" ry="2.4"/><ellipse class="e-crat" cx="100" cy="99" rx="7" ry="2"/><ellipse class="e-crat" cx="80" cy="108" rx="4" ry="1.2"/>'
       '<path class="e-passos" d="M56 89Q44 97 26 110"/>'
       '<path class="e-mastro" d="M62 87V29"/>'
       f'<path class="e-bandeira" d="{_BAND[0]}"><animate attributeName="d" dur="2.6s" repeatCount="indefinite" calcMode="spline" '
       f'keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="{_BAND[0]};{_BAND[1]};{_BAND[0]}"/></path>'
       '<path class="e-base" d="M56 87.5h12"/>')

EMB_NOVO = {'decolagem': DECOLAGEM, 'orbita': ORBITA, 'lua': LUA}
