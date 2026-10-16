/* Transição entre páginas: a espera e a onda de pixels.

   Saindo de uma página do app para outra:
     - se a próxima demora a chegar (mais de 180 ms), a área de conteúdo é
       coberta numa onda de pixels a partir do clique e mostra a marca
       girando com o nome do destino (js/carregando.js). Um item da lateral
       já fica aceso na hora. Esc desiste (só em navegação comum, não em
       formulário enviado);
     - a página nova nasce coberta (o mosaic-inicio.js liga a classe
       mo-revelando antes da primeira pintura) e a área de conteúdo se
       revela em onda: do meio, se a espera apareceu (a página se abre de
       onde estava a marca); do último clique, se foi agora há pouco; do
       meio, sem clique (teclado, redirecionamento).

   O texto da espera vem de data-mo-carregando no link, no botão ou no
   formulário (e data-mo-carregando-detalhe, a linha de baixo); de um item
   da lateral, o nome dele. O app ainda pode mudar os dois, ou desistir da
   espera, no evento mo-carregando:

     document.addEventListener("mo-carregando", (e) => {
       if (e.detail.url.pathname === "/instalados") e.detail.detalhe = "lendo o pacman";
     });

   data-mo-sem-carregando (num link, botão, formulário ou no <html>) faz a
   navegação esperar sem tela: para quem já mostra a espera do seu jeito.

   A área é o elemento com data-mo-cortina, ou .mo-conteudo. */

import { revelar } from "./pixels.js";
import { carregando } from "./carregando.js";

const CHAVE = "mo:origem";
const RECENTE_MS = 5000;
const ATRASO_MS = 180; // antes disso a página quase sempre já chegou

const semMovimento = () =>
  document.documentElement.classList.contains("mo-sem-movimento") ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const areaDaCortina = () =>
  document.querySelector("[data-mo-cortina]") || document.querySelector(".mo-conteudo");

const ATIVO = ".mo-nav-item:is(.ativo, [aria-current]:not([aria-current='false']))";

/* A pílula desliza de um item para o outro. A de verdade já está no item
   novo (escondida); quem anda é uma cópia, posicionada no começo da lista,
   por baixo de todos os itens, para nenhum rótulo sumir sob ela. As medidas
   são as do layout (offset*), as mesmas dos dois lados, então o zoom da
   página não entra na conta. Os rótulos trocam de cor junto (acenderItem
   acerta as transições): o que perde a pílula clareia na hora, o que ganha
   escurece quando ela está chegando. */
function deslizar(pilula, de, para) {
  const caixa = (el) => ({ x: el.offsetLeft, y: el.offsetTop, l: el.offsetWidth, a: el.offsetHeight });
  const a = caixa(de);
  const b = caixa(para);
  const estilo = getComputedStyle(pilula);
  const copia = document.createElement("i");
  copia.setAttribute("aria-hidden", "true");
  copia.style.cssText =
    `position:absolute;z-index:0;pointer-events:none;left:${b.x}px;top:${b.y}px;width:${b.l}px;height:${b.a}px;` +
    `border-radius:${estilo.borderRadius};background:${estilo.backgroundColor}`;
  para.parentElement.prepend(copia);
  pilula.style.visibility = "hidden";

  const curva = getComputedStyle(para).getPropertyValue("--mo-ease-saida").trim() || "ease-out";
  const animacao = copia.animate(
    [
      { transform: `translate(${a.x - b.x}px, ${a.y - b.y}px)`, width: `${a.l}px`, height: `${a.a}px` },
      { transform: "none", width: `${b.l}px`, height: `${b.a}px` },
    ],
    { duration: 260, easing: curva },
  );
  const terminar = () => {
    copia.remove();
    pilula.style.removeProperty("visibility");
    de.style.removeProperty("transition");
    para.style.removeProperty("transition");
    pilula.__moDeslize = null;
  };
  pilula.__moDeslize = () => {
    animacao.cancel();
    terminar();
  };
  animacao.finished.then(terminar, () => {});
}

