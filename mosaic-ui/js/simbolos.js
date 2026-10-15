/* Símbolos em pixel: cada um é uma grade de 9 × 9, desenhada à mão.
   "#" é pixel aceso. O SVG sai com um retângulo por trecho aceso de cada
   linha (poucos nós, sem antisserrilhado: shape-rendering crispEdges).

   <mo-simbolo nome="busca"></mo-simbolo>
   <mo-simbolo nome="lixo" tamanho="27" rotulo="Remover"></mo-simbolo>

   Para registrar um símbolo novo:
     import { registrarSimbolo } from "mosaic-ui/mosaic.js";
     registrarSimbolo("raio", [".....##..", …9 linhas…]); */

const G = (texto) => texto.trim().split(/\s+/);

const DESENHOS = {
  busca: G(`
    ..###....
    .#...#...
    #.....#..
    #.....#..
    #.....#..
    .#...#...
    ..###.#..
    .......#.
    ........#`),
  fechar: G(`
    .........
    .#.....#.
    ..#...#..
    ...#.#...
    ....#....
    ...#.#...
    ..#...#..
    .#.....#.
    .........`),
  mais: G(`
    .........
    ....#....
    ....#....
    ....#....
    .#######.
    ....#....
    ....#....
    ....#....
    .........`),
  menos: G(`
    .........
    .........
    .........
    .........
    .#######.
    .........
    .........
    .........
    .........`),
  dividir: G(`
    .........
    ....#....
    .........
    .........
    .#######.
    .........
    .........
    ....#....
    .........`),
  igual: G(`
    .........
    .........
    .........
    .#######.
    .........
    .#######.
    .........
    .........
    .........`),
  "seta-direita": G(`
    .........
    ....#....
    .....#...
    ......#..
    .#######.
    ......#..
    .....#...
    ....#....
    .........`),
  check: G(`
    .........
    .........
    .......#.
    ......#..
    .#...#...
    ..#.#....
    ...#.....
    .........
    .........`),
  menu: G(`
    .........
    .#######.
    .........
    .........
    .#######.
    .........
    .........
    .#######.
    .........`),
  opcoes: G(`
    .........
    .........
    .........
    .........
    .#..#..#.
    .........
    .........
    .........
    .........`),
  mosaico: G(`
    ####.####
    ####.####
    ####.####
    ####.####
    .........
    ####.####
    ####.####
    ####.####
    ####.####`),
  casa: G(`
    ....#....
    ...#.#...
    ..#...#..
    .#.....#.
    #.#...#.#
    ..#...#..
    ..#.#.#..
    ..#.#.#..
    ..#####..`),
  lixo: G(`
    ...###...
    .#######.
    .........
    ..#####..
    ..#.#.#..
    ..#.#.#..
    ..#.#.#..
    ..#.#.#..
    ..#####..`),
  baixar: G(`
    ....#....
    ....#....
    ....#....
    ..#.#.#..
    ...###...
    ....#....
    .........
    .#.....#.
    .#######.`),
  atualizar: G(`
    ..####.#.
    .#....##.
    #....###.
    #........
    #.......#
    ........#
    .###....#
    .##....#.
    .#.####..`),
  config: G(`
    ....#....
    .#.###.#.
    ..#####..
    .##...##.
    ###...###
    .##...##.
    ..#####..
    .#.###.#.
    ....#....`),
  estrela: G(`
    ....#....
    ....#....
    ...###...
    #########
    .#######.
    ..#####..
    ..##.##..
    .##...##.
    .#.....#.`),
  coracao: G(`
    .........
    .##...##.
    ####.####
    #########
    #########
    .#######.
    ..#####..
    ...###...
    ....#....`),
  play: G(`
    ..#......
    ..##.....
    ..###....
    ..####...
    ..#####..
    ..####...
    ..###....
    ..##.....
    ..#......`),
  pausa: G(`
    .........
    .##...##.
    .##...##.
    .##...##.
    .##...##.
    .##...##.
    .##...##.
    .##...##.
    .........`),
  microfone: G(`
    ...###...
    ..#####..
    ..#####..
    #.#####.#
    #..###..#
    .#.....#.
    ..#####..
    ....#....
    ..#####..`),
  voz: G(`
    .........
    ....#....
    ..#.#.#..
    #.#.#.#.#
    #.#.#.#.#
    #.#.#.#.#
    ..#.#.#..
    ....#....
    .........`),
  email: G(`
    .........
    #########
    ##.....##
    #.#...#.#
    #..#.#..#
    #...#...#
    #.......#
    #########
    .........`),
  imagem: G(`
    #########
    #.......#
    #.##....#
    #.##....#
    #.....#.#
    #..#.####
    #.#######
    #########
    .........`),
  noticias: G(`
    #########
    #.......#
    #.###.#.#
    #.###...#
    #.###.#.#
    #.......#
    #.#####.#
    #.......#
    #########`),
  calculadora: G(`
    .#######.
    .#.....#.
    .#.....#.
    .#######.
    .#.#.#.#.
    .#.....#.
    .#.#.#.#.
    .#.....#.
    .#######.`),
  pacote: G(`
    #########
    #...#...#
    #########
    .#.....#.
    .#.###.#.
    .#.....#.
    .#.....#.
    .#######.
    .........`),
  terminal: G(`
    .........
    #########
    #.......#
    #.#.....#
    #..#....#
    #.#..##.#
    #.......#
    #########
    .........`),
  pasta: G(`
    .........
    ####.....
    #########
    #.......#
    #.......#
    #.......#
    #.......#
    #########
    .........`),
  copiar: G(`
    ...######
    ...#....#
    ######..#
    #....#..#
    #....#..#
    #....####
    #....#...
    ######...
    .........`),
  editar: G(`
    .......#.
    ......###
    .....###.
    ....###..
    ...###...
    ..###....
    .###.....
    .##......
    #........`),
  info: G(`
    ....#....
    .........
    ...##....
    ....#....
    ....#....
    ....#....
    ....#....
    ...###...
    .........`),
  alerta: G(`
    ....#....
    ...#.#...
    ...#.#...
    ..#.#.#..
    ..#.#.#..
    .#.....#.
    .#..#..#.
    #.......#
    #########`),
  sino: G(`
    ....#....
    ...###...
    ..#####..
    ..#####..
    ..#####..
    .#######.
    #########
    .........
    ....#....`),
  usuario: G(`
    ...###...
    ..#####..
    ..#####..
    ..#####..
    ...###...
    .........
    .#######.
    #########
    #########`),
  sol: G(`
    ....#....
    .#.....#.
    ...###...
    ..#####..
    #.#####.#
    ..#####..
    ...###...
    .#.....#.
    ....#....`),
  lua: G(`
    ...###...
    ..##.....
    .##......
    .##......
    .##......
    .##......
    .##.....#
    ..##..##.
    ...####..`),
  relogio: G(`
    ..#####..
    .#.....#.
    #...#...#
    #...#...#
    #...###.#
    #.......#
    #.......#
    .#.....#.
    ..#####..`),
};

