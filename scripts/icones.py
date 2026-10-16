"""Gera static/icone.svg, o ícone que vai no pacote.

    python scripts/icones.py

O desenho é o templates/icone.svg, o mesmo que o app usa para montar o ícone
nas cores do tema (config/icone.py). Aqui ele sai com as cores da marca, as de
quem não tem o colors.css. Para mudar o ícone, mude o template ou as cores em
config/tema.py (CORES_ICONE) e rode de novo.
"""
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

raiz = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(raiz))

from config.tema import CORES_ICONE

if __name__ == "__main__":
    cores = {nome: padrao for nome, (variavel, padrao) in CORES_ICONE.items()}
    ambiente = Environment(loader=FileSystemLoader(raiz / "templates"))
    icone = ambiente.get_template("icone.svg").render(**cores)

    (raiz / "static" / "icone.svg").write_text(icone + "\n", encoding="utf-8")
    print("static/icone.svg")
