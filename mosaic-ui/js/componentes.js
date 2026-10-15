/* Comportamentos declarativos: escreva o atributo no HTML e pronto.
   Tudo é delegado no document, então funciona também no HTML que chegar
   depois (fetch, innerHTML, Jinja trocando um pedaço da página).

   data-mo-abrir="#id"      abre o <dialog> (diálogo ou painel) ou popover
   data-mo-fechar           fecha o diálogo/painel/menu em que está
   data-mo-gaveta           abre e fecha a lateral em telas estreitas
   data-mo-menu="#id"       abre o menu suspenso embaixo do botão
   data-mo-segmentos        grupo de teclas ou chips: só um fica ligado
   data-mo-filtrar="#lista" o campo filtra os itens da lista enquanto digita
   data-mo-copiar="texto"   copia o texto (ou o conteúdo de "#seletor")
   data-mo-ocupado          no <form>: a tecla que enviou fica ocupada
   data-mo-atalho="k"       a tecla do teclado aperta o botão (ou foca o campo);
                            com data-mo-atalhos="visivel" num pai, só vale
                            enquanto esse pai estiver na tela
   role="tablist"           abas com clique, setas, Home e End */

import { avisar } from "./avisos.js";

const $ = (seletor, raiz = document) => (seletor ? raiz.querySelector(seletor) : null);
const RITMO_BARRA = 2600; // ida e volta do bloco da barra indeterminada

/* ======================================================================
   Diálogos e painéis
   ====================================================================== */
export function abrir(alvo) {
  const el = typeof alvo === "string" ? $(alvo) : alvo;
  if (!el) return;
  if (el instanceof HTMLDialogElement) {
    if (el.open) return;
    el.classList.remove("mo-fechando");
    el.showModal();
  } else if (el.hasAttribute("popover")) {
    el.showPopover?.();
  }
}

/* Fecha com a animação de saída e só então tira da tela. */
export function fechar(alvo, valor) {
  const el = typeof alvo === "string" ? $(alvo) : alvo;
  if (!el) return;
  if (el instanceof HTMLDialogElement) {
    if (!el.open || el.classList.contains("mo-fechando")) return;
    const animado = !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !document.documentElement.classList.contains("mo-sem-movimento");
    if (!animado) {
      el.close(valor);
      return;
    }
    el.classList.add("mo-fechando");
    let feito = false;
    const fim = () => {
      if (feito) return;
      feito = true;
      el.classList.remove("mo-fechando");
      el.close(valor);
    };
    el.addEventListener("animationend", fim, { once: true });
    setTimeout(fim, 400);
  } else if (el.hasAttribute("popover")) {
    el.hidePopover?.();
  } else {
    el.classList.remove("mo-aberto");
    el._gatilho?.setAttribute("aria-expanded", "false");
  }
}

function ligarDialogos() {
  document.addEventListener("click", (e) => {
    const abridor = e.target.closest("[data-mo-abrir]");
    if (abridor) {
      e.preventDefault();
      abrir(abridor.dataset.moAbrir);
      return;
    }
    const fechador = e.target.closest("[data-mo-fechar]");
    if (fechador) {
      const caixa = fechador.closest("dialog, [popover], .mo-menu");
      if (caixa) {
        e.preventDefault();
        fechar(caixa, fechador.dataset.moFechar || fechador.value || undefined);
      }
      return;
    }
    /* Clique no fundo escurecido (fora da caixa do diálogo) fecha. */
    const dialogo = e.target;
    if (dialogo instanceof HTMLDialogElement && dialogo.open && dialogo.matches(".mo-dialogo, .mo-painel")) {
      const r = dialogo.getBoundingClientRect();
      const fora = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (fora && !dialogo.hasAttribute("data-mo-fixo")) fechar(dialogo);
    }
  });

  /* Esc: o navegador fecha na hora; a gente troca pela saída animada. */
  document.addEventListener("cancel", (e) => {
    const d = e.target;
    if (d instanceof HTMLDialogElement && d.matches(".mo-dialogo, .mo-painel")) {
      e.preventDefault();
      if (!d.hasAttribute("data-mo-fixo")) fechar(d);
    }
  }, true);
}

