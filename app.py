import os
import sys

os.environ["PYWEBVIEW_GUI"] = "qt"
os.environ.setdefault("QT_QPA_PLATFORM", "wayland;xcb")

from flask import Flask

from config.init import init
from config.janela import abrirJanela
from config.paru import criarConfigParu

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
    config_paru = criarConfigParu()

    init()

    trabalhador.start()
    insertsThread.start()

    # python app.py --janela abre o app (é assim que o pacote abre).
    if "--janela" in sys.argv:
        abrirJanela(app)
    else:
        app.run(debug=True, use_reloader=False)
