/* O pouco de JavaScript que esta loja precisa.

   Quem monta as telas é o Flask: os pacotes chegam prontos no HTML. O que é
   comum a todo app Mosaic (gaveta, diálogos, atalhos, pixels, transição)
   vem da Mosaic UI (mosaic-ui/mosaic.js); aqui só fica o que é da loja e
   que o servidor não tem como fazer sozinho, porque acontece depois que a
   página já está na tela. */

/* Gaveta do menu, diálogos e a tecla "/" da busca são da Mosaic UI
   (data-mo-gaveta, data-mo-abrir / data-mo-fechar, data-mo-atalho). */

/* 4. O <select> de ordenação envia o formulário ao mudar, para não precisar de
      um botão "aplicar" do lado. Sem JavaScript, o <noscript> do template
      mostra esse botão. */
document.querySelectorAll("[data-enviar]").forEach((campo) => {
  campo.addEventListener("change", () => campo.form.submit());
});

/* 5. O X da busca. Com uma busca feita, ele é um link que limpa no servidor.
      Antes de buscar, ele só aparece enquanto há texto e limpa o campo aqui
      mesmo, sem recarregar. */
document.querySelectorAll("[data-limpar-busca]").forEach((botao) => {
  const campo = botao.closest("form").querySelector("input[type=search]");
  const buscaFeita = !botao.hidden;

  campo.addEventListener("input", () => {
    if (!buscaFeita) botao.hidden = campo.value === "";
  });

  botao.addEventListener("click", (evento) => {
    if (buscaFeita) return;
    evento.preventDefault();
    campo.value = "";
    botao.hidden = true;
    campo.focus();
  });
});

/* 6. Sincronizar mirrors. A rota /syncDb demora (baixa os bancos inteiros):
      a tecla fica afundada e os blocos girando até a resposta chegar. */
document.querySelectorAll("[data-sincronizar]").forEach((formulario) => {
  formulario.addEventListener("submit", () => {
    const botao = formulario.querySelector("button");
    botao.classList.add("sincronizando");
    botao.setAttribute("aria-busy", "true");
    formulario.querySelector("[data-rotulo-sync]").textContent = "Sincronizando";
  });
});

/* 7. Origem da transição de pixels: ao sair da página, guarda onde foi o
      último clique (se foi agora há pouco). A próxima página desfaz a
      cortina a partir desse ponto — veja o <head> da base.html e o luzes.js. */
let ultimoToque = null;
document.addEventListener(
  "pointerdown",
  (evento) => {
    ultimoToque = { x: evento.clientX, y: evento.clientY, t: Date.now() };
  },
  { capture: true, passive: true },
);
window.addEventListener("pagehide", () => {
  const recente = ultimoToque && Date.now() - ultimoToque.t < 5000;
  try {
    sessionStorage.setItem(
      "pixels:origem",
      JSON.stringify(recente ? { x: ultimoToque.x, y: ultimoToque.y, t: Date.now() } : { t: Date.now() }),
    );
  } catch (erro) {}
});

/* Barras animadas que são recriadas a cada atualização da fila: o atraso
   negativo põe a animação no ponto em que ela estaria pelo relógio, então
   o bloco continua correndo em vez de voltar ao começo a cada 2 s. */
const sincronizarBarras = () => {
  document.querySelectorAll(".barra-viva > i").forEach((barra) => {
    barra.style.animationDelay = `-${Math.round(performance.now() % 2600)}ms`;
  });
};
sincronizarBarras();

/* 8. Fila ao vivo. Enquanto algo instala, busca esta mesma página a cada 2 s
      e troca só o que muda (lista, alvo, contagem e saída do terminal), em
      vez de recarregar a janela inteira. A saída só desce sozinha se você
      já estava lá embaixo. Quando a instalação acaba, para. */