/* ======================================================================
   Gaveta (lateral em tela estreita)
   ====================================================================== */
function ligarGaveta() {
  const app = (el) => el.closest(".mo-app") || document.documentElement;
  const definir = (dono, aberta) => {
    dono.toggleAttribute("data-mo-gaveta-aberta", aberta);
    dono.querySelectorAll("[data-mo-gaveta]").forEach((b) => b.setAttribute("aria-expanded", String(aberta)));
  };

  document.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-mo-gaveta]");
    if (botao) {
      const dono = app(botao);
      definir(dono, !dono.hasAttribute("data-mo-gaveta-aberta"));
      return;
    }
    const aberta = document.querySelector("[data-mo-gaveta-aberta]");
    if (!aberta) return;
    /* Fora da lateral, ou num item dela: fecha. */
    const naLateral = e.target.closest(".mo-lateral");
    if (!naLateral || e.target.closest("a, .mo-nav-item")) definir(aberta, false);
  });
  document.addEventListener("keydown", (e) => {
    const aberta = document.querySelector("[data-mo-gaveta-aberta]");
    if (e.key === "Escape" && aberta) definir(aberta, false);
  });
}

/* ======================================================================
   Menu suspenso
   ====================================================================== */
function posicionarMenu(menu, gatilho) {
  const g = gatilho.getBoundingClientRect();
  menu.style.left = "0px";
  menu.style.top = "0px";
  const m = menu.getBoundingClientRect();
  const margem = 8;
  let x = g.left;
  let y = g.bottom + 6;
  let origem = "top left";
  if (x + m.width > innerWidth - margem) {
    x = Math.max(margem, g.right - m.width);
    origem = "top right";
  }
  if (y + m.height > innerHeight - margem && g.top - m.height - 6 > margem) {
    y = g.top - m.height - 6;
    origem = origem.replace("top", "bottom");
  }
  menu.style.left = `${Math.round(x)}px`;
  menu.style.top = `${Math.round(y)}px`;
  menu.style.setProperty("--mo-menu-origem", origem);
}

const itensMenu = (menu) =>
  [...menu.querySelectorAll(".mo-menu-item:not(:disabled):not([hidden])")];

export function abrirMenu(menu, gatilho) {
  menu = typeof menu === "string" ? $(menu) : menu;
  if (!menu) return;
  menu._gatilho = gatilho;
  if (menu.hasAttribute("popover") && menu.showPopover) {
    if (!menu.matches(":popover-open")) menu.showPopover();
  } else {
    menu.classList.add("mo-aberto");
  }
  if (gatilho) {
    posicionarMenu(menu, gatilho);
    gatilho.setAttribute("aria-expanded", "true");
  }
  itensMenu(menu)[0]?.focus({ preventScroll: true });
}

function ligarMenus() {
  document.addEventListener("click", (e) => {
    const gatilho = e.target.closest("[data-mo-menu]");
    if (gatilho) {
      const menu = $(gatilho.dataset.moMenu);
      if (!menu) return;
      /* O popover fecha sozinho no clique fora, e o gatilho é "fora":
         se acabou de fechar por este mesmo gatilho, o clique era para fechar. */
      const acabouDeFechar = menu._gatilho === gatilho && performance.now() - (menu._fechadoEm || 0) < 300;
      if (menu.matches(".mo-aberto") && menu._gatilho === gatilho) fechar(menu);
      else if (!acabouDeFechar) abrirMenu(menu, gatilho);
      return;
    }
    const item = e.target.closest(".mo-menu-item");
    if (item) {
      const menu = item.closest(".mo-menu");
      if (menu && !item.hasAttribute("data-mo-manter")) fechar(menu);
      return;
    }
    /* Menu sem popover: clique fora fecha. */
    document.querySelectorAll(".mo-menu.mo-aberto").forEach((m) => {
      if (!m.contains(e.target)) fechar(m);
    });
  });

  /* O popover pode fechar sozinho (clique fora, Esc): o gatilho acompanha.
     beforetoggle (e não toggle) porque roda na hora, antes do click. */
  document.addEventListener("beforetoggle", (e) => {
    const menu = e.target;
    if (!menu.classList?.contains("mo-menu") || e.newState !== "closed") return;
    menu._fechadoEm = performance.now();
    menu._gatilho?.setAttribute("aria-expanded", "false");
  }, true);

  document.addEventListener("keydown", (e) => {
    const menu = e.target.closest?.(".mo-menu");
    if (!menu) return;
    const itens = itensMenu(menu);
    const i = itens.indexOf(document.activeElement);
    let proximo = null;
    if (e.key === "ArrowDown") proximo = itens[(i + 1) % itens.length];
    else if (e.key === "ArrowUp") proximo = itens[(i - 1 + itens.length) % itens.length];
    else if (e.key === "Home") proximo = itens[0];
    else if (e.key === "End") proximo = itens[itens.length - 1];
    else if (e.key === "Escape" || e.key === "Tab") {
      fechar(menu);
      if (e.key === "Escape") menu._gatilho?.focus();
      return;
    }
    if (proximo) {
      e.preventDefault();
      proximo.focus();
    }
  });

  addEventListener("resize", () => {
    document.querySelectorAll(".mo-menu:popover-open, .mo-menu.mo-aberto").forEach((m) => fechar(m));
  });
}

