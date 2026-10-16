import os

os.environ["PYWEBVIEW_GUI"] = "qt"
os.environ.setdefault("QT_QPA_PLATFORM", "wayland")

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

    # Navegador (desenvolvimento): o Flask sozinho, em http://127.0.0.1:5000
    app.run(debug=True, use_reloader=False)

    # Janela do app: abre na hora com a tela de abertura e carrega a loja
    # quando o Flask responder (config/janela.py).
    #abrirJanela(app)
