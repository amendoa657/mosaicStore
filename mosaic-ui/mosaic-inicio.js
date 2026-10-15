/* Mosaic UI: o que precisa rodar antes da primeira pintura.

   Opcional. Ponha no <head>, como script comum (sem defer, sem module):
     <script src="mosaic-ui/mosaic-inicio.js"></script>

   Faz três coisas:
     - começa a carregar o worker dos pixels já aqui, em paralelo com a
       página (o mosaic.js entrega os <canvas> para ele depois);
     - abrir de novo a mesma página não repete as entradas animadas
       (classe mo-repeticao);
     - vindo de outra página do app, liga mo-revelando: a área de conteúdo
       já nasce coberta e o mosaic.js a revela em onda de pixels a partir
       de onde foi o clique. */
(function () {
  var raiz = document.documentElement;
  var script = document.currentScript;
  var calmo =
    raiz.classList.contains("mo-sem-movimento") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try {
    if (script && "OffscreenCanvas" in window && typeof Worker !== "undefined") {
      window.__moPixels = new Worker(new URL("js/pixels-worker.js", script.src));
    }
  } catch (erro) {}

  var aqui = location.pathname + location.search;
  var repeticao = false;
  try {
    repeticao = sessionStorage.getItem("mo:ultima") === aqui;
    sessionStorage.setItem("mo:ultima", aqui);
  } catch (erro) {}
  if (repeticao) raiz.classList.add("mo-repeticao");

  var origem = null;
  try {
    origem = JSON.parse(sessionStorage.getItem("mo:origem"));
    sessionStorage.removeItem("mo:origem");
  } catch (erro) {}

  if (origem && !repeticao && !calmo && window.__moPixels && Date.now() - origem.t < 3000) {
    raiz.classList.add("mo-revelando", "mo-via-pixels");
    window.__moOrigem = origem;
    /* Rede de segurança: se o mosaic.js não chegar, mostra a página. */
    setTimeout(function () {
      raiz.classList.remove("mo-revelando");
    }, 4000);
  }

  window.addEventListener("pagereveal", function (evento) {
    /* A mesma página de novo não precisa cruzar com ela mesma. */
    if (evento.viewTransition && repeticao) {
      evento.viewTransition.skipTransition();
    }
  });
})();
