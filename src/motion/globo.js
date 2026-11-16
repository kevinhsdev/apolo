// Globo ao vivo (Three.js): Blue Marble da NASA no cinza quente, relevo por normal map,
// luz de cima à esquerda com terminador suave e doze pontos laranja com brilho.
// Câmera ortográfica em pixels de CSS: o globo é posicionado e medido como um elemento da página.
import {
  WebGLRenderer, Scene, OrthographicCamera, SphereGeometry, Mesh, ShaderMaterial, Group,
  TextureLoader, SRGBColorSpace, Vector3, Matrix3, Color, BufferGeometry, Float32BufferAttribute,
  Points, AdditiveBlending, LinearMipmapLinearFilter, LinearFilter,
} from 'three';

// Apolo: a Lua, com doze pousos reais acesos (lat, lon). Sem nome na página: só a luz.
export const REGIOES = [
  { lat: 0.67, lon: 23.47 }, //   0  Apollo 11, mar da Tranquilidade
  { lat: 26.13, lon: 3.63 }, //   1  Apollo 15, Hadley
  { lat: -8.97, lon: 15.5 }, //   2  Apollo 16, Descartes
  { lat: 20.19, lon: 30.77 }, //  3  Apollo 17, Taurus-Littrow
  { lat: 7.08, lon: -64.37 }, //  4  Luna 9
  { lat: -2.47, lon: -43.34 }, // 5  Surveyor 1
  { lat: 38.24, lon: -35.0 }, //  6  Luna 17
  { lat: -3.01, lon: -23.42 }, // 7  Apollo 12, oceano das Tempestades
  { lat: -3.65, lon: -17.47 }, // 8  Apollo 14, Fra Mauro (vizinho do 12)
  { lat: -40.98, lon: -11.51 }, // 9 Surveyor 7, Tycho
  { lat: 12.71, lon: 62.21 }, //  10 Luna 24, mar das Crises
  { lat: 44.12, lon: -19.51 }, // 11 Chang'e 3
];

const RAD = Math.PI / 180;

// mesma convenção do SphereGeometry do Three (u = (lon + 180) / 360)
export function pontoNaEsfera(lat, lon, alvo = new Vector3()) {
  const f = lat * RAD;
  const l = lon * RAD;
  return alvo.set(Math.cos(f) * Math.cos(l), Math.sin(f), -Math.cos(f) * Math.sin(l));
}

