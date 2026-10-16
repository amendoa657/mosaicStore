/* Mosaic UI: o que precisa rodar antes da primeira pintura.

   Opcional. Ponha no <head>, como script comum (sem defer, sem module):
     <script src="mosaic-ui/mosaic-inicio.js"></script>

   Faz quatro coisas:
     - começa a carregar o worker dos pixels já aqui, em paralelo com a
       página (o mosaic.js entrega os <canvas> para ele depois);
     - abrir de novo a mesma página não repete as entradas animadas
       (classe mo-repeticao);
     - vindo de outra página do app, liga mo-revelando: a área de conteúdo
       já nasce coberta e o mosaic.js a revela em onda de pixels a partir
       de onde foi o clique;
     - com #mo-abrir no endereço (vindo de uma tela de abertura), liga
       também mo-abrindo: a janela inteira nasce coberta e se revela do
       meio. O #mo-abrir sai do endereço na hora. */
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

  var abrindo = location.hash === "#mo-abrir";
  if (abrindo) {
    history.replaceState(history.state, "", location.pathname + location.search);
    if (!calmo && window.__moPixels) {
      raiz.classList.add("mo-revelando", "mo-abrindo", "mo-via-pixels");
      /* A marca da cobertura continua a volta da marca da abertura de onde
         ela parou (a abertura guarda o ponto ao sair: mo:abertura-fase);
         sem isso, acerta pelo relógio. Até acertar ela fica escondida: a
         animação nasce do zero e o compositor pode pintar esse quadro antes
         do acerto chegar. */
      var fase = NaN;
      try {
        fase = parseFloat(sessionStorage.getItem("mo:abertura-fase"));
        sessionStorage.removeItem("mo:abertura-fase");
      } catch (erro) {}
      document.addEventListener("DOMContentLoaded", function () {
        (document.getAnimations ? document.getAnimations() : []).forEach(function (a) {
          if (a.animationName === "mo-blocos-girando" && a.effect && a.effect.pseudoElement === "::before") {
            a.currentTime = isNaN(fase) ? Date.now() % 1600 : fase;
          }
        });
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            raiz.classList.add("mo-abrindo-no-compasso");
          });
        });
      });
      setTimeout(function () {
        raiz.classList.remove("mo-revelando", "mo-abrindo", "mo-abrindo-no-compasso");
      }, 4000);
    }
  }

  if (!abrindo && origem && !repeticao && !calmo && window.__moPixels && Date.now() - origem.t < 3000) {
    raiz.classList.add("mo-revelando", "mo-via-pixels");
    window.__moOrigem = origem;
    /* Rede de segurança: se o mosaic.js não chegar, mostra a página. */
    setTimeout(function () {
      raiz.classList.remove("mo-revelando");
    }, 4000);
  }

  window.addEventListener("pagereveal", function (evento) {
    /* A mesma página de novo não precisa cruzar com ela mesma; e, abrindo,
       a página nova já nasce igual à abertura (o fundo e a marca). */
    if (evento.viewTransition && (repeticao || abrindo)) {
      evento.viewTransition.skipTransition();
    }
  });
})();