/* Derivados: as outras setas giram a da direita. */
const espelhar = (g) => g.map((linha) => [...linha].reverse().join(""));
const transpor = (g) => g.map((_, i) => g.map((linha) => linha[i]).join(""));
DESENHOS["seta-esquerda"] = espelhar(DESENHOS["seta-direita"]);
DESENHOS["seta-baixo"] = transpor(DESENHOS["seta-direita"]);
DESENHOS["seta-cima"] = transpor(DESENHOS["seta-esquerda"]);
DESENHOS.voltar = DESENHOS["seta-esquerda"];
DESENHOS.vezes = DESENHOS.fechar;

const cache = new Map();

/* Grade → atributo d do <path>, um retângulo por trecho aceso. */
function caminho(grade) {
  let d = "";
  grade.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      if (linha[x] !== "#") {
        x += 1;
        continue;
      }
      const inicio = x;
      while (linha[x] === "#") x += 1;
      d += `M${inicio} ${y}h${x - inicio}v1h${inicio - x}z`;
    }
  });
  return d;
}

export function simbolo(nome) {
  if (cache.has(nome)) return cache.get(nome);
  const grade = DESENHOS[nome];
  if (!grade) return "";
  const lado = grade.length;
  const svg = `<svg viewBox="0 0 ${lado} ${lado}" aria-hidden="true"><path d="${caminho(grade)}"/></svg>`;
  cache.set(nome, svg);
  return svg;
}

export const nomesSimbolos = () => Object.keys(DESENHOS);

export function registrarSimbolo(nome, grade) {
  DESENHOS[nome] = grade;
  cache.delete(nome);
  document.querySelectorAll(`mo-simbolo[nome="${CSS.escape(nome)}"]`).forEach((el) => el.desenhar());
}

export class MoSimbolo extends HTMLElement {
  static observedAttributes = ["nome", "tamanho", "rotulo"];

  connectedCallback() {
    this.classList.add("mo-simbolo");
    this.desenhar();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.desenhar();
  }

  desenhar() {
    this.innerHTML = simbolo(this.getAttribute("nome"));
    const tamanho = this.getAttribute("tamanho");
    if (tamanho) this.style.setProperty("--mo-simbolo-tamanho", /^\d+$/.test(tamanho) ? `${tamanho}px` : tamanho);
    const rotulo = this.getAttribute("rotulo");
    if (rotulo) {
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", rotulo);
      this.removeAttribute("aria-hidden");
    } else {
      this.setAttribute("aria-hidden", "true");
    }
  }
}

if (!customElements.get("mo-simbolo")) customElements.define("mo-simbolo", MoSimbolo);