/* ======================================================================
   Abas
   ====================================================================== */
export function escolherAba(aba, focar = false) {
  const lista = aba.closest('[role="tablist"]');
  if (!lista) return;
  for (const outra of lista.querySelectorAll('[role="tab"]')) {
    const ativa = outra === aba;
    outra.setAttribute("aria-selected", String(ativa));
    outra.tabIndex = ativa ? 0 : -1;
    const painel = document.getElementById(outra.getAttribute("aria-controls"));
    if (painel) painel.hidden = !ativa;
  }
  if (focar) aba.focus();
  lista.dispatchEvent(new CustomEvent("mo-aba", { bubbles: true, detail: { aba } }));
}

function prepararAbas(raiz) {
  raiz.querySelectorAll('[role="tablist"]').forEach((lista) => {
    const abas = [...lista.querySelectorAll('[role="tab"]')];
    const ativa = abas.find((a) => a.getAttribute("aria-selected") === "true") || abas[0];
    if (ativa) escolherAba(ativa);
    for (const aba of abas) {
      const painel = document.getElementById(aba.getAttribute("aria-controls"));
      if (painel) {
        painel.setAttribute("role", "tabpanel");
        painel.tabIndex = 0;
        if (aba.id) painel.setAttribute("aria-labelledby", aba.id);
      }
    }
  });
}

function ligarAbas() {
  document.addEventListener("click", (e) => {
    const aba = e.target.closest('[role="tablist"] [role="tab"]');
    if (aba) escolherAba(aba);
  });
  document.addEventListener("keydown", (e) => {
    const aba = e.target.closest?.('[role="tablist"] [role="tab"]');
    if (!aba) return;
    const abas = [...aba.closest('[role="tablist"]').querySelectorAll('[role="tab"]:not(:disabled)')];
    const i = abas.indexOf(aba);
    const destino = {
      ArrowRight: abas[(i + 1) % abas.length],
      ArrowLeft: abas[(i - 1 + abas.length) % abas.length],
      Home: abas[0],
      End: abas[abas.length - 1],
    }[e.key];
    if (destino) {
      e.preventDefault();
      escolherAba(destino, true);
    }
  });
}

/* ======================================================================
   Segmentos: uma tecla afundada por vez
   ====================================================================== */
function ligarSegmentos() {
  document.addEventListener("click", (e) => {
    const tecla = e.target.closest("[data-mo-segmentos] > :is(.mo-tecla, .mo-chip)");
    if (!tecla) return;
    const grupo = tecla.parentElement;
    for (const outra of grupo.querySelectorAll(":scope > :is(.mo-tecla, .mo-chip)")) {
      outra.setAttribute("aria-pressed", String(outra === tecla));
    }
    grupo.dispatchEvent(new CustomEvent("mo-escolha", {
      bubbles: true,
      detail: { valor: tecla.dataset.valor ?? tecla.textContent.trim(), tecla },
    }));
  });
}

