from flask import Blueprint, render_template

import services.pacotesService as s
import system.downloadQueue as q
import system.tarefas as tarefas
from config.fontes import fontes
from config.tema import getTema

pageBp = Blueprint("pageBp", __name__)
@pageBp.get("/")
def home():
    return render_template(
        "descobrir.html",
        contagens=None,
        fontes=fontes,
        populares=s.buscarPopulares(),
        votados=s.buscarVotados(),
        destaque=s.buscarDestaques()
    )

@pageBp.get("/configuracoes")
def getConfiguracoes():
    return render_template(
        "configuracoes.html",
        contagens=None,
        fontes=fontes
    )


@pageBp.get("/instalados")
def getInstalados():
    
    return render_template(
        "instalados.html",
        pacotes=s.buscarInstalados(),
        contagens=None,
        fontes=fontes
    )


@pageBp.get("/atualizacoes")
def getAtualizacoes():
    # Durante o pacman -Syu a tela de Atualizações vira a tela dele: não faz
    # sentido listar (nem atualizar) pacote por pacote no meio da atualização.
    if tarefas.rodando("sistema"):
        return render_template(
            "tarefa.html",
            nome="sistema",
            tarefa=tarefas.estado("sistema"),
            contagens=None,
            fontes=fontes
        )
    return render_template(
        "atualizacoes.html",
        pacotes=s.buscarAtualizacoes(),
        contagens=None,
        fontes=fontes
    )

@pageBp.get("/fila")
def getFila():
    return render_template(
        "fila.html",
        contagens=None,
        fontes=fontes,
        fila=list(q.statusDownloads.values()),
        saida=q.terminal
    )


@pageBp.route("/tema.css")
def temaCss():
    return getTema()


@pageBp.get("/abertura")
def getAbertura():
    return render_template("abertura.html")
