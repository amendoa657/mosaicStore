# Mosaic UI

A identidade visual do Mosaic em HTML, CSS e JS, para qualquer app do ecossistema
(loja, calculadora, galeria, notícias, email, assistente).

Teclas que afundam, blocos chapados nas cores do wallpaper (Matugen), um campo de
pontos que anda atrás de tudo e a onda de pixels na troca de tela. Sem build, sem
dependência, sem framework: copie a pasta e escreva HTML.

Abra `index.html` por um servidor (o Worker dos pixels não roda em `file://`):

```sh
cd mosaic-ui && python -m http.server 8000   # http://localhost:8000
```

A vitrine mostra cada componente funcionando, com o código ao lado (o código
mostrado é exatamente o HTML que está rodando). `?tema=/caminho/colors.css` carrega
as suas cores.

## Uso

```html
<head>
  <script src="mosaic-ui/mosaic-inicio.js"></script>           <!-- opcional -->
  <link rel="stylesheet" href="mosaic-ui/mosaic.css">
  <link rel="stylesheet" href="/colors.css">                   <!-- Matugen -->
  <script type="module" src="mosaic-ui/mosaic.js"></script>
</head>
```

| Arquivo | O que faz |
| --- | --- |
| `mosaic.css` | tokens, base, layout, componentes, movimento, utilitários |
| `mosaic.js` | registra `<mo-pixels>`, `<mo-simbolo>`, `<mo-icone-app>` e liga os `data-mo-*` |
| `mosaic-inicio.js` | roda antes da primeira pintura: carrega o Worker cedo e prepara a onda de pixels entre páginas |

No Flask: copie (ou faça um link simbólico de) `mosaic-ui/` para `static/` e use
`url_for('static', filename='mosaic-ui/mosaic.css')`.

## Personalizar

**Tudo mora em `@layer`.** Qualquer CSS solto do seu app vence a biblioteca, sem
`!important` e sem briga de especificidade:

```css
.mo-tecla { border-radius: 2px; }          /* vence, simples assim */
```

**Tokens.** Redefina no `:root` (vale para o app todo) ou em qualquer elemento (vale
só ali dentro):

```css
:root { --mo-raio-p: 4px; --mo-fonte: "Inter", sans-serif; }
.perigoso { --mo-destaque: var(--mo-perigo); }
```

**Variáveis de componente.** Cada peça expõe as suas:

```css
.tecla-laranja { --mo-tecla-face: #ffb77c; --mo-tecla-texto: #4a2800; --mo-tecla-prof: 4px; }
```

### Tokens principais

| Grupo | Tokens |
| --- | --- |
| Acentos | `--mo-destaque` `--mo-destaque-fundo` `--mo-sobre-destaque` `--mo-secundaria(-fundo, -texto)` `--mo-terciaria(-fundo, -texto)` `--mo-perigo(-fundo, -texto)` |
| Estado | `--mo-sucesso(-fundo, -texto)` `--mo-perigo-suave` |
| Superfícies | `--mo-fundo` `--mo-janela` `--mo-lateral-2` `--mo-cabecalho` `--mo-lateral` `--mo-cartao` `--mo-cartao-hover` `--mo-dialogo` `--mo-elevada` |
| Texto | `--mo-texto` `--mo-texto-2` `--mo-texto-3` `--mo-linha` `--mo-borda` `--mo-decorativa`, e o texto de cada superfície: `--mo-texto-cabecalho/lateral/conteudo/cartao/dialogo/elevada` |
| Tons | `--mo-tom-0…3` (classes `mo-tom-0…3`). `--mo-tom` não existe no `:root`: só dentro de quem tem uma classe `mo-tom-N`, e os componentes caem na terciária sem ele |
| Forma | `--mo-raio-p/m/g/xg` `--mo-profundidade` `--mo-tecla-sombra` `--mo-sombra-cartao(-hover)` |
| Escala | `--mo-escala`: o zoom da interface inteira (a loja usa `1.1`). Os pixels e a onda compensam sozinhos |
| Camadas | `--mo-z-cortina` `--mo-z-menu` `--mo-z-avisos` |
| Espaço | `--mo-espaco-1…8` (4 a 52 px) e `--mo-gap` nos layouts |
| Movimento | `--mo-ease-saida/meio/gaveta` `--mo-dur-toque/curta/media/longa` |

As cores leem as variáveis do template do Matugen (`--corDestaque`,
`--corFundoJanela`…), com a paleta menta como reserva. Sem o `colors.css`, nada quebra.

## Componentes

