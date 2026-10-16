import os
from pathlib import Path

from flask import render_template

from config.tema import getCoresIcone

PASTA_ICONES = Path.home() / ".local" / "share" / "icons" / "hicolor"
ICONE = PASTA_ICONES / "scalable" / "apps" / "mosaic-store.svg"


def atualizarIcone():
    # O ícone do menu e da barra de tarefas, nas cores do tema. A pasta de
    # ícones do usuário vale mais que a do sistema, então este ganha do
    # ícone que veio no pacote.
    icone = render_template("icone.svg", **getCoresIcone())

    if ICONE.is_file() and ICONE.read_text(encoding="utf-8") == icone:
        return ICONE

    ICONE.parent.mkdir(parents=True, exist_ok=True)
    ICONE.write_text(icone, encoding="utf-8")

    # Mexer na data da pasta faz o menu e a barra de tarefas lerem de novo.
    os.utime(PASTA_ICONES)

    return ICONE
