/* A vitrine: monta os exemplos a partir dos <template> (o código mostrado
   é exatamente o HTML que está rodando) e dá vida às demonstrações. */

import {
  avisar,
  tema,
  revelar,
  terminal,
  nomesSimbolos,
  pixelsSuportados,
} from "../mosaic.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Exemplos ---------- */
const escapar = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Realce simples: tag, atributo, valor. */
function realcar(fonte) {
  return fonte.replace(
    /<!--[\s\S]*?-->|<(\/?)([\w-]+)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g,
    (todo, barra, tag, atributos, auto, texto) => {
      if (texto !== undefined) return escapar(texto);
      if (tag === undefined) return `<span class="c">${escapar(todo)}</span>`;
      const a = atributos.replace(/([\w:-]+)(?:="([^"]*)")?/g, (_, nome, valor) =>
        `<span class="a">${nome}</span>` + (valor !== undefined ? `=<span class="v">"${escapar(valor)}"</span>` : ""),
      );
      return `<span class="t">&lt;${barra}${tag}</span>${a}<span class="t">${auto}&gt;</span>`;
    },
  );
}

let contador = 0;
for (const modelo of $$("template.vitrine-modelo")) {
  const fonte = modelo.innerHTML.replace(/^\s*\n/, "").replace(/\s+$/, "");
  const figura = document.createElement("figure");
  figura.className = "vitrine-exemplo";

  const titulo = document.createElement("div");
  titulo.className = "vitrine-exemplo-titulo";
  titulo.textContent = modelo.dataset.titulo || "";
  figura.appendChild(titulo);

  const palco = document.createElement("div");
  palco.className = "vitrine-palco";
  palco.appendChild(modelo.content.cloneNode(true));
  figura.appendChild(palco);

  if (!modelo.hasAttribute("data-sem-codigo")) {
    contador += 1;
    const id = `codigo-${contador}`;
    const detalhes = document.createElement("details");
    detalhes.innerHTML = `
      <summary>código <button class="mo-tecla mo-tecla--p mo-tecla--sutil" data-mo-copiar="#${id}">copiar</button></summary>
      <pre class="vitrine-codigo" id="${id}"><code>${realcar(fonte)}</code></pre>`;
    figura.appendChild(detalhes);
  }
  modelo.replaceWith(figura);
}

/* O copiar de dentro do <summary> não deve abrir e fechar o <details>. */
document.addEventListener("click", (e) => {
  if (e.target.closest("summary [data-mo-copiar]")) e.preventDefault();
}, true);

/* ---------- Cores ---------- */
function pintarCores() {
  for (const grupo of $$(".vitrine-cores")) {
    grupo.innerHTML = "";
    for (const nome of grupo.dataset.cores.split(/\s+/)) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "vitrine-cor";
      botao.style.setProperty("--amostra", `var(--mo-${nome})`);
      botao.dataset.moCopiar = `var(--mo-${nome})`;
      const [r, g, b, a] = tema.rgba(`var(--mo-${nome})`);
      const opacidade = a < 255 ? ` · ${Math.round((a / 255) * 100)}%` : "";
      botao.innerHTML = `<i></i><b>--mo-${nome}</b><span>${tema.hex([r, g, b])}${opacidade}</span>`;
      grupo.appendChild(botao);
    }
  }
}
pintarCores();
document.addEventListener("mo-tema", pintarCores);

/* ---------- Paleta ---------- */
const CHAVE_PALETA = "vitrine:paleta";

async function aplicarPaleta(nome) {
  tema.aplicar(null);
  if (nome === "matugen") {
    /* Com ?tema=/caminho/colors.css a vitrine mostra as suas cores. Sem
       ele, valem as cores que a página já tiver (ou a paleta padrão). */
    const url = new URLSearchParams(location.search).get("tema");
    if (url) {
      try {
        await tema.carregar(url);
      } catch (erro) {
        avisar(`Não deu para carregar ${url}`, { tipo: "erro" });
      }
    }
  } else {
    $("#mo-tema-carregado")?.remove();
    tema.aplicar(tema.PALETAS[nome]);
  }
}

$("#paletas").addEventListener("mo-escolha", async (e) => {
  const nome = e.detail.valor;
  try {
    localStorage.setItem(CHAVE_PALETA, nome);
  } catch (erro) {}
  const caixa = e.detail.tecla.getBoundingClientRect();
  /* A troca acontece por baixo da onda de pixels. */
  await revelar($(".mo-conteudo"), {
    x: caixa.left + caixa.width / 2,
    y: caixa.bottom,
    trocar: () => aplicarPaleta(nome),
  });
});

try {
  const salva = localStorage.getItem(CHAVE_PALETA);
  if (salva && salva !== "matugen") {
    $$("#paletas > .mo-tecla").forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.valor === salva)));
    aplicarPaleta(salva);
  } else {
    aplicarPaleta("matugen");
  }
} catch (erro) {}