| Peça | Classe / elemento | Arquivo |
| --- | --- | --- |
| Janela de app | `mo-app` `mo-cabecalho` `mo-corpo` `mo-lateral` `mo-nav-item` (`mo-pilula` `mo-ponto` `mo-nav-texto` `mo-contagem` `mo-nav-selo`) `mo-lateral-rotulo` `mo-conteudo` `mo-rodape` `mo-barra-fixa` `mo-logotipo` `mo-controles-janela` `mo-alternar-lateral` | `css/app.css` |
| Tecla | `mo-tecla` (`--destaque --secundaria --terciaria --tom --sucesso --perigo --sutil --icone --mono --p --g`, ocupada com `aria-busy` e uma `mo-marca` dentro), `mo-segmentos`, `mo-teclado`, `mo-atalho` | `css/tecla.css` |
| Marca | `mo-marca` (`--girando --assentar --apagada --fraca --viva`, `--mo-marca-1…4`) | `css/marca.css` |
| Campos | `mo-campo` `mo-rotulo` `mo-busca` (`--grande --filtro`, com `mo-lupa`) `mo-interruptor` `mo-caixa` `mo-opcoes` `mo-deslizante` `mo-linha-opcao` `mo-linha-opcao-texto` | `css/campos.css` |
| Conteúdo | `mo-cartao` (`--app --destaque --linha`, `mo-cartao-topo` `mo-cartao-rodape` `mo-resumo`) `mo-reticula` `mo-icone-app` (`--p --m --g --xg --tecla`) `mo-chip` `mo-selo` (`--sucesso --perigo --neutro`) `mo-pulso` `mo-lista` `mo-item` `mo-tabela` `mo-dados` `mo-aviso` (`--faixa --destaque --tom`) `mo-rotulo-grupo` `mo-numero` `mo-proporcao` `mo-legenda` `mo-etapas` `mo-abas` `mo-vazio` (`--marca`) | `css/conteudo.css` |
| Progresso | `mo-barra` (`--indeterminada`, `<progress>`), `mo-blocos`, `mo-carregando` (a espera de uma área; quem monta é o JS) | `css/progresso.css` |
| Sobreposições | `mo-dialogo` (`mo-dialogo-fechar` `mo-dialogo-corpo`) `mo-painel` `mo-menu` `data-mo-dica` `mo-avisos` `mo-aviso-flutuante` (`--sozinho`, `data-tipo`) | `css/sobreposicoes.css` |
| Terminal | `mo-terminal` `mo-terminal-cabecalho` `mo-terminal-rotulo` `mo-terminal-alvo` `mo-terminal-acoes` `mo-terminal-saida` (linhas `.seta .ok .erro .aviso .fraco .recuo`) `mo-terminal-ocioso` `mo-caret` | `css/terminal.css` |
| Símbolos | `<mo-simbolo nome>`: 43 ícones numa grade de 9 × 9 pixels | `js/simbolos.js` |
| Pixels | `<mo-pixels passo lente velocidade opacidade cores estatico>` | `js/pixels.js` |
| Layout | `mo-pilha` `mo-linha` `mo-grade` `mo-centro` `mo-secao` `mo-separador` | `css/layout.css` |
| Movimento | `mo-entra` `mo-cascata` | `css/movimento.css` |

Cada arquivo começa com um comentário mostrando o HTML de cada peça.

Avisos sem JavaScript: um `<div class="mo-avisos">` com
`<div class="mo-aviso-flutuante mo-aviso-flutuante--sozinho" data-tipo="ok|alerta|erro">`
dentro aparece e some sozinho em 4,5 s (é assim que a loja mostra os `flash()` do Flask).

Telas: abaixo de 900 px a lateral vira um trilho de 64 px só com os pontos; abaixo
de 760 px vira gaveta (`data-mo-gaveta`); abaixo de 520 px o cabeçalho esconde o
nome e os controles da janela.

## Comportamentos sem JavaScript seu

| Atributo | Efeito |
| --- | --- |
| `data-mo-abrir="#id"` | abre o `<dialog>` (diálogo ou painel) ou o popover |
| `data-mo-fechar` | fecha na hora o diálogo, painel ou menu em que está |
| `data-mo-fechar-fora` | no `<dialog>`: clicar no fundo escurecido fecha (sem ele, só o Esc e o `data-mo-fechar`) |
| `data-mo-fixo` | no `<dialog>`: nem o Esc fecha |
| `data-mo-gaveta` | abre e fecha a lateral em telas estreitas |
| `data-mo-menu="#id"` | abre o menu embaixo do botão; setas, Home, End e Esc funcionam |
| `role="tablist"` | abas com clique e setas; o painel vem de `aria-controls` |
| `data-mo-segmentos` | grupo de teclas ou chips: só um fica ligado (evento `mo-escolha`) |
| `data-mo-filtrar="#lista"` | o campo filtra a lista ao digitar (sem acento, sem maiúscula) |
| `data-mo-copiar="texto"` | copia o texto, ou o conteúdo de `"#seletor"` |
| `data-mo-ocupado` | no `<form>`: a tecla que enviou fica ocupada (a marca gira) |
| `data-mo-atalho="k"` | a tecla do teclado aperta o botão (ele afunda de verdade) ou foca o campo. Aceita várias (`"enter ="`) e `ctrl+k` |
| `data-mo-cortina` | a área que a onda de pixels revela na troca de página (padrão: `.mo-conteudo`) |
| `data-mo-carregando="texto"` | o nome do destino na espera da troca de página (num link, botão ou formulário); de um item da lateral, vem o nome dele |
| `data-mo-carregando-detalhe="…"` | a linha de baixo da espera ("lendo a lista do pacman") |
| `data-mo-sem-carregando` | a navegação espera sem tela (para quem já mostra a espera do seu jeito); no `<html>`, vale para todas |

