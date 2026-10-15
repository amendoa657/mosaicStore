/* Avisos flutuantes, no canto de baixo.

   avisar("Pacote instalado")
   avisar("Falhou ao baixar", { tipo: "erro", duracao: 8000 })
   const a = avisar("Sincronizando…", { tipo: "trabalhando", duracao: 0 })
   a.atualizar("Pronto", { tipo: "ok", duracao: 3000 })

   tipo: "ok" (padrão), "erro", "info", "trabalhando" (a marca gira)
   duracao: ms até sumir; 0 = fica até fechar
   acao: { rotulo: "Desfazer", ao: () => … } vira uma tecla no aviso
   Clicar no aviso fecha. Passar o mouse segura o tempo. */

const MAXIMO = 4;

function pilha() {
  let el = document.querySelector(".mo-avisos");
  if (!el) {
    el = document.createElement("div");
    el.className = "mo-avisos";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  return el;
}

export function avisar(texto, { tipo = "ok", duracao = 4500, acao } = {}) {
  const el = document.createElement("div");
  el.className = "mo-aviso-flutuante";
  const corpo = document.createElement("span");
  el.appendChild(corpo);

  let relogio = 0;
  let restante = 0;
  let inicio = 0;

  const fechar = () => {
    clearTimeout(relogio);
    if (!el.isConnected || el.classList.contains("mo-saindo")) return;
    el.classList.add("mo-saindo");
    const sair = () => el.remove();
    el.addEventListener("animationend", sair, { once: true });
    setTimeout(sair, 400);
  };
  const agendar = (ms) => {
    clearTimeout(relogio);
    restante = ms;
    if (ms > 0) {
      inicio = performance.now();
      relogio = setTimeout(fechar, ms);
    }
  };

  const montar = (novoTexto, opcoes) => {
    corpo.textContent = novoTexto;
    el.dataset.tipo = opcoes.tipo ?? tipo;
    el.querySelector(".mo-tecla")?.remove();
    if (opcoes.acao) {
      const tecla = document.createElement("button");
      tecla.type = "button";
      tecla.className = "mo-tecla mo-tecla--p";
      tecla.textContent = opcoes.acao.rotulo;
      tecla.addEventListener("click", (e) => {
        e.stopPropagation();
        opcoes.acao.ao?.();
        fechar();
      });
      el.appendChild(tecla);
    }
    agendar(opcoes.duracao ?? duracao);
  };

  el.addEventListener("click", fechar);
  el.addEventListener("pointerenter", () => {
    if (!restante) return;
    clearTimeout(relogio);
    restante = Math.max(1200, restante - (performance.now() - inicio));
  });
  el.addEventListener("pointerleave", () => restante && agendar(restante));

  const lugar = pilha();
  lugar.appendChild(el);
  while (lugar.children.length > MAXIMO) lugar.firstElementChild.remove();
  montar(texto, { tipo, duracao, acao });

  return {
    elemento: el,
    fechar,
    atualizar: (novoTexto, opcoes = {}) => montar(novoTexto, { tipo: "ok", duracao: 4500, ...opcoes }),
  };
}
