import sqlite3
from pathlib import Path

CACHE_DIR = Path.home() / ".cache" / "mosaic-store"


def getConnection():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    con = sqlite3.connect(CACHE_DIR / "pacotesArch.db")
    con.row_factory = sqlite3.Row
    return con


con = getConnection()

cursor = con.cursor()
