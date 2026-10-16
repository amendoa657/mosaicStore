import re
from pathlib import Path

from flask import abort, send_from_directory

CONFIG_DIR = Path.home() / ".config" / "mosaic-store"

# As cores do ícone e de onde vêm no colors.css. Sem o arquivo (ou sem a
# variável), fica a cor da marca.
CORES_ICONE = {
    "placa": ("--corFundoJanela", "#17131f"),
    "bloco1": ("--corDestaque", "#1ed38a"),
    "bloco2": ("--corAcentoSecundario", "#ff4fa0"),
    "bloco3": ("--corAcentoTerciario", "#4b7bff"),
    "bloco4": ("--corTextoJanela", "#f6f3fb"),
}

def getTema():
    if not (CONFIG_DIR / "colors.css").is_file():
        abort(404)
    return send_from_directory(CONFIG_DIR, "colors.css", mimetype="text/css", max_age=0)


def lerCores():
    arquivo = CONFIG_DIR / "colors.css"

    if not arquivo.is_file():
        return ""

    cores = arquivo.read_text(encoding="utf-8")

    return cores


def getCor(cores, variavel, padrao):
    cor = re.search(rf"{variavel}:\s*(#[0-9a-fA-F]{{6}})", cores)

    if not cor:
        return padrao

    return cor.group(1)


def getCorFundo():
    corFundo = getCor(lerCores(), "--corFundoVisualizacao", "#0f0d15")

    return corFundo


def getCoresIcone():
    cores = lerCores()
    coresIcone = {nome: getCor(cores, variavel, padrao) for nome, (variavel, padrao) in CORES_ICONE.items()}

    return coresIcone