const vertTerra = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vObj;
  varying vec3 vNw;
  void main() {
    vUv = uv;
    vObj = position;
    vNw = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragTerra = /* glsl */ `
  uniform sampler2D uCor;
  uniform sampler2D uRelevo;
  uniform vec3 uLuz;
  uniform vec3 uPontos[12];
  uniform float uBrilho[12];
  uniform vec3 uLaranja;
  uniform mat3 uRot;
  uniform float uRelevoForca;
  uniform float uExposicao;
  uniform float uContraste;
  varying vec2 vUv;
  varying vec3 vObj;
  varying vec3 vNw;

  void main() {
    vec3 n0 = normalize(vObj);
    vec3 base = texture2D(uCor, vUv).rgb;
    vec4 rel = texture2D(uRelevo, vUv);
    vec2 t = (rel.rg * 2.0 - 1.0) * uRelevoForca;
    float agua = smoothstep(0.35, 0.65, rel.b);
    // contraste só nos continentes, em torno do cinza médio; o oceano fica grafite
    base = mix(max(vec3(0.0), (base - 0.16) * uContraste + 0.16), base, agua);

    // base tangente: leste e norte da própria esfera
    vec3 leste = normalize(vec3(n0.z, 0.0, -n0.x) + vec3(1e-5, 0.0, 1e-5));
    vec3 norte = cross(n0, leste);
    vec3 nObj = normalize(leste * t.x + norte * t.y + n0 * sqrt(max(0.05, 1.0 - dot(t, t))));
    vec3 N = normalize(uRot * nObj);
    vec3 Ng = normalize(vNw);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L = uLuz;

    float ndlG = dot(Ng, L);
    float luz = smoothstep(-0.32, 0.9, ndlG);           // terminador suave
    float relevo = dot(N, L) - ndlG;                     // o relevo vira para a luz ou contra ela
    float dif = max(0.0, luz * (1.0 + relevo * 2.4));

    vec3 cor = base * (0.075 + dif * 1.22);

    // água: um brilho fosco largo, só do lado da luz
    vec3 H = normalize(L + V);
    float esp = pow(max(dot(N, H), 0.0), 26.0) * agua * luz;
    cor += vec3(0.6) * esp * 0.0;

    // borda: luz rasante do lado da luz, sombra fina no resto
    float vista = max(dot(Ng, V), 0.0);
    float fres = pow(1.0 - vista, 5.0);
    cor += vec3(0.78, 0.78, 0.80) * fres * smoothstep(0.0, 0.8, ndlG) * 0.22;
    cor *= mix(1.0, 0.55, pow(1.0 - vista, 6.0) * (1.0 - luz));

    // poça de luz quente em volta de cada ponto aceso
    float poca = 0.0;
    for (int i = 0; i < 12; i++) {
      float d = 1.0 - dot(n0, uPontos[i]);
      poca += uBrilho[i] * (exp(-d * 5200.0) * 0.9 + exp(-d * 700.0) * 0.28);
    }
    cor += uLaranja * poca * mix(0.55, 1.0, 1.0 - agua) * (0.55 + 0.45 * luz);

    gl_FragColor = vec4(cor * uExposicao, 1.0);
    #include <colorspace_fragment>
  }
`;

const vertPontos = /* glsl */ `
  attribute float aIdx;
  uniform float uBrilho[12];
  uniform float uTam;
  uniform mat3 uRot;
  varying float vFace;
  varying float vBrilho;
  void main() {
    vec3 nW = normalize(uRot * normalize(position));
    vFace = nW.z;
    int i = int(aIdx + 0.5);
    float b = 0.0;
    for (int k = 0; k < 12; k++) { if (k == i) b = uBrilho[k]; }
    vBrilho = b;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uTam * (0.72 + 0.38 * clamp(b, 0.0, 1.6));
  }
`;

const fragPontos = /* glsl */ `
  uniform vec3 uLaranja;
  varying float vFace;
  varying float vBrilho;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float nucleo = smoothstep(0.17, 0.07, r);
    float halo = exp(-r * r * 7.5) * 0.55 + exp(-r * r * 26.0) * 0.5;
    float vis = smoothstep(0.04, 0.28, vFace) * clamp(vBrilho, 0.0, 1.6);
    float a = (nucleo + halo) * vis;
    vec3 c = mix(uLaranja, vec3(1.0, 0.9, 0.82), nucleo * 0.7);
    gl_FragColor = vec4(c * a, a);
    #include <colorspace_fragment>
  }
`;

export function criarGlobo(canvas, { leve = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  const cena = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  camera.position.set(0, 0, 2000);

  const tam = leve ? 2048 : 4096;
  const carregador = new TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  let faltam = 2;
  let aoCarregar = null;
  const pronto = () => { if (--faltam === 0 && aoCarregar) aoCarregar(); };
  const texCor = carregador.load(`/textures/lua-cor-${tam}.webp`, pronto);
  texCor.colorSpace = SRGBColorSpace;
  texCor.anisotropy = aniso;
  texCor.minFilter = LinearMipmapLinearFilter;
  texCor.magFilter = LinearFilter;
  const texRelevo = carregador.load(`/textures/lua-relevo-${tam}.webp`, pronto);
  texRelevo.anisotropy = aniso;

  const laranja = new Color('#ff5a1f'); // vira linear dentro do Three (ColorManagement)
  const pontos = REGIOES.map(r => pontoNaEsfera(r.lat, r.lon));
  const brilho = new Float32Array(12);
  const rot = new Matrix3();

  const luz = new Vector3(-0.78, 0.52, 0.42).normalize();
  const uniforms = {
    uCor: { value: texCor },
    uRelevo: { value: texRelevo },
    uLuz: { value: luz },
    uPontos: { value: pontos },
    uBrilho: { value: brilho },
    uLaranja: { value: laranja },
    uRot: { value: rot },
    uRelevoForca: { value: 1.0 },
    uExposicao: { value: 1.0 },
    uContraste: { value: 1.18 },
  };

  const geo = new SphereGeometry(1, leve ? 128 : 192, leve ? 96 : 144);
  const terra = new Mesh(geo, new ShaderMaterial({ uniforms, vertexShader: vertTerra, fragmentShader: fragTerra }));

  const geoP = new BufferGeometry();
  const pos = [];
  const idx = [];
  pontos.forEach((p, i) => { pos.push(p.x * 1.002, p.y * 1.002, p.z * 1.002); idx.push(i); });
  geoP.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geoP.setAttribute('aIdx', new Float32BufferAttribute(idx, 1));
  const uPontos = {
    uBrilho: uniforms.uBrilho,
    uLaranja: uniforms.uLaranja,
    uRot: uniforms.uRot,
    uTam: { value: 30 * dpr },
  };
  const luzes = new Points(geoP, new ShaderMaterial({
    uniforms: uPontos, vertexShader: vertPontos, fragmentShader: fragPontos,
    transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending,
  }));
  luzes.renderOrder = 2;

  const grupo = new Group();
  grupo.add(terra, luzes);
  cena.add(grupo);

  let W = 1;
  let H = 1;
  const estado = { cx: 0, cy: 0, r: 100, lat: 0, lon: 0 };
  const tmp = new Vector3();

  function medir(w, h) {
    W = w;
    H = h;
    renderer.setSize(w, h, false);
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
  }

  function aplicar(e) {
    Object.assign(estado, e);
    grupo.position.set(e.cx - W / 2, H / 2 - e.cy, 0);
    grupo.scale.setScalar(e.r);
    grupo.rotation.set(e.lat * RAD, -Math.PI / 2 - e.lon * RAD, 0);
    grupo.updateMatrixWorld(true);
    rot.setFromMatrix4(grupo.matrixWorld);
    // tira a escala da rotação
    const s = 1 / e.r;
    for (let k = 0; k < 9; k++) rot.elements[k] *= s;
    uPontos.uTam.value = Math.max(15, Math.min(30, e.r * 0.074)) * dpr;
  }

  /** posição na tela (px de CSS) e quanto o ponto i está de frente (z de -1 a 1) */
  function projetar(i, alvo = {}) {
    tmp.copy(pontos[i]).applyMatrix3(rot);
    alvo.x = estado.cx + tmp.x * estado.r * 1.002;
    alvo.y = estado.cy - tmp.y * estado.r * 1.002;
    alvo.face = tmp.z;
    return alvo;
  }

  function desenhar() { renderer.render(cena, camera); }

  return {
    renderer,
    brilho,
    pontos,
    medir,
    aplicar,
    projetar,
    desenhar,
    estado,
    set onPronto(fn) { aoCarregar = fn; if (faltam === 0) fn(); },
  };
}
