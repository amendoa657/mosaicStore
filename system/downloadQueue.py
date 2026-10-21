import queue
import threading
from collections import deque

from system.packageManager import atualizarPacote, instalarPacoteParu

filaDeDownloads = queue.Queue()
statusDownloads = {}

terminal = deque(maxlen=400)   # no lugar de: terminal = []


def processarFila():
    while True:
        # O programa fica pausado nesta linha esperando algo entrar na fila
        pacote = filaDeDownloads.get()
        terminal.clear()

        if statusDownloads[pacote]["modo"]=="instalar":

            statusDownloads[pacote]["situacao"] = "instalando"
            statusDownloads[pacote]["passo"] = "Preparando pacotes..."


            print(f"⏳ Começando a instalar: {pacote}")

            processo = instalarPacoteParu(pacote)

        elif statusDownloads[pacote]["modo"]=="atualizar":

            statusDownloads[pacote]["situacao"] = "atualizando"
            statusDownloads[pacote]["passo"] = "Preparando pacotes..."


            print(f"⏳ Começando a atualizar: {pacote}")

            processo = atualizarPacote(pacote)

        statusDownloads[pacote]["progresso"] = 0

        for linha in processo.stdout:
            terminal.append(linha)
            statusDownloads[pacote]["passo"] = linha.strip()
            
            if "Obtendo fontes" in linha:
                statusDownloads[pacote]["progresso"] = 10
            elif "Iniciando build()" in linha:
                statusDownloads[pacote]["progresso"] = 30
            elif "Criando o pacote" in linha:
                statusDownloads[pacote]["progresso"] = 70
            elif "Organizando a instalação" in linha:
                statusDownloads[pacote]["progresso"] = 80
            elif "carregando pacotes" in linha.lower():
                statusDownloads[pacote]["progresso"] = 90

        print(f"✅ Concluído: {pacote}\n")

        processo.wait()

        if processo.returncode == 0:
            statusDownloads[pacote]["situacao"] = "concluido"
            statusDownloads[pacote]["passo"] = "Pronto!"
        else:
            statusDownloads[pacote]["situacao"] = "erro"
            statusDownloads[pacote]["passo"] = "Instalação interrompida"

        filaDeDownloads.task_done()

trabalhador = threading.Thread(target=processarFila, daemon=True)


