from flask import Blueprint, abort, jsonify, redirect, render_template, request

import system.downloadQueue as q
import system.packageManager as packageManager
import system.tarefas as tarefas
from config.fontes import fontes

systemBp = Blueprint("systemBp", __name__)

@systemBp.post("/aur/instalar")
def instalarAur():
    pacote = request.form.get("pacote", "")

    # Com o pacman -Syu rodando, o pacman está travado: mostra a atualização.
    if tarefas.rodando("sistema"):
        return redirect("/atualizacoes")

    q.statusDownloads[pacote] = {
        "nome": pacote,
        "situacao": "aguardando",
        "progresso": 0,
        "passo": "Na fila de espera...",
    }

    q.filaDeDownloads.put(pacote)

    return redirect("/fila")


# ---------- Tarefas longas: atualizar o sistema e sincronizar os bancos ----------

def atualizarSistema(tarefa):
    tarefa["passo"] = "Esperando a senha de root..."
    tarefas.acompanhar(tarefa, packageManager.atualizarSistema())


def sincronizarBancos(tarefa):
    # Importados aqui: o módulo do banco abre conexões assim que é carregado.
    from database.connect import getConnection
    from database.createDatabase import insertsThread
    from database.insertDatabase import insertPacotesAur, insertPacotesCore, insertPacotesExtra

    etapas = [("AUR", insertPacotesAur), ("core", insertPacotesCore), ("extra", insertPacotesExtra)]
    tarefa["passos"] = [{"nome": nome, "estado": "esperando"} for nome, _ in etapas]

    # A sincronização que roda ao abrir o app pode estar no meio: espera ela.
    if insertsThread.is_alive():
        tarefas.registrar(tarefa, "Esperando a sincronização da abertura terminar...")
        insertsThread.join()

    con = getConnection()
    for i, (nome, inserir) in enumerate(etapas):
        tarefa["passos"][i]["estado"] = "rodando"
        tarefas.registrar(tarefa, f"Baixando e gravando {nome}...")
        inserir(con)
        tarefa["passos"][i]["estado"] = "pronto"
        tarefa["progresso"] = round((i + 1) * 100 / len(etapas))
        tarefas.registrar(tarefa, f"{nome} pronto.")
    con.close()


TAREFAS = {"sistema": atualizarSistema, "bancos": sincronizarBancos}


@systemBp.post("/atualizar-tudo")
def atualizarTudo():
    tarefas.iniciar("sistema", atualizarSistema)
    return redirect("/tarefa/sistema")


@systemBp.post("/syncDb")
def syncDb():
    tarefas.iniciar("bancos", sincronizarBancos)
    return redirect("/tarefa/bancos")


@systemBp.post("/tarefa/<nome>")
def comecarTarefa(nome):
    if nome not in TAREFAS:
        abort(404)
    tarefas.iniciar(nome, TAREFAS[nome])
    return redirect(f"/tarefa/{nome}")


@systemBp.get("/tarefa/<nome>")
def verTarefa(nome):
    if nome not in TAREFAS:
        abort(404)
    return render_template(
        "tarefa.html",
        nome=nome,
        tarefa=tarefas.estado(nome),
        contagens=None,
        fontes=fontes,
    )


@systemBp.get("/tarefa/<nome>/estado")
def estadoTarefa(nome):
    if nome not in TAREFAS:
        abort(404)
    return jsonify(tarefas.estado(nome))
