import json
from pathlib import Path

CONFIG_DIR = Path.home() / ".config" / "mosaic-store"




config = {
        "build_leve": False,
        }




def salvarConfiguracoes(config):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    Path(CONFIG_DIR, "config.json").write_text(
        json.dumps(config, ensure_ascii=False, indent=4),
        encoding="utf-8"
    )


def getConfiguracoes():
    return json.loads((CONFIG_DIR / "config.json").read_text(encoding="utf-8"))