/* ---------- Teclas ---------- */
document.addEventListener("click", async (e) => {
  const alternar = e.target.closest("[data-alternar]");
  if (alternar) {
    alternar.setAttribute("aria-pressed", String(alternar.getAttribute("aria-pressed") !== "true"));
  }

  const ocupar = e.target.closest("[data-ocupar]");
  if (ocupar) {
    ocupar.setAttribute("aria-busy", "true");
    await esperar(1600);
    ocupar.removeAttribute("aria-busy");
    avisar("Tudo em dia");
  }

  const comAviso = e.target.closest("[data-avisar]");
  if (comAviso) avisar(`${comAviso.dataset.avisar} apertada`, { tipo: "info", duracao: 1800 });

  const aviso = e.target.closest("[data-aviso]");
  if (aviso) {
    const tipo = aviso.dataset.aviso;
    if (tipo === "ok") avisar("firefox instalado");
    else if (tipo === "erro") avisar("Falhou ao baixar mesa: o mirror não respondeu", { tipo: "erro" });
    else if (tipo === "trabalhando") {
      const a = avisar("Sincronizando os bancos…", { tipo: "trabalhando", duracao: 0 });
      await esperar(2200);
      a.atualizar("Bancos sincronizados");
    } else if (tipo === "desfazer") {
      avisar("neovim removido", {
        tipo: "info",
        duracao: 6000,
        acao: { rotulo: "Desfazer", ao: () => avisar("neovim de volta") },
      });
    }
  }
});

/* ---------- Progresso ---------- */
document.addEventListener("input", (e) => {
  const controle = e.target.closest("[data-controla]");
  if (!controle) return;
  const valor = Number(controle.value);
  $(controle.dataset.controla)?.style.setProperty("--valor", `${valor}%`);
  const blocos = $("#blocos-demo");
  const feitos = Math.round((valor / 100) * 12);
  blocos?.style.setProperty("--feitos", feitos);
  if ($("#blocos-texto")) $("#blocos-texto").textContent = `${feitos} de 12`;
});

document.addEventListener("click", async (e) => {
  const botao = e.target.closest("[data-simular-etapas]");
  if (!botao || botao.getAttribute("aria-busy") === "true") return;
  botao.setAttribute("aria-busy", "true");
  const etapas = $$("#etapas-demo > li");
  const textos = { rodando: "baixando", pronto: "pronto" };
  const marcar = (li, estado) => {
    if (estado) li.dataset.estado = estado;
    else delete li.dataset.estado;
    li.querySelector("em").textContent = estado ? textos[estado] : "na fila";
  };
  etapas.forEach((li) => marcar(li));
  for (const li of etapas) {
    marcar(li, "rodando");
    await esperar(1100);
    marcar(li, "pronto");
  }
  botao.removeAttribute("aria-busy");
});

/* ---------- Terminal ---------- */
const LINHAS = [
  [":: Sincronizando a base de dados de pacotes...", "seta"],
  [" core baixando...", "fraco"],
  [" extra baixando...", "fraco"],
  [":: Iniciando atualização completa do sistema...", "seta"],
  ["resolvendo dependências...", ""],
  ["procurando por pacotes conflitantes...", ""],
  ["", ""],
  ["Pacotes (3) linux-6.11.3.arch1-1  mesa-1:24.2.4-1  paru-2.0.4-1", ""],
  ["", ""],
  [":: Continuar a instalação? [S/n] s", "seta"],
  ["(3/3) verificando chaves no chaveiro          [####################] 100%", ""],
  ["(3/3) atualizando linux                      [####################] 100%", ""],
  [":: Executando hooks de pós-transação...", "seta"],
  ["aviso: /etc/paru.conf instalado como /etc/paru.conf.pacnew", "aviso"],
  ["(1/2) Atualizando o initramfs...", ""],
  ["pronto. 3 pacotes atualizados.", "ok"],
];

document.addEventListener("click", async (e) => {
  const botao = e.target.closest("[data-rodar-terminal]");
  if (!botao || botao.getAttribute("aria-busy") === "true") return;
  botao.setAttribute("aria-busy", "true");
  const t = terminal("#saida-demo");
  t.limpar();
  for (const [texto, classe] of LINHAS) {
    t.escrever(texto, classe);
    await esperar(120 + Math.random() * 260);
  }
  botao.removeAttribute("aria-busy");
});

