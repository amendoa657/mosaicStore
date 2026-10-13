import subprocess
import time

import requests

import repositories.pacotesRepository as r
import system.packageManager as packageManager
from models.pacoteAntigo import Pacote

destaque = "nvim-lazy"


def buscarInstalados():
    instalados = packageManager.getInstalados()
    pacotes = r.buscarPacotesPorNomes(list(instalados))

    for p in pacotes:
        p.versaoInstalado = instalados[p.nome]["versao"]      # the installed one, not the database's
        p.tamanho = instalados[p.nome]["tamanho"]
    return pacotes


def buscarAtualizacoes():
    atualizacoes = packageManager.getAtualizacoes()
    pacotes = r.buscarPacotesPorNomes(list(atualizacoes))

    for p in pacotes:
        p.versaoInstalado = atualizacoes[p.nome]["versao"]
        p.versao = atualizacoes[p.nome]["versaoAtualizada"]

    return pacotes


def buscarPkgBuild(pacote):
    resposta = requests.get(
        "https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=" + pacote,
        timeout=10,
        )

    return resposta.content.decode("utf-8")


def buscarPacotes(termo, modo):
    inicio = time.perf_counter()

    if not termo:
        return None

    pacotes = r.buscarPacotes(termo)

    fim = time.perf_counter()

    tempo_ms = (fim - inicio) * 1000

    print(f"Pesquisa demorou {tempo_ms:.2f} ms")
    return pacotes

def buscarPacotesAntigo(termo, modo):
    inicio = time.perf_counter()

    if not termo:
        return None

    resposta = requests.get(
        "https://aur.archlinux.org/rpc/v5/search/" + termo,
        timeout=10,
        ).json()

    resultados = resposta["results"]
    pacotes = []

    for resultado in resultados:
        pacote = Pacote(resultado, "aur")
        #print(pacote.nome)
        pacotes.append(pacote)

    pacotes.sort(
        key=lambda pacote: (
            pacote.nome.casefold() != termo.casefold(),
            not pacote.nome.casefold().startswith(termo.casefold()),
            pacote.nome.casefold(),
        )
    )
    fim = time.perf_counter()

    tempo_ms = (fim - inicio) * 1000

    print(f"Pesquisa demorou {tempo_ms:.2f} ms")

    return pacotes

def buscarPacote(pacote):
    resposta = requests.get(
        "https://aur.archlinux.org/rpc/v5/info/" + pacote,
        timeout=10,
    )

    dados = resposta.json()
    resultado = dados["results"]

    if resultado:
        pacote = Pacote(resultado[0], "aur", pkgBuild=buscarPkgBuild(pacote))

    return pacote



def contarLinhas(comando):
    resultado = subprocess.run(
        comando,
        capture_output=True,
        text=True,
    )

    return len(resultado.stdout.splitlines())

def buscarPacotesInstalados():
    resultado = subprocess.run(
        ["pacman", "-Qq"],
        capture_output=True,
        text=True,
        check=True,
    )

    return set(resultado.stdout.splitlines())


def buscarDestaques():
    return r.buscarPacote(destaque)

def buscarPopulares():
    return r.buscarPopulares(7)

def buscarVotados():
    return r.buscarVotados(7)
    




#instalados=buscarPacotesInstalados()
#instalados=None
#numeroInstalados=contarLinhas(["pacman", "-Qq"])
#numeroInstalados=None
#numeroAtualizacoes=contarLinhas(["pacman", "-Quq"])
#numeroAtualizacoes=None