/* Acende o item da lateral para onde se está indo, com a pílula deslizando
   até ele. Devolve como desfazer (a página volta do cache com Voltar, ou a
   espera é cancelada). */
function acenderItem(item) {
  if (!item || item.matches(ATIVO)) return null;
  const atual = item.parentElement?.querySelector(ATIVO);
  const pilula = atual?.querySelector(":scope > .mo-pilula");
  const eraAtivo = atual?.classList.contains("ativo");
  const aria = atual?.getAttribute("aria-current");

  /* As transições dos rótulos vão antes da troca de classe: é o valor
     delas na hora da troca que vale. */
  const desliza = pilula && !semMovimento() && atual.offsetParent && atual.offsetParent === item.offsetParent;
  if (desliza) {
    atual.style.transition = "none";
    item.style.transition = "color 120ms ease-out 40ms";
  }

  atual?.classList.remove("ativo");
  atual?.removeAttribute("aria-current");
  item.classList.add("ativo");
  item.setAttribute("aria-current", "page");

  if (pilula) {
    item.prepend(pilula);
    if (desliza) deslizar(pilula, atual, item);
  }

  return () => {
    item.classList.remove("ativo");
    item.removeAttribute("aria-current");
    if (!atual) return;
    if (eraAtivo) atual.classList.add("ativo");
    if (aria !== null) atual.setAttribute("aria-current", aria);
    if (pilula) {
      pilula.__moDeslize?.();
      atual.prepend(pilula);
    }
  };
}

function ligarEspera(estado) {
  let relogio = 0;
  let desfazerItem = null;
  let semFormulario = true;

  const parar = () => {
    clearTimeout(relogio);
    estado.espera?.parar();
    estado.espera = null;
    desfazerItem?.();
    desfazerItem = null;
  };

  const comecar = (url, { formulario = false, dados = null } = {}) => {
    clearTimeout(relogio);
    estado.inicioNavegacao = Date.now();
    const raiz = document.documentElement;
    const toque = estado.gatilho && Date.now() - estado.gatilho.t < 1000 ? estado.gatilho : null;
    const gatilho = toque?.el || null;
    if (raiz.hasAttribute("data-mo-sem-carregando") || gatilho?.closest("[data-mo-sem-carregando]")) return;

    const item = gatilho?.closest(".mo-nav-item");
    const detalhe = {
      url: new URL(url, location.href),
      metodo: formulario ? "post" : "get",
      dados,
      gatilho,
      texto:
        gatilho?.closest("[data-mo-carregando]")?.dataset.moCarregando ||
        (item?.querySelector(".mo-nav-texto") || item)?.textContent.trim() ||
        "",
      detalhe: gatilho?.closest("[data-mo-carregando-detalhe]")?.dataset.moCarregandoDetalhe || "",
    };
    const origem = estado.ultimoToque && Date.now() - estado.ultimoToque.t < 1500 ? estado.ultimoToque : null;
    estado.origemNavegacao = origem;

    const mostrar = () => {
      if (!document.dispatchEvent(new CustomEvent("mo-carregando", { detail: detalhe, cancelable: true }))) return;
      semFormulario = !formulario;
      /* De um destino para outro, a pílula sai de onde está; desfazer volta
         tudo até o item de antes da primeira espera. */
      if (item) {
        const desfazer = acenderItem(item);
        if (desfazer) {
          const anterior = desfazerItem;
          desfazerItem = () => {
            desfazer();
            anterior?.();
          };
        }
      } else {
        desfazerItem?.();
        desfazerItem = null;
      }
      if (estado.espera) {
        estado.espera.atualizar(detalhe);
        return;
      }
      const area = areaDaCortina();
      if (area) estado.espera = carregando(area, { ...detalhe, x: origem?.x, y: origem?.y });
    };
    /* Já esperando (outro clique no meio da espera): troca o texto na hora. */
    if (estado.espera) mostrar();
    else relogio = setTimeout(mostrar, ATRASO_MS);
  };

  if (window.navigation) {
    /* A Navigation API só avisa quando a navegação começa de verdade: depois
       de todo onclick, com o preventDefault de quem quis já resolvido. */
    navigation.addEventListener("navigate", (e) => {
      if (e.destination.sameDocument || e.hashChange || e.downloadRequest) return;
      if (e.navigationType === "reload") return;
      if (new URL(e.destination.url).origin !== location.origin) return;
      comecar(e.destination.url, { formulario: !!e.formData, dados: e.formData });
    });
    /* Navegação que falhou ou foi cancelada desfaz a espera; mas não a que
       foi cortada por outro clique (a nova começa logo em seguida). */
    navigation.addEventListener("navigateerror", () => {
      setTimeout(() => {
        if (Date.now() - estado.inicioNavegacao > 100) parar();
      }, 50);
    });
  } else {
    /* Sem ela: clique em link e envio de formulário, conferidos depois que
       todos os outros ouvintes já tiveram a chance de cancelar. */
    document.addEventListener("click", (e) => {
      const link = e.target.closest?.("a[href]");
      if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || (url.hash && url.pathname === location.pathname && url.search === location.search)) return;
      setTimeout(() => e.defaultPrevented || comecar(url));
    });
    document.addEventListener("submit", (e) => {
      const form = e.target;
      setTimeout(() => {
        if (e.defaultPrevented || (form.target && form.target !== "_self")) return;
        const post = (e.submitter?.formMethod || form.method).toLowerCase() === "post";
        comecar(e.submitter?.formAction || form.action, { formulario: post, dados: post ? new FormData(form) : null });
      });
    });
  }

  /* Esc desiste de esperar. Formulário enviado, não: o servidor já recebeu. */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !estado.espera || !semFormulario) return;
    window.stop();
    parar();
  });

  /* Voltando do cache (Voltar/Avançar), a página aparece como estava ao sair:
     com a espera e o item novo aceso. Desfaz os dois. */
  addEventListener("pageshow", (e) => {
    if (e.persisted) parar();
  });
}

