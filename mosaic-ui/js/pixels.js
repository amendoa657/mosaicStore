/* <mo-pixels> e a cortina de pixels.

   Ponte entre a página e o js/pixels-worker.js. Aqui só fica o que precisa
   da página: ler as cores do tema, medir as áreas, entregar os <canvas> e
   repassar mouse, tamanho, visibilidade e foco. Quem desenha é o worker.

   <mo-pixels></mo-pixels>
     passo="15"        distância entre os pontos, em px
     lente="150"       raio da lente que segue o mouse (0 desliga)
     velocidade="1"    1 é o ritmo da loja; 0.5 é metade
     opacidade="0.34"  força das cores
     cores="destaque secundaria terciaria"
                       três cores: nomes do tema, variáveis (--x) ou
                       qualquer cor CSS ("#ffb77c rgb(…) var(--minha)")
     estatico          desenha uma vez e para

   Sem Worker ou sem OffscreenCanvas, o elemento fica só com a cor de fundo:
   nada quebra. */

import { rgb } from "./tema.js";

const PADRAO = { passo: 15, lente: 150, velocidade: 1, opacidade: 0.34 };
const TOKENS = new Set(["destaque", "secundaria", "terciaria", "mista", "perigo", "texto", "tom"]);

let trabalhador = null;
let proximoId = 1;
const instancias = new Set();
const esperandoCortina = new Map();

const semMovimento = () =>
  document.documentElement.classList.contains("mo-sem-movimento") ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/* O tamanho da tela no máximo dobrado: acima disso o custo cresce e o
   quadradinho não fica mais nítido. */
const escala = () => Math.min(window.devicePixelRatio || 1, 2);

export const suportado = () =>
  typeof Worker !== "undefined" &&
  typeof OffscreenCanvas !== "undefined" &&
  "transferControlToOffscreen" in HTMLCanvasElement.prototype;

/* Um worker só para a página toda. O mosaic-inicio.js pode já ter criado
   (no <head>, para ele carregar em paralelo com a página). */
function obterTrabalhador() {
  if (trabalhador !== null) return trabalhador;
  trabalhador = false;
  if (!suportado()) return trabalhador;
  try {
    trabalhador = window.__moPixels || new Worker(new URL("./pixels-worker.js", import.meta.url));
  } catch (erro) {
    return trabalhador;
  }
  trabalhador.addEventListener("message", ({ data }) => {
    const espera = esperandoCortina.get(data.id);
    if (espera) espera(data.tipo);
  });

  /* Janela sem foco ou escondida: tudo para. Volta ao receber o foco. */
  const pausar = () =>
    trabalhador.postMessage({ tipo: "pausar", valor: document.hidden || !document.hasFocus() });
  addEventListener("blur", pausar);
  addEventListener("focus", pausar);
  document.addEventListener("visibilitychange", pausar);
  pausar();

  /* Um ouvinte de ponteiro para todos os campos. A caixa de cada um só é
     medida de novo depois de rolar ou redimensionar. */
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", (e) => {
      for (const campo of instancias) campo._ponteiro(e.clientX, e.clientY);
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => {
      for (const campo of instancias) campo._ponteiro(-1e5, -1e5);
    });
  }
  addEventListener("scroll", () => {
    for (const campo of instancias) campo._caixa = null;
  }, { passive: true, capture: true });
  addEventListener("resize", () => {
    for (const campo of instancias) campo._caixa = null;
  }, { passive: true });

  /* Tema novo: cada campo relê as cores e o worker repinta. */
  document.addEventListener("mo-tema", () => {
    for (const campo of instancias) campo._enviarCores();
  });
  return trabalhador;
}

/* "destaque secundaria #fff" → três cores [r,g,b] resolvidas no elemento. */
function lerCores(el) {
  const pedidas = (el.getAttribute("cores") || "destaque secundaria terciaria").trim().split(/\s+(?![^(]*\))/);
  while (pedidas.length < 3) pedidas.push(pedidas[pedidas.length - 1] || "destaque");
  return pedidas.slice(0, 3).map((nome) => {
    if (TOKENS.has(nome)) return rgb(`var(--mo-${nome})`, el);
    if (nome.startsWith("--")) return rgb(`var(${nome})`, el);
    return rgb(nome, el);
  });
}

function numero(el, nome) {
  const valor = parseFloat(el.getAttribute(nome));
  return Number.isFinite(valor) ? valor : PADRAO[nome];
}

export class MoPixels extends HTMLElement {
  static observedAttributes = ["passo", "lente", "velocidade", "opacidade", "cores", "estatico"];

