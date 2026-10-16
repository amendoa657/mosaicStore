"""Gera o ícone do Mosaic Store: static/icone.svg e os PNGs em static/icones/.

    python scripts/icones.py

Precisa do Pillow (pip install pillow). Para mudar o ícone, mude as cores ou
as medidas aqui e rode de novo: o SVG e todos os PNGs saem do mesmo desenho.
"""
from pathlib import Path

from PIL import Image, ImageDraw

raiz = Path(__file__).resolve().parent.parent

# A marca: quatro blocos (de cima à esquerda, em leitura) numa placa escura,
# a cor da janela do Mosaic.
PLACA = "#17131f"
BLOCOS = ["#1ed38a", "#ff4fa0", "#4b7bff", "#f6f3fb"]

# Medidas em fração do lado do ícone.
RAIO_PLACA = 0.22
MARGEM = 0.17
VAO = 0.085
RAIO_BLOCO = 0.06

TAMANHOS = [16, 24, 32, 48, 64, 128, 256, 512]


def calcularBlocos(lado):
    margem = MARGEM * lado
    area = lado - 2 * margem
    vao = VAO * area
    bloco = (area - vao) / 2
    blocos = []

    for linha in range(2):
        for coluna in range(2):
            x = margem + coluna * (bloco + vao)
            y = margem + linha * (bloco + vao)
            blocos.append((x, y, bloco))

    return blocos, RAIO_BLOCO * area


def escreverSvg(caminho):
    lado = 512
    blocos, raio = calcularBlocos(lado)

    retangulos = "\n".join(
        f'  <rect x="{x:g}" y="{y:g}" width="{b:g}" height="{b:g}" rx="{raio:g}" fill="{cor}"/>'
        for (x, y, b), cor in zip(blocos, BLOCOS)
    )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {lado} {lado}" role="img" aria-label="Mosaic Store">\n'
        f'  <rect width="{lado}" height="{lado}" rx="{RAIO_PLACA * lado:g}" fill="{PLACA}"/>\n'
        f"{retangulos}\n"
        f"</svg>\n"
    )
    caminho.write_text(svg, encoding="utf-8")


def desenharPng(lado):
    # Desenha 8 vezes maior e reduz: os cantos saem lisos em qualquer tamanho.
    grande = lado * 8
    imagem = Image.new("RGBA", (grande, grande), (0, 0, 0, 0))
    pincel = ImageDraw.Draw(imagem)

    pincel.rounded_rectangle([0, 0, grande - 1, grande - 1], radius=RAIO_PLACA * grande, fill=PLACA)

    blocos, raio = calcularBlocos(grande)
    for (x, y, b), cor in zip(blocos, BLOCOS):
        pincel.rounded_rectangle([x, y, x + b, y + b], radius=raio, fill=cor)

    return imagem.resize((lado, lado), Image.LANCZOS)


if __name__ == "__main__":
    escreverSvg(raiz / "static" / "icone.svg")
    print("static/icone.svg")

    pasta = raiz / "static" / "icones"
    pasta.mkdir(exist_ok=True)
    for lado in TAMANHOS:
        arquivo = pasta / f"mosaic-store-{lado}.png"
        desenharPng(lado).save(arquivo, optimize=True)
        print(arquivo.relative_to(raiz))
