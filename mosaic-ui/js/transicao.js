/* Transição entre páginas: a onda de pixels.

   Ao sair de uma página (link ou formulário do mesmo app), guarda onde foi
   o clique. A página nova nasce coberta (o mosaic-inicio.js liga a classe
   mo-revelando antes da primeira pintura) e a área de conteúdo se revela em
   onda a partir desse ponto.

   A área é o elemento com data-mo-cortina, ou .mo-conteudo. Links com
   data-mo-sem-transicao (ou target, download, Ctrl/⌘) não entram. */

import { revelar } from "./pixels.js";

const CHAVE = "mo:origem";

function guardar(x, y) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ x, y, t: Date.now() }));
  } catch (erro) {
    /* sem sessionStorage: a página nova só não faz a onda */
  }
}

function mesmoApp(url) {
  try {
    const destino = new URL(url, location.href);
    if (destino.origin !== location.origin) return false;
    /* Âncora na mesma página não é troca de página. */
    return !(destino.pathname === location.pathname && destino.search === location.search && destino.hash);
  } catch (erro) {
    return false;
  }
}

export function ligarTransicao() {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest?.("a[href]");
    if (!link || link.target || link.hasAttribute("download") || link.closest("[data-mo-sem-transicao]")) return;
    if (!mesmoApp(link.href)) return;
    guardar(e.clientX, e.clientY);
  }, true);

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (form.target || form.closest("[data-mo-sem-transicao]") || !mesmoApp(form.action || location.href)) return;
    /* A onda sai da tecla que enviou (ou do meio do formulário). */
    const origem = (e.submitter || form).getBoundingClientRect();
    guardar(origem.left + origem.width / 2, origem.top + origem.height / 2);
  }, true);

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
