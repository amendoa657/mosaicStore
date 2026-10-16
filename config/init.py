from database.connect import CACHE_DIR
from database.createDatabase import createDatabase

def init():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    createDatabase()



