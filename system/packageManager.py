import os
import stat
import subprocess

from config.paru import criarConfigParu


def instalarPacoteParu(pacote):
    #config_paru = criarConfigParu()
    #ambiente = os.environ.copy()
    #ambiente["PARU_CONF"] = str(config_paru)

    caminho = "/tmp/paru_gui_askpass.sh"
    with open(caminho, "w") as f:
        f.write('#!/bin/bash\n')
        f.write('/usr/lib/seahorse/ssh-askpass "Digite sua senha de root: " ')

    os.chmod(caminho, stat.S_IRWXU)
    ambiente = os.environ.copy()
    ambiente['SUDO_ASKPASS'] = caminho

    resultado = subprocess.Popen(
        ["paru", "-S", "--needed", "--noconfirm", '--sudoflags', '-A', pacote],
        env=ambiente,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    return resultado

def atualizarPacote(pacote):
    #config_paru = criarConfigParu()
    #ambiente = os.environ.copy()
    #ambiente["PARU_CONF"] = str(config_paru)

    caminho = "/tmp/paru_gui_askpass.sh"
    with open(caminho, "w") as f:
        f.write('#!/bin/bash\n')
        f.write('/usr/lib/seahorse/ssh-askpass "Digite sua senha de root: " ')

    os.chmod(caminho, stat.S_IRWXU)
    ambiente = os.environ.copy()
    ambiente['SUDO_ASKPASS'] = caminho

    resultado = subprocess.Popen(
        ["paru", "-Sy", "--needed", "--noconfirm", '--sudoflags', '-A', pacote],
        env=ambiente,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    return resultado


def atualizarSistema():
    caminho = "/tmp/paru_gui_askpass.sh"
    with open(caminho, "w") as f:
        f.write('#!/bin/bash\n')
        f.write('/usr/lib/seahorse/ssh-askpass "Digite sua senha de root: " ')

    os.chmod(caminho, stat.S_IRWXU)
    ambiente = os.environ.copy()
    ambiente['SUDO_ASKPASS'] = caminho

    return subprocess.Popen(
        ["sudo", "-A", "pacman", "-Syu", "--noconfirm"],
        env=ambiente,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )


def getInstalados():
    saida = subprocess.run(
        ["pacman", "-Qi"],
        capture_output=True, text=True,
        env={**os.environ, "LC_ALL": "C"},
    ).stdout

    instalados = {}
    for bloco in saida.strip().split("\n\n"):        # one block per package
        campos = {}
        for linha in bloco.splitlines():
            chave, _, valor = linha.partition(" : ")
            campos[chave.strip()] = valor.strip()
        instalados[campos["Name"]] = {
            "versao": campos["Version"],
            "tamanho": campos["Installed Size"].replace(".", ","),  # "268,70 MiB"
        }
    return instalados

def lerAtualizacoes(comando):
    saida = subprocess.run(
        comando,
        capture_output=True, text=True,
        env={**os.environ, "LC_ALL": "C"},
    ).stdout

    atualizacoes = {}
    for linha in saida.splitlines():
        partes = linha.split()
        if len(partes) >= 4 and partes[2] == "->":
            atualizacoes[partes[0]] = {"versao": partes[1], "versaoAtualizada": partes[3]}
    return atualizacoes

def getAtualizacoes():
    return lerAtualizacoes(["checkupdates"]) | lerAtualizacoes(["paru", "-Qua"])