  connectedCallback() {
    const w = obterTrabalhador();
    if (!w || this._id) return;
    this._id = `campo-${proximoId++}`;
    this.setAttribute("aria-hidden", "true");

    const canvas = document.createElement("canvas");
    this.appendChild(canvas);
    const caixa = this.getBoundingClientRect();
    this._tamanho = [caixa.width, caixa.height];
    const tela = canvas.transferControlToOffscreen();
    w.postMessage(
      {
        tipo: "campo",
        id: this._id,
        canvas: tela,
        largura: caixa.width,
        altura: caixa.height,
        escala: escala(),
        movimento: !semMovimento() && !this.hasAttribute("estatico"),
        ...this._opcoes(),
        ...this._cores(),
      },
      [tela],
    );

    /* Mede pela caixa na tela (getBoundingClientRect), não pelo
       contentRect: com zoom no <html> (--mo-escala) é ela que diz quantos
       pontos cabem, e o passo fica em pixels de tela. */
    this._observador = new ResizeObserver(() => {
      const { width, height } = this.getBoundingClientRect();
      this._caixa = null;
      if (width === this._tamanho[0] && height === this._tamanho[1]) return;
      this._tamanho = [width, height];
      w.postMessage({ tipo: "tamanho", id: this._id, largura: width, altura: height, escala: escala() });
    });
    this._observador.observe(this);

    /* Fora da tela, o campo não gasta nada. */
    this._visibilidade = new IntersectionObserver(([entrada]) => {
      w.postMessage({ tipo: "visivel", id: this._id, valor: entrada.isIntersecting });
    });
    this._visibilidade.observe(this);

    instancias.add(this);
  }

  disconnectedCallback() {
    if (!this._id) return;
    instancias.delete(this);
    this._observador.disconnect();
    this._visibilidade.disconnect();
    trabalhador.postMessage({ tipo: "remover", id: this._id });
    this.querySelector(":scope > canvas")?.remove();
    this._id = null;
  }

  attributeChangedCallback(nome, antes, depois) {
    if (!this._id || antes === depois) return;
    if (nome === "cores") this._enviarCores();
    else if (nome === "estatico") {
      this._enviarOpcoes({ movimento: !semMovimento() && depois === null });
    } else this._enviarOpcoes(this._opcoes());
  }

  _opcoes() {
    return {
      passo: Math.max(6, Math.round(numero(this, "passo"))),
      lente: Math.max(0, numero(this, "lente")),
      velocidade: numero(this, "velocidade"),
      opacidade: Math.min(1, Math.max(0, numero(this, "opacidade"))),
    };
  }

  _cores() {
    return {
      cores: lerCores(this),
      corNeutra: rgb("var(--mo-texto)", this),
      opacidade: this._opcoes().opacidade,
    };
  }

  _enviarCores() {
    if (this._id) trabalhador.postMessage({ tipo: "cores", id: this._id, ...this._cores() });
  }

  _enviarOpcoes(opcoes) {
    trabalhador.postMessage({ tipo: "opcoes", id: this._id, opcoes });
    if ("opacidade" in opcoes) this._enviarCores();
  }

  /* Só manda o ponteiro quando ele está perto (dentro da caixa mais o raio
     da lente), e manda "saiu" uma vez quando ele se afasta. */
  _ponteiro(x, y) {
    if (!this._id) return;
    const caixa = (this._caixa ??= this.getBoundingClientRect());
    const margem = numero(this, "lente");
    const perto =
      margem > 0 &&
      x > caixa.left - margem && x < caixa.right + margem &&
      y > caixa.top - margem && y < caixa.bottom + margem;
    if (!perto && !this._perto) return;
    this._perto = perto;
    trabalhador.postMessage({
      tipo: "ponteiro",
      id: this._id,
      x: perto ? x - caixa.left : -9999,
      y: perto ? y - caixa.top : -9999,
    });
  }
}

/* ======================================================================
   Cortina
   ====================================================================== */

/* A parte visível de uma área e um <canvas> fixo em cima dela. As medidas
   são da tela; com zoom no <html> (--mo-escala), o canvas fixo é escalado
   junto, então o CSS dele vai dividido pelo zoom. */
