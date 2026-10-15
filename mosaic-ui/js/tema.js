/* Tema: ler e trocar as cores em tempo real.

   As cores do Mosaic são as do Matugen (as mesmas variáveis do colors.css
   que o template gera). Trocar o tema é só redefinir essas variáveis: o CSS
   da biblioteca inteira acompanha, e quem desenha em <canvas> (os pixels)
   ouve o evento "mo-tema" e se repinta. */

/* As variáveis do Matugen e o nome curto de cada uma. */
export const VARIAVEIS = {
  destaque: "--corDestaque",
  destaqueFundo: "--corFundoDestaque",
  sobreDestaque: "--corTextoDestaque",
  secundaria: "--corAcentoSecundario",
  secundariaFundo: "--corFundoAcentoSecundario",
  secundariaTexto: "--corTextoAcentoSecundario",
  terciaria: "--corAcentoTerciario",
  terciariaFundo: "--corFundoAcentoTerciario",
  terciariaTexto: "--corTextoAcentoTerciario",
  perigo: "--corDestrutiva",
  perigoFundo: "--corFundoDestrutivo",
  perigoTexto: "--corTextoDestrutivo",
  fundo: "--corFundoVisualizacao",
  janela: "--corFundoJanela",
  lateral2: "--corFundoBarraLateralSecundaria",
  cabecalho: "--corFundoBarraCabecalho",
  lateral: "--corFundoBarraLateral",
  cartao: "--corFundoCartao",
  dialogo: "--corFundoDialogo",
  elevada: "--corFundoPopUp",
  texto: "--corTextoJanela",
};

/* Três paletas que o Matugen gerou de wallpapers reais, para testar e para
   apps que queiram uma cor fixa. */
export const PALETAS = {
  menta: {
    destaque: "#86d7ac", destaqueFundo: "#86d7ac", sobreDestaque: "#003823",
    secundaria: "#e9b9d3", secundariaFundo: "#5f3c51", secundariaTexto: "#ffd8eb",
    terciaria: "#b5c5f9", terciariaFundo: "#354571", terciariaTexto: "#dae2ff",
    fundo: "#0f0d15", janela: "#14121a", lateral2: "#1d1a22", cabecalho: "#211e26",
    lateral: "#211e26", cartao: "#211e26", dialogo: "#2b2931", elevada: "#36333c",
    texto: "#e6e0ec",
  },
  laranja: {
    destaque: "#ffb77c", destaqueFundo: "#ffb77c", sobreDestaque: "#4a2800",
    secundaria: "#e2c0a4", secundariaFundo: "#5a4330", secundariaTexto: "#ffdcc2",
    terciaria: "#c1cc8f", terciariaFundo: "#414b1d", terciariaTexto: "#dde8a9",
    fundo: "#140d08", janela: "#19120c", lateral2: "#211a14", cabecalho: "#261e17",
    lateral: "#261e17", cartao: "#2b231c", dialogo: "#332a22", elevada: "#3c332b",
    texto: "#f0dfd5",
  },
  azul: {
    destaque: "#a8c8ff", destaqueFundo: "#a8c8ff", sobreDestaque: "#003062",
    secundaria: "#bdc7dc", secundariaFundo: "#3e4759", secundariaTexto: "#d9e3f8",
    terciaria: "#dbbce1", terciariaFundo: "#563e5c", terciariaTexto: "#f8d8fd",
    fundo: "#0c0e13", janela: "#111318", lateral2: "#191c20", cabecalho: "#1d2024",
    lateral: "#1d2024", cartao: "#22252a", dialogo: "#282a2f", elevada: "#33353a",
    texto: "#e2e2e9",
  },
};

/* ---------- Ler ---------- */
let amostra = null;

/* Resolve qualquer cor CSS (hex, rgb, color-mix, var…) em [r, g, b]. O
   navegador calcula num elemento de prova e um pixel de canvas devolve os
   números, o formato que o <canvas> e o worker precisam. */
export function rgb(cor, onde = document.body) {
  return rgba(cor, onde).slice(0, 3);
}

/* O mesmo, com a opacidade (0 a 255) no fim: [r, g, b, a]. */
export function rgba(cor, onde = document.body) {
  amostra ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const prova = document.createElement("i");
  prova.style.cssText = `position:absolute;visibility:hidden;color:${cor}`;
  (onde || document.documentElement).appendChild(prova);
  const resolvida = getComputedStyle(prova).color;
  prova.remove();
  amostra.clearRect(0, 0, 1, 1);
  amostra.fillStyle = "#000";
  amostra.fillStyle = resolvida;
  amostra.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = amostra.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a];
}

export const hex = ([r, g, b]) =>
  "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");

/* As cores do tema que vale para o elemento, já resolvidas:
   { destaque: [r,g,b], secundaria: [...], ... } */
export function cores(onde = document.body) {
  const saida = {};
  for (const nome of ["destaque", "secundaria", "terciaria", "perigo", "fundo", "janela", "cartao", "elevada", "texto"]) {
    saida[nome] = rgb(`var(--mo-${nome})`, onde);
  }
  return saida;
}

/* ---------- Trocar ---------- */
/* aplicar(PALETAS.laranja) ou aplicar({ destaque: "#ff8800" }) ou
   aplicar({ "--corDestaque": "#ff8800" }). Só muda o que vier; o resto
   continua. aplicar(null) volta para o tema do CSS (Matugen). */
export function aplicar(paleta, alvo = document.documentElement) {
  if (paleta === null) {
    for (const variavel of Object.values(VARIAVEIS)) alvo.style.removeProperty(variavel);
  } else {
    for (const [chave, valor] of Object.entries(paleta)) {
      const variavel = chave.startsWith("--") ? chave : VARIAVEIS[chave];
      if (variavel) alvo.style.setProperty(variavel, valor);
    }
  }
  avisarMudanca(alvo);
}

/* Carrega um colors.css (o arquivo que o Matugen escreve) e põe por cima.
   Chamar de novo troca o anterior. */
export async function carregar(url) {
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) throw new Error(`tema: ${resposta.status} em ${url}`);
  const css = await resposta.text();
  let estilo = document.getElementById("mo-tema-carregado");
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = "mo-tema-carregado";
    document.head.appendChild(estilo);
  }
  estilo.textContent = css;
  avisarMudanca(document.documentElement);
}

/* Avisa quem desenha em canvas (o evento sobe até o document). Num
   requestAnimationFrame para o estilo novo já estar calculado. */
function avisarMudanca(alvo) {
  requestAnimationFrame(() => {
    alvo.dispatchEvent(new CustomEvent("mo-tema", { bubbles: true }));
  });
}

/* ---------- Tons ---------- */
const ALFABETO = "abcdefghijklmnopqrstuvwxyz0123456789";

/* O tom (0 a 3) de um nome. O mesmo nome cai sempre no mesmo tom, em
   qualquer app: "firefox" é sempre da mesma cor. */
export function tom(nome = "") {
  const texto = String(nome).toLowerCase();
  if (!texto) return 0;
  const s = ALFABETO.indexOf(texto[0]) + texto.length * 7;
  return s % 4;
}

/* A inicial que vai no ícone: a primeira letra ou número do nome. */
export function inicial(nome = "") {
  const achada = String(nome).match(/[\p{L}\p{N}]/u);
  return achada ? achada[0].toUpperCase() : "?";
}
