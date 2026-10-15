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
| Superfícies | `--mo-fundo` `--mo-janela` `--mo-lateral-2` `--mo-cabecalho` `--mo-lateral` `--mo-cartao` `--mo-dialogo` `--mo-elevada` |
| Texto | `--mo-texto` `--mo-texto-2` `--mo-texto-3` `--mo-linha` `--mo-borda` `--mo-decorativa` |
| Tons | `--mo-tom-0…3` e `--mo-tom` (classes `mo-tom-0…3`) |
| Forma | `--mo-raio-p/m/g/xg` `--mo-profundidade` `--mo-tecla-sombra` |
| Espaço | `--mo-espaco-1…8` (4 a 52 px) e `--mo-gap` nos layouts |
| Movimento | `--mo-ease-saida/meio/gaveta` `--mo-dur-toque/curta/media/longa` |

As cores leem as variáveis do template do Matugen (`--corDestaque`,
`--corFundoJanela`…), com a paleta menta como reserva. Sem o `colors.css`, nada quebra.

## Componentes

| Peça | Classe / elemento | Arquivo |
| --- | --- | --- |
| Janela de app | `mo-app` `mo-cabecalho` `mo-corpo` `mo-lateral` `mo-nav-item` `mo-conteudo` `mo-rodape` `mo-barra-fixa` `mo-logotipo` | `css/app.css` |
| Tecla | `mo-tecla` (`--destaque --secundaria --terciaria --tom --perigo --sutil --icone --mono --p --g`), `mo-segmentos`, `mo-teclado`, `mo-atalho` | `css/tecla.css` |
| Marca | `mo-marca` (`--girando --assentar --apagada --fraca --viva`, `--mo-marca-1…4`) | `css/marca.css` |
| Campos | `mo-campo` `mo-rotulo` `mo-busca` `mo-interruptor` `mo-caixa` `mo-opcoes` `mo-deslizante` `mo-linha-opcao` | `css/campos.css` |
| Conteúdo | `mo-cartao` `mo-reticula` `mo-icone-app` `mo-chip` `mo-selo` `mo-pulso` `mo-lista` `mo-item` `mo-tabela` `mo-dados` `mo-aviso` `mo-numero` `mo-proporcao` `mo-legenda` `mo-etapas` `mo-abas` `mo-vazio` | `css/conteudo.css` |
| Progresso | `mo-barra` (`--indeterminada`, `<progress>`), `mo-blocos` | `css/progresso.css` |
| Sobreposições | `mo-dialogo` `mo-painel` `mo-menu` `data-mo-dica` `mo-avisos` | `css/sobreposicoes.css` |
| Terminal | `mo-terminal` `mo-terminal-saida` `mo-caret` | `css/terminal.css` |
| Símbolos | `<mo-simbolo nome>`: 43 ícones numa grade de 9 × 9 pixels | `js/simbolos.js` |
| Pixels | `<mo-pixels passo lente velocidade opacidade cores estatico>` | `js/pixels.js` |
| Layout | `mo-pilha` `mo-linha` `mo-grade` `mo-centro` `mo-secao` `mo-separador` | `css/layout.css` |
| Movimento | `mo-entra` `mo-cascata` | `css/movimento.css` |

Cada arquivo começa com um comentário mostrando o HTML de cada peça.

## Comportamentos sem JavaScript seu

| Atributo | Efeito |
| --- | --- |
| `data-mo-abrir="#id"` | abre o `<dialog>` (diálogo ou painel) ou o popover |
| `data-mo-fechar` | fecha o diálogo, painel ou menu em que está (com animação de saída) |
| `data-mo-gaveta` | abre e fecha a lateral em telas estreitas |
| `data-mo-menu="#id"` | abre o menu embaixo do botão; setas, Home, End e Esc funcionam |
| `role="tablist"` | abas com clique e setas; o painel vem de `aria-controls` |
| `data-mo-segmentos` | grupo de teclas ou chips: só um fica ligado (evento `mo-escolha`) |
| `data-mo-filtrar="#lista"` | o campo filtra a lista ao digitar (sem acento, sem maiúscula) |
| `data-mo-copiar="texto"` | copia o texto, ou o conteúdo de `"#seletor"` |
| `data-mo-ocupado` | no `<form>`: a tecla que enviou fica ocupada (a marca gira) |
| `data-mo-atalho="k"` | a tecla do teclado aperta o botão (ele afunda de verdade) ou foca o campo. Aceita várias (`"enter ="`) e `ctrl+k` |
| `data-mo-cortina` | a área que a onda de pixels revela na troca de página (padrão: `.mo-conteudo`) |

Tudo é delegado no `document`: funciona também no HTML que chegar depois.

## API

```js
import { avisar, tema, revelar, terminal, abrir, fechar, tom } from "./mosaic-ui/mosaic.js";

avisar("Pacote instalado");
const a = avisar("Sincronizando…", { tipo: "trabalhando", duracao: 0 });
a.atualizar("Pronto");
avisar("neovim removido", { acao: { rotulo: "Desfazer", ao: desfazer } });

tema.aplicar(tema.PALETAS.laranja);       // troca as cores ao vivo (pixels inclusive)
tema.aplicar({ destaque: "#ff8800" });    // só o que vier
await tema.carregar("/colors.css");       // o arquivo do Matugen
tema.aplicar(null);                       // volta para o CSS

await revelar(painel, { x, y, trocar: () => render() });   // onda de pixels
terminal("#saida").escrever(":: Sincronizando", "seta");
abrir("#dialogo"); fechar("#dialogo");
tom("firefox");                           // 0 a 3: o mesmo nome, o mesmo tom, sempre
```

Com `data-mo-manual` no `<html>`, nada é ligado sozinho: chame `iniciar()`.

## Como os pixels funcionam

Um Web Worker só desenha todos os campos e cortinas da página
(`transferControlToOffscreen`). Três ondas lentas, uma por cor do tema, passam pela
grade; em cada ponto vence a mais forte e a força vira o tamanho do quadradinho.
A trigonometria é feita por linha e por coluna (soma de arcos), só as células que
mudaram são redesenhadas, o campo para fora da tela, com a janela sem foco ou com
movimento reduzido. Sem `OffscreenCanvas`, fica só a cor de fundo.

## Compatibilidade

Testado no Chromium (o motor do Qt WebEngine, que o pywebview usa no Arch). Pede
Chromium 114+ ou Firefox 125+: usa `@layer`, `:has()`, `color-mix()`, `popover`,
`<dialog>` e OffscreenCanvas.

## Licença das fontes

Space Grotesk e JetBrains Mono, SIL Open Font License 1.1 (`fontes/LICENSE-*.txt`).
