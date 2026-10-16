/* Carregando: a espera de uma área, no lugar de uma tela parada.

     const espera = carregando(painel, { texto: "Instalados", detalhe: "lendo o pacman" });
     espera.atualizar({ texto: "Outra coisa" });
     espera.parar();

   A área visível é coberta por uma onda de pixels que sai de (x, y), ou do
   meio, e quando ela fecha aparecem a marca girando, o texto e o detalhe.
   Sem pixels (movimento reduzido, sem Worker), a cobertura é um fundo
   chapado que aparece num fade curto. Enquanto isso, a área ganha
   aria-busy e nada nela recebe clique.

   Na troca de página isso já é automático (js/transicao.js): é a tela que
   aparece quando a próxima demora a chegar. */

import { cobrir } from "./pixels.js";

/* Com zoom no <html> (--mo-escala), um elemento fixo é escalado junto: as
   medidas da tela vão divididas por ele. */
export function zoomDaPagina() {
  const sonda = document.createElement("i");
  sonda.style.cssText = "position:fixed;left:0;top:0;width:100px;height:0;visibility:hidden;pointer-events:none";
  document.body.append(sonda);
  const zoom = sonda.getBoundingClientRect().width / 100 || 1;
  sonda.remove();
  return zoom;
}

export function carregando(alvo, { texto = "", detalhe = "", x, y } = {}) {
  alvo = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
  if (!alvo) return null;

  /* Só a parte visível da área, como a onda. */
  const caixa = alvo.getBoundingClientRect();
  const esquerda = Math.max(0, caixa.left);
  const topo = Math.max(0, caixa.top);
  const largura = Math.max(0, Math.min(innerWidth, caixa.right) - esquerda);
  const altura = Math.max(0, Math.min(innerHeight, caixa.bottom) - topo);
  const zoom = zoomDaPagina();

  const el = document.createElement("div");
  el.className = "mo-carregando";
  el.setAttribute("role", "status");
  el.style.cssText =
    `left:${esquerda / zoom}px;top:${topo / zoom}px;width:${largura / zoom}px;height:${altura / zoom}px`;
  const marca = document.createElement("i");
  marca.className = "mo-marca mo-marca--girando";
  marca.setAttribute("aria-hidden", "true");
  const titulo = document.createElement("strong");
  const legenda = document.createElement("span");
  el.append(marca, titulo, legenda);

  const escrever = (t, d) => {
    titulo.textContent = t || "Carregando";
    legenda.textContent = d || (t ? "carregando" : "");
    legenda.hidden = !legenda.textContent;
  };
  escrever(texto, detalhe);

  const capa = cobrir(alvo, { x, y });
  if (!capa) {
    /* Sem a onda, cobre com o fundo da própria área (ou o da janela). */
    el.classList.add("mo-carregando--chapado");
    const fundo = getComputedStyle(alvo).backgroundColor;
    if (fundo && !/rgba\(.*,\s*0\)$|transparent/.test(fundo)) el.style.background = fundo;
  }
  document.body.append(el);
  alvo.setAttribute("aria-busy", "true");

  /* O texto aparece quando a onda fecha, ou logo, se ela demorar. */
  let parado = false;
  const mostrar = () => {
    if (!parado) el.classList.add("mo-pronto");
  };
  if (capa) capa.pronto.then(mostrar);
  setTimeout(mostrar, capa ? 420 : 60);

  return {
    elemento: el,
    /* O meio da área, em coordenadas da tela: a página nova se abre daqui. */
    centro: { x: esquerda + largura / 2, y: topo + altura / 2 },
    atualizar({ texto: t = texto, detalhe: d = detalhe } = {}) {
      texto = t;
      detalhe = d;
      escrever(t, d);
    },
    parar() {
      if (parado) return;
      parado = true;
      el.remove();
      capa?.remover();
      alvo.removeAttribute("aria-busy");
    },
  };
}