function cortinaSobre(alvo) {
  const caixa = alvo.getBoundingClientRect();
  const esquerda = Math.max(0, caixa.left);
  const topo = Math.max(0, caixa.top);
  const largura = Math.min(innerWidth, caixa.right) - esquerda;
  const altura = Math.min(innerHeight, caixa.bottom) - topo;
  if (largura < 1 || altura < 1) return null;

  const canvas = document.createElement("canvas");
  canvas.className = "mo-cortina";
  canvas.style.cssText = "left:0;top:0;width:100px;height:100px";
  document.body.appendChild(canvas);
  const zoom = canvas.getBoundingClientRect().width / 100 || 1;
  canvas.style.cssText =
    `left:${esquerda / zoom}px;top:${topo / zoom}px;width:${largura / zoom}px;height:${altura / zoom}px`;
  return { canvas, esquerda, topo, largura, altura };
}

/* A cor que cobre: a do fundo da área, se ela tiver um; senão, a da janela. */
function corDaCortina(alvo, cor) {
  if (cor) return rgb(cor, alvo);
  const fundo = getComputedStyle(alvo).backgroundColor;
  return fundo && !/rgba\(.*,\s*0\)$|transparent/.test(fundo) ? rgb(fundo) : rgb("var(--mo-fundo)", alvo);
}

function mensagemCortina(tipo, id, area, alvo, { x, y, passo, cor }) {
  return {
    tipo,
    id,
    canvas: area.canvas.transferControlToOffscreen(),
    largura: area.largura,
    altura: area.altura,
    escala: escala(),
    passo,
    ox: typeof x === "number" ? x - area.esquerda : area.largura / 2,
    oy: typeof y === "number" ? y - area.topo : area.altura / 2,
    corCortina: corDaCortina(alvo, cor),
    cores: [rgb("var(--mo-destaque)", alvo), rgb("var(--mo-secundaria)", alvo), rgb("var(--mo-terciaria)", alvo)],
  };
}

/* Revela uma área em onda de pixels a partir de um ponto.

     await revelar(painel, { x, y, trocar: () => mostrarOutraCoisa() })

   A área é coberta na hora (na cor do fundo), `trocar` roda por baixo da
   cobertura, e a onda abre a partir de (x, y) — coordenadas da tela, como
   as de um clique. Sem x/y, sai do centro. Sem suporte, ou com movimento
   reduzido, só troca. */
export async function revelar(alvo, { x, y, trocar, passo = PADRAO.passo, cor } = {}) {
  const w = obterTrabalhador();
  if (!alvo || !w || semMovimento()) {
    await trocar?.();
    return;
  }

  /* Só a parte visível da área: o resto não precisa de onda. */
  const area = cortinaSobre(alvo);
  if (!area) {
    await trocar?.();
    return;
  }

  const id = `cortina-${proximoId++}`;
  const pronto = new Promise((resolver) => {
    esperandoCortina.set(id, async (tipo) => {
      if (tipo === "coberto") {
        try {
          /* Mais um quadro aqui: o canvas do worker e o DOM da página chegam
             à tela por caminhos diferentes. */
          await new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto)));
          await trocar?.();
        } finally {
          w.postMessage({ tipo: "iniciar", id });
        }
      } else if (tipo === "revelado") {
        esperandoCortina.delete(id);
        area.canvas.remove();
        resolver();
      }
    });
  });

  const msg = mensagemCortina("revelar", id, area, alvo, { x, y, passo, cor });
  msg.esperar = true;
  w.postMessage(msg, [msg.canvas]);
  return pronto;
}

/* O contrário de revelar: cobre a parte visível da área numa onda de
   pixels que sai de (x, y), e a cobertura fica ali até você tirar.

     const capa = cobrir(painel, { x, y });
     await capa.pronto;     // tudo coberto
     capa.remover();        // tira a cobertura (some na hora)

   Devolve null sem suporte ou com movimento reduzido: aí cubra você mesmo
   (o .mo-carregando faz isso com um fundo chapado). */
export function cobrir(alvo, { x, y, passo = PADRAO.passo, cor } = {}) {
  const w = obterTrabalhador();
  if (!alvo || !w || semMovimento()) return null;
  const area = cortinaSobre(alvo);
  if (!area) return null;

  const id = `cortina-${proximoId++}`;
  let removida = false;
  const pronto = new Promise((resolver) => {
    esperandoCortina.set(id, (tipo) => {
      if (tipo === "coberto") {
        esperandoCortina.delete(id);
        resolver();
      }
    });
  });
  const msg = mensagemCortina("cobrir", id, area, alvo, { x, y, passo, cor });
  w.postMessage(msg, [msg.canvas]);

  return {
    pronto,
    canvas: area.canvas,
    remover() {
      if (removida) return;
      removida = true;
      esperandoCortina.delete(id);
      w.postMessage({ tipo: "cancelar", id });
      area.canvas.remove();
    },
  };
}

if (!customElements.get("mo-pixels")) customElements.define("mo-pixels", MoPixels);
