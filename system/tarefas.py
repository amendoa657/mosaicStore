"""Tarefas longas que rodam em segundo plano (atualizar o sistema,
sincronizar os bancos) e o estado que a tela /tarefa/<nome> acompanha.

Cada tarefa tem um nome e só roda uma de cada vez: pedir de novo enquanto
ela está rodando devolve a mesma tarefa, em vez de começar outra por cima.
"""

import re
import threading
import time
from collections import deque

_tarefas = {}
_trava = threading.Lock()

# Contadores "(3/12)" que o pacman imprime. Ele recomeça a contagem em cada
# fase (chaves, integridade, atualização...), então só a fase que instala de
# fato mexe na barra, e a barra nunca volta para trás.
_CONTADOR = re.compile(r"\((\d+)/(\d+)\)")
_FASE_PRINCIPAL = re.compile(r"(atualizando|instalando|reinstalando|removendo|upgrading|installing|reinstalling|removing)", re.I)


def iniciar(nome, trabalho):
    """Começa `trabalho(tarefa)` numa thread e devolve a tarefa.
    Se uma tarefa com esse nome já está rodando, só devolve ela."""
    with _trava:
        atual = _tarefas.get(nome)
        if atual and atual["situacao"] == "rodando":
            return atual

        tarefa = {
            "nome": nome,
            "situacao": "rodando",      # "rodando" | "concluida" | "erro"
            "inicio": time.time(),
            "fim": None,
            "passo": "Começando...",
            "progresso": None,          # 0 a 100, ou None quando não dá para saber
            "passos": [],               # etapas nomeadas (sincronização dos bancos)
            "linhas": deque(maxlen=400),
            "codigo": None,
        }
        _tarefas[nome] = tarefa

    threading.Thread(target=_rodar, args=(tarefa, trabalho), daemon=True).start()
    return tarefa


def _rodar(tarefa, trabalho):
    try:
        trabalho(tarefa)
        tarefa["situacao"] = "concluida"
        tarefa["progresso"] = 100
    except Exception as erro:
        tarefa["linhas"].append(f"erro: {erro}")
        tarefa["passo"] = str(erro)
        tarefa["situacao"] = "erro"
    tarefa["fim"] = time.time()


def registrar(tarefa, linha):
    """Guarda uma linha da saída e atualiza o passo e o progresso."""
    linha = linha.rstrip()
    if not linha:
        return
    tarefa["linhas"].append(linha)
    tarefa["passo"] = linha.strip()
    contador = _CONTADOR.search(linha)
    if contador and _FASE_PRINCIPAL.search(linha):
        atual, total = int(contador.group(1)), int(contador.group(2))
        if total:
            tarefa["progresso"] = max(tarefa["progresso"] or 0, round(atual * 100 / total))


def acompanhar(tarefa, processo):
    """Lê a saída de um subprocess.Popen até ele terminar.
    Termina com erro se o comando sair com código diferente de zero."""
    for linha in processo.stdout:
        registrar(tarefa, linha)
    processo.wait()
    tarefa["codigo"] = processo.returncode
    if processo.returncode != 0:
        raise RuntimeError(f"o comando terminou com código {processo.returncode}")


def estado(nome):
    """O estado da tarefa pronto para virar JSON (ou None se nunca rodou)."""
    tarefa = _tarefas.get(nome)
    if not tarefa:
        return None
    fim = tarefa["fim"] or time.time()
    return {
        "nome": tarefa["nome"],
        "situacao": tarefa["situacao"],
        "passo": tarefa["passo"],
        "progresso": tarefa["progresso"],
        "passos": [dict(p) for p in tarefa["passos"]],
        "linhas": list(tarefa["linhas"]),
        "codigo": tarefa["codigo"],
        "decorrido": int(fim - tarefa["inicio"]),
    }
