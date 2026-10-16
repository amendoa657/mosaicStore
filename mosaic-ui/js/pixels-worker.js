/* Pixels: os campos de pontos e as cortinas de transição, desenhados fora
   da thread principal.

   Roda num Web Worker só, compartilhado por todos os <mo-pixels> e cortinas
   da página (js/pixels.js entrega os <canvas> com transferControlToOffscreen
   e só repassa ponteiro, tamanho, visibilidade e foco). Assim, montar uma
   lista ou responder a um clique nunca disputa tempo com a animação.

   Cada campo é uma grade de quadradinhos. Três ondas lentas, uma por cor do
   tema, passam pela grade; em cada célula vence a mais forte e a força vira
   o tamanho do quadradinho, como uma retícula de impressão.

   Duas economias deixam isso barato:
     - cada onda é sin(u)·cos(v) com u e v "torcidos" por outro seno que
       depende só da linha (u) ou só da coluna (v). Com a soma de arcos a
       trigonometria é feita uma vez por linha e uma por coluna; por célula
       sobram multiplicações;
     - o lado é arredondado para o pixel da tela, e só as células que
       mudaram desde o quadro anterior são apagadas e redesenhadas. */

const QUADRO_CALMO_MS = 1000 / 30; // sem o mouse por perto, 30 qps sobra
const NEUTRO = 0.12 / 0.34; // os pontos neutros, em relação aos coloridos

const ONDAS = [
  { fx: 0.0062, fy: 0.0048, vx: 0.05, vy: 0.032, torcao: 1.7, fase: 0.0 },
  { fx: 0.0051, fy: 0.0069, vx: -0.041, vy: 0.046, torcao: 1.4, fase: 2.1 },
  { fx: 0.0072, fy: 0.0055, vx: 0.036, vy: -0.052, torcao: 1.9, fase: 4.4 },
];