export function ligarTransicao() {
  const estado = { ultimoToque: null, gatilho: null, origemNavegacao: null, espera: null, inicioNavegacao: 0 };

  document.addEventListener(
    "pointerdown",
    (e) => {
      estado.ultimoToque = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    { capture: true, passive: true },
  );
  /* Quem disparou a navegação (para o texto da espera). */
  document.addEventListener("click", (e) => (estado.gatilho = { el: e.target, t: Date.now() }), true);
  document.addEventListener("submit", (e) => (estado.gatilho = { el: e.submitter || e.target, t: Date.now() }), true);

  ligarEspera(estado);

  addEventListener("pagehide", () => {
    /* A onda da página nova sai do meio da espera, se ela apareceu; senão,
       do clique que começou a navegação, ou de um clique recente. */
    const recente = estado.ultimoToque && Date.now() - estado.ultimoToque.t < RECENTE_MS ? estado.ultimoToque : null;
    const origem = estado.espera?.centro || estado.origemNavegacao || recente;
    try {
      sessionStorage.setItem(
        CHAVE,
        JSON.stringify(origem ? { x: origem.x, y: origem.y, t: Date.now() } : { t: Date.now() }),
      );
    } catch (erro) {
      /* sem sessionStorage: a página nova só não faz a onda */
    }
  });

  const raiz = document.documentElement;
  if (!raiz.classList.contains("mo-revelando")) return;

  const alvo = areaDaCortina();
  const origem = window.__moOrigem || {};
  revelar(alvo, {
    x: origem.x,
    y: origem.y,
    trocar: () => raiz.classList.remove("mo-revelando"),
  }).finally(() => raiz.classList.remove("mo-revelando"));
}