Tudo é delegado no `document`: funciona também no HTML que chegar depois.

### Troca de página

Indo de uma página do app para outra, sem você escrever nada:

1. se a próxima demora mais de 180 ms, a área de conteúdo é coberta numa onda de
   pixels a partir do clique e mostra a marca girando, o nome do destino e uma linha
   de detalhe. O item da lateral para onde se vai já acende, com a pílula deslizando.
   Esc desiste (menos de formulário enviado: o servidor já recebeu);
2. a página nova nasce coberta e se revela em onda: do meio da espera, se ela
   apareceu, ou do clique.

### Abertura

Um app de janela (pywebview, Tauri…) pode abrir numa tela leve, servida pela
mesma origem, enquanto o resto sobe, e daí ir para a primeira página com
`#mo-abrir` no endereço (`location.replace("/#mo-abrir")`). A página nasce com a
janela inteira coberta e a marca girando no meio (46 px, ou `--mo-abertura-marca`),
e se revela numa onda que sai dela; o `#mo-abrir` some do endereço. Para a marca
não dar salto na troca, a abertura guarda em que ponto da volta a dela estava, ao
sair (`sessionStorage["mo:abertura-fase"]`, o `currentTime` da animação), e a da
página continua dali. A loja faz isso em `config/janela.py`.

O app pode escrever o texto da espera pelo endereço, ou desistir dela:

```js
document.addEventListener("mo-carregando", (e) => {
  const { url, metodo, dados, gatilho } = e.detail;   // dados: o FormData de um POST
  if (url.pathname === "/instalados") e.detail.detalhe = "lendo a lista do pacman";
  // e.preventDefault() navega sem a espera
});
```

## API

```js
import { avisar, tema, revelar, cobrir, carregando, terminal, abrir, fechar, tom } from "./mosaic-ui/mosaic.js";

avisar("Pacote instalado");
const a = avisar("Sincronizando…", { tipo: "trabalhando", duracao: 0 });
a.atualizar("Pronto");
avisar("neovim removido", { acao: { rotulo: "Desfazer", ao: desfazer } });

tema.aplicar(tema.PALETAS.laranja);       // troca as cores ao vivo (pixels inclusive)
tema.aplicar({ destaque: "#ff8800" });    // só o que vier
await tema.carregar("/colors.css");       // o arquivo do Matugen
tema.aplicar(null);                       // volta para o CSS

await revelar(painel, { x, y, trocar: () => render() });   // onda de pixels
const capa = cobrir(painel, { x, y });                      // o contrário: cobre e fica
await capa.pronto; capa.remover();
const espera = carregando(painel, { texto: "Instalados", detalhe: "lendo o pacman" });
espera.atualizar({ detalhe: "quase lá" }); espera.parar();  // espera.centro: o meio, para revelar dali
terminal("#saida").escrever(":: Sincronizando", "seta");
abrir("#dialogo"); fechar("#dialogo");
tom("firefox");                           // 0 a 3: o mesmo nome, o mesmo tom, sempre
```

Com `data-mo-manual` no `<html>`, nada é ligado sozinho: chame `iniciar()`.

## Como os pixels funcionam

Um Web Worker só desenha todos os campos e cortinas da página
(`transferControlToOffscreen`). Três ondas lentas, uma por cor do tema, passam pela
grade; em cada ponto vence a mais forte e a força vira o tamanho do quadradinho.
A cortina usa a mesma grade: na revelação cada célula vira um quadradinho na cor da
onda que encolhe até sumir, a partir da origem; na cobertura (`cobrir`, a espera), o
contrário. A trigonometria é feita por linha e por coluna (soma de arcos), só as células que
mudaram são redesenhadas, o campo para fora da tela, com a janela sem foco ou com
movimento reduzido. Sem `OffscreenCanvas`, fica só a cor de fundo.

## Compatibilidade

Testado no Chromium (o motor do Qt WebEngine, que o pywebview usa no Arch). Pede
Chromium 114+ ou Firefox 125+: usa `@layer`, `:has()`, `color-mix()`, `popover`,
`<dialog>` e OffscreenCanvas.

## Licença das fontes

Space Grotesk e JetBrains Mono, SIL Open Font License 1.1 (`fontes/LICENSE-*.txt`).