/* ======================================================================
   Filtrar uma lista enquanto digita
   ====================================================================== */
const normalizar = (texto) =>
  texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export function filtrar(lista, termo) {
  lista = typeof lista === "string" ? $(lista) : lista;
  if (!lista) return 0;
  const busca = normalizar(termo);
  const itens = lista.querySelectorAll(":scope > :not([data-mo-sem-resultado])");
  let visiveis = 0;
  for (const item of itens) {
    const texto = normalizar(item.dataset.moTexto ?? item.textContent);
    const mostra = !busca || texto.includes(busca);
    item.hidden = !mostra;
    if (mostra) visiveis += 1;
  }
  const vazio = lista.querySelector(":scope > [data-mo-sem-resultado]") ||
    (lista.id && document.querySelector(`[data-mo-sem-resultado="#${CSS.escape(lista.id)}"]`));
  if (vazio) vazio.hidden = visiveis > 0;
  lista.dispatchEvent(new CustomEvent("mo-filtrado", { bubbles: true, detail: { visiveis, termo } }));
  return visiveis;
}

function ligarFiltros() {
  document.addEventListener("input", (e) => {
    const campo = e.target.closest?.("[data-mo-filtrar]");
    if (campo) filtrar(campo.dataset.moFiltrar, campo.value);
  });
}

/* ======================================================================
   Copiar
   ====================================================================== */
export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch (erro) {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function ligarCopiar() {
  document.addEventListener("click", async (e) => {
    const botao = e.target.closest("[data-mo-copiar]");
    if (!botao) return;
    const valor = botao.dataset.moCopiar;
    let texto = valor;
    if (/^[#.[]/.test(valor)) {
      const fonte = $(valor);
      if (fonte) texto = fonte.value ?? fonte.textContent;
    }
    await copiar(texto.trim());
    avisar(botao.dataset.moCopiado || "Copiado");
  });
}

/* ======================================================================
   Formulário ocupado
   ====================================================================== */
function ligarFormularios() {
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form.hasAttribute("data-mo-ocupado") || e.defaultPrevented) return;
    const tecla = e.submitter || form.querySelector('[type="submit"], button:not([type])');
    tecla?.setAttribute("aria-busy", "true");
  });
  /* Voltando pelo histórico, a página vem do cache com a tecla ocupada. */
  addEventListener("pageshow", (e) => {
    if (e.persisted) document.querySelectorAll('form [aria-busy="true"]').forEach((t) => t.removeAttribute("aria-busy"));
  });
}

/* ======================================================================
   Atalhos de teclado
   Escreva a tecla (ou várias, separadas por espaço) no data-mo-atalho:
   "/", "7", "Enter =", "ctrl+k", "Escape". Num botão, ele afunda e clica;
   num campo, ganha o foco.
   ====================================================================== */
function combinacao(e) {
  let nome = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  if (e.ctrlKey || e.metaKey) nome = `ctrl+${nome}`;
  if (e.altKey) nome = `alt+${nome}`;
  return nome;
}

const editando = (el) =>
  el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) &&
  !(el.type === "checkbox" || el.type === "radio" || el.type === "range" || el.type === "button");

