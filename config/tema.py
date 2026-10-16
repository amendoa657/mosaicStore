import re
from pathlib import Path

from flask import abort, send_from_directory

CONFIG_DIR = Path.home() / ".config" / "mosaic-store"

def getTema():
    if not (CONFIG_DIR / "colors.css").is_file():
        abort(404)
    return send_from_directory(CONFIG_DIR, "colors.css", mimetype="text/css", max_age=0)


def getCorFundo():
    arquivo = CONFIG_DIR / "colors.css"

    if not arquivo.is_file():
        return "#0f0d15"

    cores = arquivo.read_text(encoding="utf-8")
    corFundo = re.search(r"--corFundoVisualizacao:\s*(#[0-9a-fA-F]{6})", cores)

    if not corFundo:
        return "#0f0d15"

    return corFundo.group(1)