if (document.querySelector("[data-fila-ao-vivo]")) {
  const PARTES = [".coluna-fila", ".terminal-cabecalho .alvo", ".meta-cabecalho"];

  const atualizarFila = async () => {
    let novo;
    try {
      const resposta = await fetch(location.href, { cache: "no-store" });
      novo = new DOMParser().parseFromString(await resposta.text(), "text/html");
    } catch (erro) {
      setTimeout(atualizarFila, 4000);
      return;
    }

    /* Trocar o HTML recria os cartões: sem isso eles "entrariam" de novo. */
    document.documentElement.classList.add("repeticao");

    for (const seletor of PARTES) {
      const atual = document.querySelector(seletor);
      const vindo = novo.querySelector(seletor);
      if (atual && vindo && atual.innerHTML !== vindo.innerHTML) atual.innerHTML = vindo.innerHTML;
    }

    sincronizarBarras();

    const saida = document.querySelector(".terminal-saida");
    const saidaNova = novo.querySelector(".terminal-saida");
    if (saida && saidaNova && saida.innerHTML !== saidaNova.innerHTML) {
      const noFim = saida.scrollHeight - saida.scrollTop - saida.clientHeight < 40;
      saida.innerHTML = saidaNova.innerHTML;
      if (noFim) saida.scrollTop = saida.scrollHeight;
    }

    if (novo.querySelector("[data-fila-ao-vivo]")) setTimeout(atualizarFila, 2000);
  };

  setTimeout(atualizarFila, 2000);
}

/* 9. Enquanto uma área rola, ela ganha a classe `rolando` (o CSS desliga o
      hover do conteúdo nesse meio-tempo) e perde 120ms depois de parar. */
document.addEventListener(
  "scroll",
  (evento) => {
    const area = evento.target;
    if (!(area instanceof Element)) return;
    if (!area.classList.contains("rolando")) area.classList.add("rolando");
    clearTimeout(area.__fimRolagem);
    area.__fimRolagem = setTimeout(() => area.classList.remove("rolando"), 120);
  },
  { capture: true, passive: true },
);

/* 10. Filtro da lista de Instalados: esconde na hora as linhas que não
       batem com o que foi digitado (nome ou descrição), e os lotes que
       ficaram vazios. Esc limpa. */
document.querySelectorAll("[data-filtrar-lista]").forEach((campo) => {
  const tabela = document.querySelector(".tabela");
  const lotes = [...tabela.querySelectorAll(".lote-linhas")];
  const vazio = tabela.querySelector("[data-filtro-vazio]");

  const filtrar = () => {
    const termo = campo.value.trim().toLowerCase();
    let algum = false;
    for (const lote of lotes) {
      let noLote = false;
      for (const linha of lote.children) {
        const bate = !termo || linha.dataset.filtro.includes(termo);
        linha.hidden = !bate;
        noLote ||= bate;
      }
      lote.hidden = !noLote;
      algum ||= noLote;
    }
    if (vazio) vazio.hidden = algum;
  };

  campo.addEventListener("input", filtrar);
  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && campo.value) {
      campo.value = "";
      filtrar();
    }
  });
});

/* 11. Verificar atualizações: a página nova demora (roda o checkupdates e o
       paru), então a tecla afunda e a marca gira até ela chegar. */
document.querySelectorAll("[data-verificar]").forEach((botao) => {
  botao.addEventListener("click", () => {
    botao.classList.add("verificando");
    botao.setAttribute("aria-busy", "true");
    const rotulo = botao.querySelector("[data-rotulo-verificar]");
    if (rotulo) rotulo.textContent = "Verificando…";
  });
});

/* 12. Tarefa longa (atualizar o sistema, sincronizar os bancos). Enquanto
       ela roda, busca o estado a cada segundo e atualiza passo, barra,
       etapas e saída; o relógio anda sozinho entre uma busca e outra.
       Quando a tarefa termina, vai para /tarefa/<nome>, que mostra o
       resultado. A saída é redesenhada pelo total de linhas recebidas (que
       só cresce), não pelo tamanho da lista: ela guarda só as últimas 400. */
