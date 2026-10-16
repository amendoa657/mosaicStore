"""A janela do app, com a tela de abertura.

Sem isto, a janela nasce branca e fica assim até o Flask responder e a
primeira página pintar. Aqui o Flask sobe antes, numa thread, e a janela já
abre numa página leve dele, a abertura (/mo-abertura: a marca girando e o
nome, na cor do tema), que não passa pelo banco. Assim que ela pinta, pede a
loja; enquanto a loja é montada, a abertura continua na tela (é a mesma
origem: o navegador só troca quando a página nova tem o que mostrar). A loja
chega com #mo-abrir no endereço, e a Mosaic UI a revela inteira numa onda de
pixels a partir do meio, de onde estava a marca.

    from config.janela import abrirJanela
    abrirJanela(app)        # no lugar do webview.start()
"""

import re
import threading

import webview
from werkzeug.serving import make_server

from config.qt import silenciarAvisosQt
from config.tema import CONFIG_DIR

ABERTURA = "/mo-abertura"

# A mesma reserva da Mosaic UI (--mo-fundo em mosaic-ui/css/tokens.css), para
# quando não houver colors.css do Matugen.
FUNDO_PADRAO = "#0f0d15"

# A abertura não carrega a Mosaic UI inteira (são vários arquivos): o CSS
# vem aqui dentro, só com o que ela usa, e as cores do tema entram no lugar
# de /*PALETA*/. A marca é a mesma da loja (46 px, como na tela de Buscar) e
# fica no meio exato da janela: é de lá que a loja se abre.
PAGINA_ABERTURA = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Mosaic</title>
<link rel="preload" href="/static/mosaic-ui/fontes/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/static/mosaic-ui/fontes/jetbrains-mono.woff2" as="font" type="font/woff2" crossorigin>
<style>
@font-face { font-family: "Space Grotesk"; font-weight: 300 700; font-display: swap; src: url("/static/mosaic-ui/fontes/space-grotesk.woff2") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 100 800; font-display: swap; src: url("/static/mosaic-ui/fontes/jetbrains-mono.woff2") format("woff2"); }
/*PALETA*/
:root {
  --fundo: var(--corFundoVisualizacao, #0f0d15);
  --texto: var(--corTextoJanela, #e6e0ec);
  --bloco: 45%;
  background: var(--fundo);
}
body {
  height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 132px; /* o nome e o estado 16 px abaixo da marca */
  box-sizing: border-box;
  color: var(--texto);
  font: 13px/1.45 "Space Grotesk", system-ui, sans-serif;
  cursor: progress;
  user-select: none;
}
.marca {
  position: fixed;
  left: 50%;
  top: 50%;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  background:
    linear-gradient(var(--corDestaque, #86d7ac) 0 0) 0 0 / var(--bloco) var(--bloco),
    linear-gradient(var(--corAcentoSecundario, #e9b9d3) 0 0) 100% 0 / var(--bloco) var(--bloco),
    linear-gradient(var(--corAcentoTerciario, #b5c5f9) 0 0) 0 100% / var(--bloco) var(--bloco),
    linear-gradient(var(--texto) 0 0) 100% 100% / var(--bloco) var(--bloco);
  background-repeat: no-repeat;
  animation: girar 1.6s infinite;
}
h1 { margin: 0; font-size: 27px; font-weight: 700; letter-spacing: -0.02em; }
p {
  margin: 6px 0 0;
  font: 11px "JetBrains Mono", ui-monospace, monospace;
  color: color-mix(in srgb, var(--texto) 66%, transparent);
}
h1, p { animation: entrar 0.42s cubic-bezier(0.23, 1, 0.32, 1) 0.12s backwards; }
@keyframes girar {
  0%   { transform: rotate(0deg);   animation-timing-function: cubic-bezier(0.77, 0, 0.175, 1); }
  25%  { transform: rotate(90deg);  animation-timing-function: cubic-bezier(0.77, 0, 0.175, 1); }
  50%  { transform: rotate(180deg); animation-timing-function: cubic-bezier(0.77, 0, 0.175, 1); }
  75%  { transform: rotate(270deg); animation-timing-function: cubic-bezier(0.77, 0, 0.175, 1); }
  100% { transform: rotate(360deg); }
}
@keyframes entrar { from { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: reduce) {
  .marca { animation-duration: 3.2s; }
  h1, p { animation: none; }
}
</style>
</head>
<body>
<i class="marca" aria-hidden="true"></i>
<h1>Mosaic</h1>
<p role="status">abrindo a loja</p>
<script>
  /* Saindo, guarda em que ponto da volta a marca estava: é esse quadro que
     fica na tela até a loja pintar, e a marca da loja continua dali. */
  addEventListener("pagehide", () => {
    const giro = document.querySelector(".marca").getAnimations()[0];
    try {
      if (giro) sessionStorage.setItem("mo:abertura-fase", String(giro.currentTime % 1600));
    } catch (erro) {}
  });
  /* Pintou: pede a loja. Ela substitui a abertura no histórico. */
  addEventListener("load", () =>
    requestAnimationFrame(() => requestAnimationFrame(() => location.replace("/#mo-abrir"))),
  );
</script>
</body>
</html>"""


def _paletaCss():
    """O colors.css do Matugen, cru (ou nada, e valem as reservas)."""
    arquivo = CONFIG_DIR / "colors.css"
    return arquivo.read_text(encoding="utf-8") if arquivo.is_file() else ""


def _paginaDeAbertura():
    return PAGINA_ABERTURA.replace("/*PALETA*/", _paletaCss())


def _fundoDoTema():
    """A cor de fundo do colors.css do Matugen: a janela já nasce nela."""
    achado = re.search(r"--corFundoVisualizacao\s*:\s*(#[0-9a-fA-F]{6})\b", _paletaCss())
    return achado.group(1) if achado else FUNDO_PADRAO


def _servir(app):
    """Sobe o Flask numa porta livre, numa thread, e devolve o endereço."""
    servidor = make_server("127.0.0.1", 0, app, threaded=True)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{servidor.server_port}"


def _pintarFundo(janela, cor):
    """A página do Qt nasce branca até o primeiro HTML pintar; aqui ela já
    nasce na cor do tema. Roda na thread do Qt, antes de a janela aparecer."""
    try:
        from qtpy.QtGui import QColor

        janela.native.webview.page().setBackgroundColor(QColor(cor))
    except Exception:
        pass  # outro motor que não o Qt: fica o branco de antes, nada quebra


def abrirJanela(app, titulo="Mosaic", largura=1200, altura=800, minimo=(900, 600)):
    app.add_url_rule(ABERTURA, "mosaicAbertura", _paginaDeAbertura)
    url = _servir(app)
    fundo = _fundoDoTema()
    janela = webview.create_window(
        titulo,
        url + ABERTURA,
        width=largura,
        height=altura,
        min_size=minimo,
        background_color=fundo,
    )
    janela.events.before_show += lambda: _pintarFundo(janela, fundo)
    silenciarAvisosQt()
    webview.start(debug=False)