const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${a})`;
/* O mesmo relógio para todos: dois campos lado a lado (ou o campo e a
   cortina) mostram a mesma onda no mesmo ponto. */
const relogio = (velocidade) => (Date.now() / 1000) * velocidade;

/* ======================================================================
   Campos
   ====================================================================== */
const campos = new Map();
let pausadoGeral = false;
let cortinasAtivas = 0;
let quadro = 0;

function criarCampo(d) {
  const f = {
    id: d.id,
    ctx: d.canvas.getContext("2d"),
    passo: d.passo,
    lente: d.lente,
    velocidade: d.velocidade,
    movimento: d.movimento,
    visivel: true,
    largura: 0,
    altura: 0,
    escala: 1,
    colunas: 0,
    linhas: 0,
    xs: null,
    ys: null,
    trig: null,
    anterior: null,
    estilos: null,
    ponteiro: { x: -9999, y: -9999, alvoX: -9999, alvoY: -9999, mexeuEm: 0 },
    ultimo: 0,
  };
  definirCores(f, d);
  campos.set(d.id, f);
  redimensionar(f, d.largura, d.altura, d.escala);
}

function definirCores(f, d) {
  f.estilos = [
    rgba(d.cores[0], d.opacidade),
    rgba(d.cores[1], d.opacidade),
    rgba(d.cores[2], d.opacidade),
    rgba(d.corNeutra, d.opacidade * NEUTRO),
  ];
  if (f.anterior) f.anterior.fill(-1); // redesenha tudo na cor nova
}

function prepararGrade(f) {
  const passo = f.passo;
  f.colunas = Math.ceil(f.largura / passo) + 1;
  f.linhas = Math.ceil(f.altura / passo) + 1;
  const desvio = Math.floor(passo / 2);

  f.xs = new Float32Array(f.colunas);
  f.ys = new Float32Array(f.linhas);
  for (let i = 0; i < f.colunas; i += 1) f.xs[i] = i * passo + desvio;
  for (let j = 0; j < f.linhas; j += 1) f.ys[j] = j * passo + desvio;

  f.trig = ONDAS.map((o) => {
    const sx = new Float32Array(f.colunas);
    const cx = new Float32Array(f.colunas);
    const sy = new Float32Array(f.linhas);
    const cy = new Float32Array(f.linhas);
    for (let i = 0; i < f.colunas; i += 1) {
      sx[i] = Math.sin(f.xs[i] * o.fx);
      cx[i] = Math.cos(f.xs[i] * o.fx);
    }
    for (let j = 0; j < f.linhas; j += 1) {
      sy[j] = Math.sin(f.ys[j] * o.fy);
      cy[j] = Math.cos(f.ys[j] * o.fy);
    }
    return {
      sx, cx, sy, cy,
      sinL: new Float32Array(f.linhas), cosL: new Float32Array(f.linhas),
      sinC: new Float32Array(f.colunas), cosC: new Float32Array(f.colunas),
    };
  });

  /* -1 força o primeiro desenho de todas as células. */
  f.anterior = new Int16Array(f.colunas * f.linhas * 2).fill(-1);
}

function redimensionar(f, largura, altura, escala) {
  if (largura < 1 || altura < 1) return;
  f.largura = largura;
  f.altura = altura;
  f.escala = escala;
  f.ctx.canvas.width = Math.round(largura * escala);
  f.ctx.canvas.height = Math.round(altura * escala);
  f.ctx.setTransform(escala, 0, 0, escala, 0, 0);
  prepararGrade(f);
  desenhar(f);
}

function desenhar(f) {
  if (!f.anterior) return;
  const ctx = f.ctx;
  const t = relogio(f.velocidade);
  const p = f.ponteiro;
  const passo = f.passo;

  /* A lente segue o cursor com atraso, para não colar no mouse. */
  p.x += (p.alvoX - p.x) * 0.18;
  p.y += (p.alvoY - p.y) * 0.18;

  /* Termos que mudam com o tempo: um por linha e um por coluna. */
  for (let k = 0; k < 3; k += 1) {
    const o = ONDAS[k];
    const g = f.trig[k];
    for (let j = 0; j < f.linhas; j += 1) {
      const b = t * o.vx + Math.sin(f.ys[j] * o.fy * 0.7 + t * 0.07 + o.fase) * o.torcao;
      g.sinL[j] = Math.sin(b);
      g.cosL[j] = Math.cos(b);
    }
    for (let i = 0; i < f.colunas; i += 1) {
      const d = t * o.vy + Math.cos(f.xs[i] * o.fx * 0.6 - t * 0.05 + o.fase) * o.torcao;
      g.sinC[i] = Math.sin(d);
      g.cosC[i] = Math.cos(d);
    }
  }

  const raioLente = f.lente;
  const lenteAtiva = raioLente > 0 && p.x > -999;
  const raio2 = raioLente * raioLente;
  const passoTela = 1 / f.escala; // arredonda o lado para o pixel físico
  const ladoMax = passo - 6;
  const [g0, g1, g2] = f.trig;
  const anterior = f.anterior;
  let estiloAtual = -1;

  for (let j = 0; j < f.linhas; j += 1) {
    const y = f.ys[j];
    const dy = y - p.y;
    for (let i = 0; i < f.colunas; i += 1) {
      const x = f.xs[i];

      /* sin(x·fx + b)·cos(y·fy + d), por soma de arcos. */
      const v0 = (g0.sx[i] * g0.cosL[j] + g0.cx[i] * g0.sinL[j]) * (g0.cy[j] * g0.cosC[i] - g0.sy[j] * g0.sinC[i]);
      const v1 = (g1.sx[i] * g1.cosL[j] + g1.cx[i] * g1.sinL[j]) * (g1.cy[j] * g1.cosC[i] - g1.sy[j] * g1.sinC[i]);
      const v2 = (g2.sx[i] * g2.cosL[j] + g2.cx[i] * g2.sinL[j]) * (g2.cy[j] * g2.cosC[i] - g2.sy[j] * g2.sinC[i]);

      let melhor = 0;
      let forca = v0;
      if (v1 > forca) { forca = v1; melhor = 1; }
      if (v2 > forca) { forca = v2; melhor = 2; }

      let lente = 0;
      if (lenteAtiva) {
        const dx = x - p.x;
        const d2 = dx * dx + dy * dy;
        if (d2 < raio2) {
          const q = 1 - Math.sqrt(d2) / raioLente;
          lente = q * q;
        }
      }

      const nivel = Math.max(0, (forca - 0.35) / 0.65) + lente * 0.55;
      let lado;
      let estilo;
      if (nivel <= 0.02) {
        lado = 1 + lente * 1.5;
        estilo = 3; // neutro
      } else {
        lado = Math.min(1.5 + nivel * 4 * (passo / 15), ladoMax);
        estilo = melhor;
      }

      /* Lado em pixels físicos, inteiro: é o que permite comparar. */
      const ladoTela = Math.round(lado / passoTela);
      const indice = (j * f.colunas + i) * 2;
      if (anterior[indice] === ladoTela && anterior[indice + 1] === estilo) continue;

      const apagar = Math.max(anterior[indice], ladoTela) * passoTela + 2;
      ctx.clearRect(x - apagar / 2, y - apagar / 2, apagar, apagar);
      anterior[indice] = ladoTela;
      anterior[indice + 1] = estilo;
      if (ladoTela === 0) continue;

      if (estilo !== estiloAtual) {
        ctx.fillStyle = f.estilos[estilo];
        estiloAtual = estilo;
      }
      const l = ladoTela * passoTela;
      ctx.fillRect(x - l / 2, y - l / 2, l, l);
    }
  }
}

const anda = (f) => f.movimento && f.visivel && f.anterior;

function laco(agora) {
  quadro = 0;
  if (pausadoGeral || cortinasAtivas > 0) return;
  let algum = false;
  for (const f of campos.values()) {
    if (!anda(f)) continue;
    algum = true;
    /* Com o mouse mexendo, a lente acompanha a taxa da tela; parado, o
       campo anda a 30 qps (ele é lento, não precisa de mais). */
    const mexendo = f.lente > 0 && agora - f.ponteiro.mexeuEm < 400;
    if (mexendo || agora - f.ultimo >= QUADRO_CALMO_MS) {
      f.ultimo = agora;
      desenhar(f);
    }
  }
  if (algum) quadro = requestAnimationFrame(laco);
}

function acordar() {
  if (quadro || pausadoGeral || cortinasAtivas > 0) return;
  quadro = requestAnimationFrame(laco);
}

/* ======================================================================
   Cortina: a onda de pixels que revela uma área (ou que cobre)
   ====================================================================== */
const ESPALHAR_MS = 300; // tempo para a onda atravessar a área
const ENCOLHER_MS = 190; // tempo de cada célula sumir
const ESPERA_MAX_MS = 120; // se a página demorar a liberar, começa assim mesmo
const COBRIR_ESPALHAR_MS = 260; // cobrir é um pouco mais rápido que revelar:
const CRESCER_MS = 170; //         quem espera não quer esperar a onda

const cortinas = new Map();

/* Prepara o canvas e calcula, uma vez só, o atraso e a cor de cada célula:
   durante a onda, cada quadro é só aritmética. A cor é a da onda do fundo
   naquele ponto; o atraso cresce com a distância até a origem (ox, oy). */
function montarCortina(d, espalhar) {
  const { id, largura, altura, escala, ox, oy } = d;
  const passo = d.passo;
  const ctx = d.canvas.getContext("2d");
  ctx.canvas.width = Math.round(largura * escala);
  ctx.canvas.height = Math.round(altura * escala);
  ctx.setTransform(escala, 0, 0, escala, 0, 0);

  const colunas = Math.ceil(largura / passo);
  const linhas = Math.ceil(altura / passo);
  const alcance = Math.max(
    Math.hypot(ox, oy),
    Math.hypot(largura - ox, oy),
    Math.hypot(ox, altura - oy),
    Math.hypot(largura - ox, altura - oy),
    1,
  );
  const t = relogio(1);

  const total = colunas * linhas;
  const celulas = new Float32Array(total * 4);
  let n = 0;
  for (let j = 0; j < linhas; j += 1) {
    for (let i = 0; i < colunas; i += 1) {
      const cx = i * passo + passo / 2;
      const cy = j * passo + passo / 2;
      let melhor = 0;
      let forca = -Infinity;
      for (let k = 0; k < 3; k += 1) {
        const o = ONDAS[k];
        const u = cx * o.fx + t * o.vx + Math.sin(cy * o.fy * 0.7 + t * 0.07 + o.fase) * o.torcao;
        const v = cy * o.fy + t * o.vy + Math.cos(cx * o.fx * 0.6 - t * 0.05 + o.fase) * o.torcao;
        const valor = Math.sin(u) * Math.cos(v);
        if (valor > forca) {
          forca = valor;
          melhor = k;
        }
      }
      celulas[n * 4] = i * passo;
      celulas[n * 4 + 1] = j * passo;
      celulas[n * 4 + 2] = (Math.hypot(cx - ox, cy - oy) / alcance) * espalhar;
      celulas[n * 4 + 3] = melhor;
      n += 1;
    }
  }

  const c = {
    id,
    ctx,
    passo,
    celulas,
    feitas: new Uint8Array(total),
    total,
    inicio: 0,
    iniciada: false,
    cores: d.cores.map((cor) => rgba(cor, 1)),
    corCortina: rgba(d.corCortina, 1),
  };
  cortinas.set(id, c);
  cortinasAtivas += 1;
  return c;
}

function encerrarCortina(c) {
  if (!cortinas.delete(c.id)) return;
  cortinasAtivas -= 1;
  acordar();
}

/* Revelar: a área nasce coberta e a onda a abre a partir da origem. */
function prepararCortina(d) {
  const c = montarCortina(d, ESPALHAR_MS);

  /* Primeiro quadro: tudo coberto. Avisa a página, que pode tirar a
     cobertura do CSS e trocar o conteúdo por baixo. */
  c.ctx.fillStyle = c.corCortina;
  c.ctx.fillRect(0, 0, d.largura, d.altura);
  postMessage({ tipo: "coberto", id: c.id });
  setTimeout(() => iniciarCortina(c.id), d.esperar ? 4000 : ESPERA_MAX_MS);
}

function iniciarCortina(id) {
  const c = cortinas.get(id);
  if (!c || c.iniciada) return;
  c.iniciada = true;
  c.inicio = performance.now();
  requestAnimationFrame((agora) => quadroCortina(c, agora));
}

function quadroCortina(c, agora) {
  if (!cortinas.has(c.id)) return;
  const ctx = c.ctx;
  const passo = c.passo;
  const decorrido = agora - c.inicio;
  const cel = c.celulas;
  let restantes = 0;
  let estiloAtual = -1;

  for (let n = 0; n < c.total; n += 1) {
    if (c.feitas[n]) continue;
    const p = (decorrido - cel[n * 4 + 2]) / ENCOLHER_MS;
    if (p <= 0) {
      restantes += 1;
      continue; // ainda coberta: já está desenhada
    }

    const x = cel[n * 4];
    const y = cel[n * 4 + 1];
    ctx.clearRect(x, y, passo, passo);
    if (p >= 1) {
      c.feitas[n] = 1;
      continue;
    }

    restantes += 1;
    const saida = 1 - (1 - p) ** 3; // ease-out cúbico
    const lado = (passo - 2) * (1 - saida);
    const cor = cel[n * 4 + 3];
    if (cor !== estiloAtual) {
      ctx.fillStyle = c.cores[cor];
      estiloAtual = cor;
    }
    ctx.fillRect(x + (passo - lado) / 2, y + (passo - lado) / 2, lado, lado);
  }

  if (restantes > 0) {
    requestAnimationFrame((t) => quadroCortina(c, t));
    return;
  }

  encerrarCortina(c);
  postMessage({ tipo: "revelado", id: c.id });
}

/* Cobrir: o contrário de revelar. A área começa à mostra e, a partir da
   origem, cada célula vira um quadradinho na cor da onda que cresce até
   fechar na cor da cortina. Quando a última fecha, avisa "coberto"; o
   desenho fica parado ali até a página tirar o canvas. */
function prepararCobertura(d) {
  const c = montarCortina(d, COBRIR_ESPALHAR_MS);
  c.iniciada = true;
  c.inicio = performance.now();
  requestAnimationFrame((agora) => quadroCobertura(c, agora));
}

function quadroCobertura(c, agora) {
  if (!cortinas.has(c.id)) return;
  const ctx = c.ctx;
  const passo = c.passo;
  const decorrido = agora - c.inicio;
  const cel = c.celulas;
  let restantes = 0;
  let estiloAtual = -1;

  for (let n = 0; n < c.total; n += 1) {
    if (c.feitas[n]) continue;
    const p = (decorrido - cel[n * 4 + 2]) / CRESCER_MS;
    if (p <= 0) {
      restantes += 1;
      continue; // a onda ainda não chegou aqui
    }

    const x = cel[n * 4];
    const y = cel[n * 4 + 1];
    if (p >= 1) {
      c.feitas[n] = 1;
      ctx.fillStyle = c.corCortina;
      estiloAtual = -1;
      ctx.fillRect(x, y, passo, passo);
      continue;
    }

    /* Cresce sobre o quadro anterior, então não precisa apagar. */
    restantes += 1;
    const saida = 1 - (1 - p) ** 3;
    const lado = (passo - 2) * saida;
    const cor = cel[n * 4 + 3];
    if (cor !== estiloAtual) {
      ctx.fillStyle = c.cores[cor];
      estiloAtual = cor;
    }
    ctx.fillRect(x + (passo - lado) / 2, y + (passo - lado) / 2, lado, lado);
  }

  if (restantes > 0) {
    requestAnimationFrame((t) => quadroCobertura(c, t));
    return;
  }

  encerrarCortina(c);
  postMessage({ tipo: "coberto", id: c.id });
}

/* ======================================================================
   Mensagens da página
   ====================================================================== */
onmessage = ({ data: d }) => {
  const f = campos.get(d.id);
  switch (d.tipo) {
    case "campo":
      criarCampo(d);
      acordar();
      break;
    case "tamanho":
      if (f) redimensionar(f, d.largura, d.altura, d.escala);
      break;
    case "cores":
      if (f) {
        definirCores(f, d);
        desenhar(f);
      }
      break;
    case "opcoes":
      if (f) {
        Object.assign(f, d.opcoes);
        if (d.opcoes.passo) prepararGrade(f);
        desenhar(f);
        acordar();
      }
      break;
    case "visivel":
      if (f) f.visivel = d.valor;
      acordar();
      break;
    case "ponteiro":
      if (f) {
        const p = f.ponteiro;
        p.alvoX = d.x;
        p.alvoY = d.y;
        if (p.x < -999 && d.x > -999) {
          p.x = d.x;
          p.y = d.y;
        }
        p.mexeuEm = performance.now();
        acordar();
      }
      break;
    case "remover":
      campos.delete(d.id);
      break;
    case "pausar":
      pausadoGeral = d.valor;
      acordar();
      break;
    case "revelar":
      prepararCortina(d);
      break;
    case "iniciar":
      iniciarCortina(d.id);
      break;
    case "cobrir":
      prepararCobertura(d);
      break;
    case "cancelar": {
      const c = cortinas.get(d.id);
      if (c) encerrarCortina(c);
      break;
    }
  }
};
