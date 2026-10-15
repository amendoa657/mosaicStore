/* Transição entre páginas: a onda de pixels.

   Ao sair de uma página, guarda onde foi o último clique (se foi agora há
   pouco). A página nova nasce coberta (o mosaic-inicio.js liga a classe
   mo-revelando antes da primeira pintura) e a área de conteúdo se revela em
   onda a partir desse ponto; sem clique recente (teclado, redirecionamento
   depois de um formulário), a onda sai do meio.

   A área é o elemento com data-mo-cortina, ou .mo-conteudo. */

import { revelar } from "./pixels.js";

const CHAVE = "mo:origem";
const RECENTE_MS = 5000;

export function ligarTransicao() {
  let ultimoToque = null;
  document.addEventListener(
    "pointerdown",
    (e) => {
      ultimoToque = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    { capture: true, passive: true },
  );
  addEventListener("pagehide", () => {
    const recente = ultimoToque && Date.now() - ultimoToque.t < RECENTE_MS;
    try {
      sessionStorage.setItem(
        CHAVE,
        JSON.stringify(recente ? { x: ultimoToque.x, y: ultimoToque.y, t: Date.now() } : { t: Date.now() }),
      );
    } catch (erro) {
      /* sem sessionStorage: a página nova só não faz a onda */
    }
  });

  const raiz = document.documentElement;
  if (!raiz.classList.contains("mo-revelando")) return;

  const alvo = document.querySelector("[data-mo-cortina]") || document.querySelector(".mo-conteudo");
  const origem = window.__moOrigem || {};
  revelar(alvo, {
    x: origem.x,
    y: origem.y,
    trocar: () => raiz.classList.remove("mo-revelando"),
  }).finally(() => raiz.classList.remove("mo-revelando"));
}
