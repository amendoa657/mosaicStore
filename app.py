import os
import sys

os.environ["PYWEBVIEW_GUI"] = "qt"
os.environ.setdefault("QT_QPA_PLATFORM", "wayland;xcb")

from flask import Flask

from config.icone import atualizarIcone
from config.init import init
from config.janela import abrirJanela
from config.paru import criarConfigParu
from config.versao import VERSAO

#from config.downloadFromMirrors import downloadAur
from controllers.aurController import aurBp
from controllers.pacmanController import pacmanBp
from controllers.pageController import pageBp
from controllers.systemController import systemBp
from database.createDatabase import insertsThread
from system.downloadQueue import filaDeDownloads, trabalhador

app = Flask(__name__)
app.secret_key = "chave-secreta-paru-gui"
app.config["ULTIMA_PESQUISA"] = ""



app.register_blueprint(pageBp)
app.register_blueprint(aurBp)
app.register_blueprint(systemBp)
app.register_blueprint(pacmanBp)



if __name__ == "__main__":
    if "--versao" in sys.argv:
        print(f"Mosaic {VERSAO}")
        sys.exit()

    # mosaic-store --icone refaz só o ícone nas cores do tema e sai, sem
    # abrir a janela. É para o Matugen chamar quando troca as cores.
    if "--icone" in sys.argv:
        with app.app_context():
            atualizarIcone()
        sys.exit()

    config_paru = criarConfigParu()

    init()

    trabalhador.start()
    insertsThread.start()

    # python app.py --janela abre o app (é assim que o pacote abre).
    if "--janela" in sys.argv:
        abrirJanela(app)
    else:
        app.run(debug=True, use_reloader=False)
