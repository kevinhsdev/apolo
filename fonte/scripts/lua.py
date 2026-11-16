"""Texturas da Lua para o globo da Apolo, a partir do CGI Moon Kit da NASA (domínio público).

Entrada (fonte/nasa/, fora do git), de https://svs.gsfc.nasa.gov/4720 :
  lroc_color_poles_4k.tif   cor (LRO/LROC), 4096 x 2048
  ldem_16_uint.tif          relevo (LRO/LOLA), 5760 x 2880, 16 bits

Saída (public/textures/), no mesmo formato que o globo.js espera:
  lua-cor-<w>.webp     cinza neutro (preto e branco da marca)
  lua-relevo-<w>.webp  R,G = normal do relevo (leste, norte), B = 0 (sem água)

uso: python fonte/scripts/lua.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
AQUI = os.path.dirname(os.path.abspath(__file__))
NASA = os.path.join(AQUI, '..', 'nasa')
SAIDA = os.path.join(AQUI, '..', '..', 'public', 'textures')
os.makedirs(SAIDA, exist_ok=True)

ESCURO = np.array([0x30, 0x30, 0x30], float)   # mares
CLARO = np.array([0xc4, 0xc4, 0xc4], float)    # terras altas

cor0 = Image.open(os.path.join(NASA, 'lroc_color_poles_4k.tif')).convert('RGB')
dem0 = Image.open(os.path.join(NASA, 'ldem_16_uint.tif'))
dem0 = np.asarray(dem0, dtype=np.float32)
lo, hi = np.percentile(dem0, 0.5), np.percentile(dem0, 99.5)
dem0 = np.clip((dem0 - lo) / (hi - lo), 0, 1)
dem0 = Image.fromarray(dem0, mode='F')


def textura_cor(w):
    h = w // 2
    c = np.asarray(cor0.resize((w, h), Image.LANCZOS), float)
    lum = 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]
    p1, p99 = np.percentile(lum, 1), np.percentile(lum, 99.5)
    t = np.clip((lum - p1) / (p99 - p1), 0, 1) ** 0.9
    out = ESCURO + (CLARO - ESCURO) * t[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def textura_relevo(w, forca):
    h = w // 2
    alt = np.asarray(dem0.resize((w, h), Image.BOX), float)
    dx = (np.roll(alt, -1, 1) - np.roll(alt, 1, 1)) * 0.5
    dy = np.zeros_like(alt)
    dy[1:-1] = (alt[2:] - alt[:-2]) * 0.5
    lat = (0.5 - (np.arange(h) + 0.5) / h) * np.pi
    coslat = np.clip(np.cos(lat), 0.12, 1)[:, None]
    escala = forca * (w / 4096)
    nx = -dx / coslat * escala
    ny = dy * escala
    nz = np.ones_like(alt)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny = nx / n, ny / n
    rgb = np.stack([(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, np.zeros_like(nx)], -1)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))


for w, q in ((4096, 88), (2048, 86)):
    textura_cor(w).save(os.path.join(SAIDA, f'lua-cor-{w}.webp'), quality=q, method=6)
    textura_relevo(w, forca=60).save(os.path.join(SAIDA, f"lua-relevo-{w}.webp"), quality=78, method=6)
    print('ok', w)
