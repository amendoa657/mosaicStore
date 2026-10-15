/* Mosaic UI: o JavaScript.

   <script type="module" src="mosaic-ui/mosaic.js"></script>

   Só de carregar, ele:
     - registra os elementos <mo-pixels>, <mo-simbolo> e <mo-icone-app>;
     - liga os comportamentos data-mo-* (diálogos, menus, abas, atalhos…);
     - faz a onda de pixels na troca de página (com o mosaic-inicio.js).

   Para controlar quando isso acontece, ponha data-mo-manual no <html> e
   chame iniciar() você mesmo.

   E exporta o que dá para usar direto do seu código:
     import { avisar, tema, revelar } from "./mosaic-ui/mosaic.js"; */

import { iniciarComponentes } from "./js/componentes.js";
import { ligarTransicao } from "./js/transicao.js";
import "./js/simbolos.js";
import "./js/icone-app.js";
import "./js/pixels.js";

import * as tema from "./js/tema.js";

export { tema };
export { avisar } from "./js/avisos.js";
export { revelar, suportado as pixelsSuportados } from "./js/pixels.js";
export { simbolo, registrarSimbolo, nomesSimbolos } from "./js/simbolos.js";
export {
  abrir,
  fechar,
  abrirMenu,
  escolherAba,
  filtrar,
  copiar,
  terminal,
  sincronizarBarras,
} from "./js/componentes.js";
export const { tom, inicial } = tema;

let iniciado = false;

export function iniciar(raiz = document) {
  iniciarComponentes(raiz);
  if (!iniciado) {
    iniciado = true;
    ligarTransicao();
  }
}

if (!document.documentElement.hasAttribute("data-mo-manual")) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => iniciar(), { once: true });
  } else {
    iniciar();
  }
}
