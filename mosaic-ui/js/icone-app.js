/* <mo-icone-app nome="firefox"></mo-icone-app>

   O ícone de um app ou pacote: a inicial em mono sobre um bloco no tom do
   nome. O mesmo nome cai sempre no mesmo tom, em qualquer app Mosaic.
     tamanho="78"      lado em px (ou qualquer medida CSS)
     imagem="url"      usa a imagem; se ela falhar, volta para a inicial
     tecla             ganha a borda de baixo de tecla */

import { inicial, tom } from "./tema.js";

export class MoIconeApp extends HTMLElement {
  static observedAttributes = ["nome", "tamanho", "imagem", "tecla"];

  connectedCallback() {
    this.desenhar();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.desenhar();
  }

  desenhar() {
    const nome = this.getAttribute("nome") || "";
    this.classList.add("mo-icone-app");
    this.classList.remove("mo-tom-0", "mo-tom-1", "mo-tom-2", "mo-tom-3");
    this.classList.add(`mo-tom-${tom(nome)}`);
    this.classList.toggle("mo-icone-app--tecla", this.hasAttribute("tecla"));

    const tamanho = this.getAttribute("tamanho");
    if (tamanho) this.style.setProperty("--mo-icone-tamanho", /^\d+$/.test(tamanho) ? `${tamanho}px` : tamanho);

    const imagem = this.getAttribute("imagem");
    this.textContent = "";
    if (imagem) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = imagem;
      img.addEventListener("error", () => (this.textContent = inicial(nome)), { once: true });
      this.appendChild(img);
    } else {
      this.textContent = inicial(nome);
    }
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", nome);
    }
  }
}

if (!customElements.get("mo-icone-app")) customElements.define("mo-icone-app", MoIconeApp);
