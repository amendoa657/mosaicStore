import os
import threading
from pathlib import Path

import webview
from qtpy.QtGui import QColor, QGuiApplication
from werkzeug.serving import make_server

from config.qt import silenciarAvisosQt
from config.tema import getCorFundo

raiz = Path(__file__).resolve().parent.parent
ICONE = raiz / "static" / "icones" / "mosaic-store-256.png"


def subirServidor(app):
    # Porta 0: o sistema escolhe uma porta livre.
    servidor = make_server("127.0.0.1", 0, app, threaded=True)

    servidorThread = threading.Thread(target=servidor.serve_forever, daemon=True)
    servidorThread.start()

    url = f"http://127.0.0.1:{servidor.server_port}"

    return url


def pintarFundo(janela, corFundo):
    # Sem isso a página do Qt fica branca até a abertura carregar.
    janela.native.webview.page().setBackgroundColor(QColor(corFundo))


def abrirJanela(app):
    url = subirServidor(app)
    corFundo = getCorFundo()

    # O nome com que o sistema reconhece o app: é por ele que a barra de
    # tarefas acha o mosaic-store.desktop e mostra o ícone certo.
    QGuiApplication.setApplicationName("mosaic-store")
    QGuiApplication.setDesktopFileName("mosaic-store")
    os.environ.setdefault("RESOURCE_NAME", "mosaic-store")

    # A janela abre na tela de abertura, e ela mesma chama a loja.
    janela = webview.create_window(
        "Mosaic Store",
        url + "/abertura",
        width=1200,
        height=800,
        min_size=(900, 600),
        background_color=corFundo,
    )

    janela.events.before_show += lambda: pintarFundo(janela, corFundo)

    silenciarAvisosQt()
    webview.start(debug=False, icon=str(ICONE))