const telaTarefa = document.querySelector('[data-tarefa][data-situacao="rodando"]');
if (telaTarefa) {
  const nome = telaTarefa.dataset.tarefa;
  const passo = telaTarefa.querySelector("[data-passo]");
  const barra = telaTarefa.querySelector("[data-barra]");
  const relogio = telaTarefa.querySelector("[data-tempo]");
  const saida = telaTarefa.querySelector("[data-saida]");
  const passos = telaTarefa.querySelector("[data-passos]");
  let decorrido = Number(relogio?.dataset.decorrido || 0);
  let totalMostrado = Number(saida?.dataset.total ?? -1);

  const formatar = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const tique = setInterval(() => {
    decorrido += 1;
    if (relogio) relogio.textContent = formatar(decorrido);
  }, 1000);

  const desenharSaida = (linhas, total) => {
    if (!saida || total === totalMostrado) return;
    totalMostrado = total;
    const noFim = saida.scrollHeight - saida.scrollTop - saida.clientHeight < 40;
    saida.replaceChildren(
      ...linhas.map((linha) => {
        const div = document.createElement("div");
        if (!/^(::|==>)/.test(linha)) div.className = "indent";
        div.textContent = linha;
        return div;
      }),
    );
    const cursor = document.createElement("div");
    cursor.className = "linha-cursor";
    cursor.innerHTML = '<i class="caret" aria-hidden="true"></i>';
    saida.append(cursor);
    if (noFim) saida.scrollTop = saida.scrollHeight;
  };

  const acompanhar = async () => {
    let estado;
    try {
      estado = await (await fetch(`/tarefa/${nome}/estado`, { cache: "no-store" })).json();
    } catch (erro) {
      setTimeout(acompanhar, 2000);
      return;
    }
    if (!estado || estado.situacao !== "rodando") {
      clearInterval(tique);
      const destino = telaTarefa.dataset.aoTerminar;
      if (destino && location.pathname !== destino) location.assign(destino);
      else location.reload();
      return;
    }
    decorrido = estado.decorrido;
    if (passo) passo.textContent = estado.passo;
    if (barra) {
      const conhecido = estado.progresso !== null;
      barra.classList.toggle("indeterminada", !conhecido);
      barra.firstElementChild.style.width = conhecido ? `${estado.progresso}%` : "";
      if (conhecido) barra.setAttribute("aria-valuenow", estado.progresso);
    }
    if (passos && estado.passos.length) {
      const rotulos = { esperando: "na fila", rodando: "baixando", pronto: "pronto" };
      [...passos.children].forEach((item, i) => {
        const p = estado.passos[i];
        if (!p) return;
        item.className = item.className.replace(/estado-\S+/, `estado-${p.estado}`);
        item.querySelector("em").textContent = rotulos[p.estado];
      });
    }
    desenharSaida(estado.linhas, estado.total);
    setTimeout(acompanhar, 1000);
  };

  if (saida) saida.scrollTop = saida.scrollHeight;
  setTimeout(acompanhar, 1000);
}

/* 13. Configurações: mostra o valor de cada cor do tema ao lado da
       amostra, e a barra de salvar avisa quando algo mudou. */
document.querySelectorAll("[data-cor-var]").forEach((codigo) => {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(codigo.dataset.corVar).trim();
  if (valor) codigo.textContent = valor;
});
const formConfig = document.querySelector("[data-form-config]");
if (formConfig) {
  const estado = formConfig.querySelector("[data-estado-salvar]");
  const descartar = formConfig.querySelector("[data-descartar]");
  const marcar = (mudou) => {
    estado.classList.toggle("mudou", mudou);
    estado.textContent = mudou ? "Alterações não salvas" : "Tudo salvo";
    descartar.disabled = !mudou;
  };
  formConfig.addEventListener("input", () => marcar(true));
  formConfig.addEventListener("change", () => marcar(true));
  formConfig.addEventListener("reset", () => setTimeout(() => marcar(false)));
}

/* A saída do build começa rolada até o fim, que é onde está o que interessa. */
const terminal = document.querySelector(".terminal-saida");
if (terminal) {
  terminal.scrollTop = terminal.scrollHeight;
}
