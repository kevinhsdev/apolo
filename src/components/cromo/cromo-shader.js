/**
 * Cromo — uma palavra em metal líquido: cromo que escorre por dentro das letras, com a borda puxando para o vermelho e
 * o azul, como luz quebrando num metal polido.
 *
 * O shader é o LiquidMetal da Paper (@paper-design/shaders), em WebGL2. A palavra vira uma máscara: o texto é
 * desenhado em branco num canvas, a Paper resolve uma vez por palavra o campo que dá o volume das letras (uma conta
 * pesada, feita só na montagem) e, a partir daí, cada quadro é só o shader.
 *
 * mountCromo(elemento, texto) põe o canvas dentro do elemento e devolve a função que desmonta tudo. A máscara só é
 * calculada quando o elemento chega a 400 px da tela, o shader para fora dela, e com "reduzir movimento" ligado no
 * sistema o metal fica num quadro parado.
 *
 * Apolo: além do texto, aceita { simbolo } (o SVG da marca), desenhado à esquerda da palavra na mesma máscara, e
 * grava no elemento a proporção da máscara (--cromo-proporcao) para o bloco ter o tamanho certo.
 */
import { LiquidMetalShapes, ShaderFitOptions, ShaderMount, getShaderColorFromString, liquidMetalFragmentShader, toProcessedLiquidMetal } from '@paper-design/shaders'

/* O visual mora aqui, e só aqui. font é a fonte da palavra (de preferência a mais pesada da família: o metal precisa de
   traço grosso para ter volume); tint é a cor do reflexo; o resto são os controles do LiquidMetal. */
export const CONFIG = {
  font: "600 400px 'Figtree Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  letterSpacing: -18, // Apolo: o mesmo -0.045em da logo
  tint: '#eee6f6',
  repetition: 1.1, // Apolo: menos faixas, para ler bem no tamanho do cabeçalho (o prompt usa 1.6)
  softness: 0.1,
  shiftRed: 0.3,
  shiftBlue: 0.3,
  distortion: 0.07,
  contour: 0.3,
  angle: 70,
  speed: 1,
}

// Apolo: o símbolo em branco, na altura pedida
async function imagemDoSimbolo(svg, altura) {
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg" fill="#fff" height="${altura}"`))
  await img.decode()
  return img
}

// a palavra em branco sobre transparente, com folga em volta para o contorno respirar
async function drawMask(text, simbolo) {
  await document.fonts.load(CONFIG.font)
  const measure = document.createElement('canvas').getContext('2d')
  measure.font = CONFIG.font
  measure.letterSpacing = `${CONFIG.letterSpacing}px`
  const pad = 80
  const marca = simbolo ? await imagemDoSimbolo(simbolo, 432) : null
  const vao = text ? 120 : 0
  const recuo = marca ? Math.ceil((marca.naturalWidth * 432) / marca.naturalHeight) + vao : 0
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(measure.measureText(text).width) + recuo + pad * 2
  canvas.height = (marca ? 432 : 400) + pad * 2
  const ctx = canvas.getContext('2d')
  if (marca) ctx.drawImage(marca, pad, pad, recuo - vao, 432)
  ctx.font = CONFIG.font
  ctx.letterSpacing = `${CONFIG.letterSpacing}px`
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, pad + recuo, canvas.height / 2 + 14)
  const proporcao = canvas.width / canvas.height
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve({ blob: b, proporcao }) : reject(new Error('cromo: máscara vazia'))), 'image/png'))
}

// o campo de volume, uma vez por palavra: duas instâncias com o mesmo texto usam a mesma conta
const masks = new Map()
function processedMask(text, simbolo) {
  const chave = text + (simbolo || '')
  let mask = masks.get(chave)
  if (!mask) {
    mask = drawMask(text, simbolo).then(async ({ blob, proporcao }) => {
      const { pngBlob } = await toProcessedLiquidMetal(new File([blob], 'mascara.png', { type: 'image/png' }))
      const img = new Image()
      img.src = URL.createObjectURL(pngBlob)
      await img.decode()
      return { img, proporcao }
    })
    masks.set(chave, mask)
  }
  return mask
}

/** Monta o metal líquido com a palavra dentro de el. Devolve a função de desmontar. */
export function mountCromo(el, text, { simbolo } = {}) {
  let mount
  let alive = true

  const start = async () => {
    const { img: image, proporcao } = await processedMask(text, simbolo)
    if (!alive) return
    el.style.setProperty('--cromo-proporcao', proporcao)
    mount = new ShaderMount(
      el,
      liquidMetalFragmentShader,
      {
        u_colorBack: getShaderColorFromString('rgba(0,0,0,0)'),
        u_colorTint: getShaderColorFromString(CONFIG.tint),
        u_image: image,
        u_isImage: true,
        u_shape: LiquidMetalShapes.none,
        u_repetition: CONFIG.repetition,
        u_softness: CONFIG.softness,
        u_shiftRed: CONFIG.shiftRed,
        u_shiftBlue: CONFIG.shiftBlue,
        u_distortion: CONFIG.distortion,
        u_contour: CONFIG.contour,
        u_angle: CONFIG.angle,
        u_fit: ShaderFitOptions.contain,
        u_scale: 1,
        u_rotation: 0,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 0,
        u_worldHeight: 0,
      },
      undefined,
      matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : CONFIG.speed,
      0,
      1, // Apolo: densidade mínima 1x (era 2x); no cabeçalho, 2x custava mais que a Lua inteira
      undefined,
      ['u_image'],
    )
    el.dataset.ready = ''
  }

  // a máscara é pesada: só quando o elemento chega perto da tela
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      start().catch(e => console.error(e))
    },
    { rootMargin: '400px' },
  )
  io.observe(el)

  return () => {
    alive = false
    io.disconnect()
    if (mount) {
      const gl = mount.canvasElement.getContext('webgl2')
      mount.dispose()
      // libera o contexto na hora: o navegador segura uns 16 por página
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    }
    delete el.dataset.ready
  }
}