/* ---------- Revelar ---------- */
const APPS = [
  ["galeria", "1.204 fotos, organizadas pela cor."],
  ["noticias", "As manchetes do dia, sem anúncio."],
  ["email", "Caixa de entrada: 3 novas."],
  ["calculadora", "Teclas de verdade, atalhos de verdade."],
  ["assistente", "Fale com qualquer app Mosaic."],
];
let appAtual = 0;
const painelRevelar = $("#revelar-demo");
painelRevelar?.addEventListener("click", (e) => {
  appAtual = (appAtual + 1) % APPS.length;
  const [nome, texto] = APPS[appAtual];
  revelar(painelRevelar, {
    x: e.clientX,
    y: e.clientY,
    trocar: () => {
      painelRevelar.innerHTML = `
        <div class="mo-vazio">
          <mo-icone-app nome="${nome}" tamanho="78" tecla></mo-icone-app>
          <h3>${nome}</h3>
          <p>${texto}</p>
        </div>`;
    },
  });
});

/* ---------- Símbolos ---------- */
const listaSimbolos = $("#lista-simbolos");
for (const nome of nomesSimbolos().sort()) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "vitrine-simbolo";
  botao.dataset.moCopiar = `<mo-simbolo nome="${nome}"></mo-simbolo>`;
  botao.innerHTML = `<mo-simbolo nome="${nome}" tamanho="27"></mo-simbolo><span>${nome}</span>`;
  listaSimbolos.appendChild(botao);
}
$$('[data-contar="simbolos"]').forEach((el) => (el.textContent = nomesSimbolos().length));

/* ---------- Índice: busca e posição ---------- */
const busca = $("#busca-indice");
busca.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const primeiro = $$("#indice .mo-nav-item").find((a) => !a.hidden);
    if (primeiro) {
      primeiro.click();
      busca.blur();
    }
  } else if (e.key === "Escape") {
    busca.value = "";
    busca.dispatchEvent(new Event("input", { bubbles: true }));
    busca.blur();
  }
});

const itens = $$("#indice .mo-nav-item");
const marcarAtual = (id) => {
  for (const item of itens) {
    if (item.getAttribute("href") === `#${id}`) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  }
};
const secoes = itens.map((a) => $(a.getAttribute("href"))).filter(Boolean);
const visiveis = new Set();
const observador = new IntersectionObserver((entradas) => {
  for (const entrada of entradas) {
    if (entrada.isIntersecting) visiveis.add(entrada.target);
    else visiveis.delete(entrada.target);
  }
  const primeira = secoes.find((s) => visiveis.has(s));
  if (primeira) marcarAtual(primeira.id);
}, { root: $(".mo-conteudo"), rootMargin: "-8% 0px -70% 0px" });
secoes.forEach((s) => observador.observe(s));

/* ---------- Rodapé ---------- */
$("[data-estado-pixels]").textContent = pixelsSuportados()
  ? "· pixels num Web Worker"
  : "· pixels desligados (sem OffscreenCanvas)";

/* ---------- Calculadora ---------- */
const calc = $("#calc");
if (calc) {
  const visor = $("[data-calc-visor]", calc);
  const conta = $("[data-calc-conta]", calc);
  const SIMBOLO = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  let atual = "0";
  let guardado = null;
  let operacao = null;
  let novo = true;

  const formatar = (n) => {
    if (!Number.isFinite(n)) return "erro";
    const texto = String(Number(n.toPrecision(12)));
    return texto.replace(".", ",");
  };
  const ler = () => Number(atual.replace(",", "."));
  const operar = (a, b, op) => ({ "+": a + b, "-": a - b, "*": a * b, "/": a / b })[op];
  const mostrar = () => {
    visor.textContent = atual;
    conta.textContent = operacao ? `${formatar(guardado)} ${SIMBOLO[operacao]}` : " ";
  };

  calc.addEventListener("click", (e) => {
    const tecla = e.target.closest("[data-calc]");
    if (!tecla) return;
    const v = tecla.dataset.calc;
    if (/^\d$/.test(v)) {
      atual = novo || atual === "0" ? v : atual.length < 14 ? atual + v : atual;
      novo = false;
    } else if (v === ",") {
      if (novo) atual = "0";
      if (!atual.includes(",")) atual += ",";
      novo = false;
    } else if (v === "limpar") {
      atual = "0";
      guardado = null;
      operacao = null;
      novo = true;
    } else if (v === "apagar") {
      atual = novo || atual.length <= 1 ? "0" : atual.slice(0, -1);
    } else if (v === "%") {
      atual = formatar(ler() / 100);
      novo = true;
    } else if (v === "=") {
      if (operacao !== null) {
        atual = formatar(operar(guardado, ler(), operacao));
        conta.textContent = " ";
        operacao = null;
        guardado = null;
        novo = true;
        visor.textContent = atual;
        return;
      }
    } else {
      if (operacao !== null && !novo) atual = formatar(operar(guardado, ler(), operacao));
      guardado = ler();
      operacao = v;
      novo = true;
    }
    mostrar();
  });
}