function ligarAtalhos() {
  const apertadas = new Map();

  document.addEventListener("keydown", (e) => {
    if (e.isComposing || e.defaultPrevented) return;
    if (editando(document.activeElement) && e.key !== "Escape") return;
    if (document.querySelector("dialog[open]") && !e.target.closest?.("dialog[open]")) return;
    const nome = combinacao(e);
    const alvo = [...document.querySelectorAll("[data-mo-atalho]")].find((el) => {
      if (el.disabled || !el.getClientRects().length || el.closest("[inert]")) return false;
      const dialogo = document.querySelector("dialog[open]");
      if (dialogo && !dialogo.contains(el)) return false;
      /* data-mo-atalhos="visivel" num pai: só vale com ele na tela. */
      const escopo = el.closest('[data-mo-atalhos="visivel"]');
      if (escopo) {
        const r = escopo.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return false;
      }
      return el.dataset.moAtalho.toLowerCase().split(/\s+/).includes(nome);
    });
    if (!alvo) return;
    e.preventDefault();
    if (editando(alvo)) {
      alvo.focus();
      alvo.select?.();
      return;
    }
    if (e.repeat && !alvo.hasAttribute("data-mo-repetir")) return;
    alvo.classList.add("mo-apertada");
    apertadas.set(e.code || nome, alvo);
    alvo.click();
  });

  const soltar = (e) => {
    const alvo = apertadas.get(e.code);
    if (alvo) {
      alvo.classList.remove("mo-apertada");
      apertadas.delete(e.code);
    }
  };
  document.addEventListener("keyup", soltar);
  addEventListener("blur", () => {
    apertadas.forEach((el) => el.classList.remove("mo-apertada"));
    apertadas.clear();
  });
}

/* ======================================================================
   Barras indeterminadas no mesmo compasso, e deslizantes preenchidos
   ====================================================================== */
export function sincronizarBarras(raiz = document) {
  const atraso = `-${Math.round(performance.now() % RITMO_BARRA)}ms`;
  raiz.querySelectorAll?.(".mo-barra--indeterminada, progress.mo-barra:not([value])").forEach((barra) => {
    barra.style.setProperty("--mo-atraso", atraso);
  });
}

function preencherDeslizante(el) {
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 100;
  const valor = parseFloat(el.value);
  el.style.setProperty("--mo-valor", `${((valor - min) / (max - min || 1)) * 100}%`);
}

function prepararDeslizantes(raiz) {
  raiz.querySelectorAll?.("input.mo-deslizante").forEach(preencherDeslizante);
}

function ligarDeslizantes() {
  document.addEventListener("input", (e) => {
    if (e.target.matches?.("input.mo-deslizante")) preencherDeslizante(e.target);
  });
}

/* O que chega depois (fetch, innerHTML) também entra no compasso. */
function observarNovos() {
  new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      for (const no of m.addedNodes) {
        if (no.nodeType !== 1) continue;
        const caixa = no.parentElement || no;
        sincronizarBarras(caixa);
        prepararDeslizantes(caixa);
        if (no.querySelector?.('[role="tablist"]') || no.matches?.('[role="tablist"]')) prepararAbas(caixa);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

/* ======================================================================
   Terminal
   ====================================================================== */
/* const t = terminal("#saida");  t.escrever(":: Sincronizando", "seta");
   Rola sozinho só se a pessoa já estava no fim. */
export function terminal(alvo, { maximo = 2000 } = {}) {
  const saida = typeof alvo === "string" ? $(alvo) : alvo;
  const caixa = saida.matches(".mo-terminal-saida") ? saida : saida.querySelector(".mo-terminal-saida");
  const caret = () => caixa.querySelector(":scope > .mo-caret");
  return {
    escrever(texto, classe = "") {
      const noFim = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 40;
      for (const linha of String(texto).split("\n")) {
        const div = document.createElement("div");
        div.textContent = linha;
        div.className = `nova ${classe}`.trim();
        caixa.insertBefore(div, caret());
      }
      const linhas = caixa.querySelectorAll(":scope > div");
      for (let i = 0; i < linhas.length - maximo; i += 1) linhas[i].remove();
      if (noFim) caixa.scrollTop = caixa.scrollHeight;
    },
    limpar() {
      caixa.querySelectorAll(":scope > div").forEach((d) => d.remove());
    },
  };
}

/* ======================================================================
   Liga tudo (uma vez) e prepara o HTML que já está na página
   ====================================================================== */
let ligado = false;

export function iniciarComponentes(raiz = document) {
  if (!ligado) {
    ligado = true;
    ligarDialogos();
    ligarGaveta();
    ligarMenus();
    ligarAbas();
    ligarSegmentos();
    ligarFiltros();
    ligarCopiar();
    ligarFormularios();
    ligarAtalhos();
    ligarDeslizantes();
    observarNovos();
  }
  prepararAbas(raiz);
  prepararDeslizantes(raiz);
  sincronizarBarras(raiz);
}
