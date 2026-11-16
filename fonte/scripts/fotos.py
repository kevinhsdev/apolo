"""Trata as fotos de banco para o preto quente da Norte e exporta em WebP nos tamanhos da página.

Entrada (fora do git, baixar pelos links de fonte/CREDITOS.md):
  fonte/fotos/pexels-30215681.jpg   migração (Oktay Köseoğlu, Pexels)
  fonte/fotos/pexels-7709199.jpg    suporte (MART PRODUCTION, Pexels)
Saída: public/img/<nome>-<largura>.webp

O tratamento: azul e ciano perdem saturação, as sombras esquentam e o preto da foto
encosta no preto da página (#0e0d0c), para a borda esfumada não mostrar emenda.
uso: python3 fonte/scripts/fotos.py  (da pasta da template)
"""
import os
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
FOTOS = os.path.join(AQUI, '..', 'fotos')
SAIDA = os.path.join(AQUI, '..', '..', 'public', 'img')
os.makedirs(SAIDA, exist_ok=True)
PRETO = np.array([10, 10, 10], float) / 255.0  # Apolo: preto neutro #0a0a0a


def tratar(img, exposicao=1.0, gama=1.0, quente=1.0, escurecer=None):
    a = np.asarray(img.convert('RGB'), float) / 255.0
    # tira o azul: satura menos onde o azul domina
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    azul = np.clip((b - np.maximum(r, g)) * 6, 0, 1)
    a = a + (lum[..., None] - a) * (azul[..., None] * 0.85)
    # sombras e meios-tons quentes
    peso = np.clip(1 - lum * 1.2, 0, 1)[..., None]
    tinta = np.array([1.0 + 0.05 * quente, 1.0, 1.0 - 0.09 * quente])
    a = a * (1 + (tinta - 1) * peso)
    a = np.clip(a * exposicao, 0, 1) ** gama
    # Apolo: quase preto e branco (fica só um resto de cor quente)
    lum2 = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    a = lum2 + (a - lum2) * 0.18
    if escurecer is not None:
        a = a * escurecer[..., None]
    # o preto da foto vira o preto da página
    a = PRETO + a * (1 - PRETO)
    return Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))


def vinheta(w, h, cx, cy, rx, ry, minimo):
    y, x = np.mgrid[0:h, 0:w]
    d = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
    return np.clip(1 - (d - 1) * 0.9, minimo, 1)


def exportar(img, nome, larguras, q=82):
    for w in larguras:
        h = round(img.height * w / img.width)
        img.resize((w, h), Image.LANCZOS).save(os.path.join(SAIDA, f'{nome}-{w}.webp'), quality=q, method=6)
        print(nome, w, h)


# migração: mulher no balcão à noite. Inteira no desktop; recorte vertical no celular.
m = Image.open(os.path.join(FOTOS, 'pexels-30215681.jpg'))
W, H = m.size
esc = vinheta(W, H, W * 0.48, H * 0.62, W * 0.75, H * 0.7, 0.55)
mt = tratar(m, exposicao=0.96, gama=1.06, quente=1.0, escurecer=esc)
exportar(mt, 'migracao', [1100, 1800, 2400])
corte = mt.crop((int(W * 0.1), 0, int(W * 0.1) + int(H * 0.82), H))
exportar(corte, 'migracao-vertical', [800, 1200])

# suporte: atendente de headset. A parede clara da esquerda escurece.
s = Image.open(os.path.join(FOTOS, 'pexels-7709199.jpg'))
W, H = s.size
esc = vinheta(W, H, W * 0.42, H * 0.55, W * 0.62, H * 0.75, 0.42)
st = tratar(s, exposicao=0.9, gama=1.12, quente=1.0, escurecer=esc)
exportar(st, 'suporte', [1000, 1600, 2200])
corte = st.crop((int(W * 0.06), 0, int(W * 0.06) + int(H * 0.86), H))
exportar(corte, 'suporte-vertical', [800, 1200])
