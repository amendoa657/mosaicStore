# Changelog

O que mudou em cada versão do Mosaic. O formato segue o
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões, o
[Versionamento Semântico](https://semver.org/lang/pt-BR/). Como lançar uma
versão está no [VERSIONAMENTO.md](VERSIONAMENTO.md).

## [Não lançado]

## [0.5.0] - 2026-10-16

### Adicionado
- **Mosaic UI:** a identidade visual vira uma biblioteca de HTML, CSS e JS
  (`mosaic-ui/`), com vitrine e documentação, para qualquer app do Mosaic.

### Mudado
- A loja passa a usar a Mosaic UI inteira, sem mudar nada na tela.

### Corrigido
- As teclas voltam a deixar selecionar texto, os campos de busca encolhem em
  janela estreita e a marca da Buscar se comprime na busca compacta.

## [0.4.0] - 2026-10-13

### Adicionado
- Tela de Instalados, com a versão e o tamanho de cada pacote.
- Tela de Atualizações, com o `checkupdates` e o `paru -Qua`.
- Atualizar o sistema (`pacman -Syu`) e sincronizar os bancos, com etapas,
  barra de progresso e a saída ao vivo.
- Instalados, Atualizações, Fila e Configurações no visual da Mosaic.

## [0.3.0] - 2026-10-09

### Adicionado
- Nome novo: Mosaic.
- Visual próprio: teclas, blocos, fundo de pontos e a paleta do wallpaper,
  pelo Matugen.
- Transição de pixels entre as telas.
- Filme de apresentação e GIFs no README.

### Mudado
- Os pixels rodam num Web Worker, as fontes são locais, a busca monta em lotes
  e a fila se atualiza sem recarregar a página.
- A configuração fica em `~/.config/mosaic-store`.

## [0.2.0] - 2026-10-08

### Adicionado
- Banco SQLite local com os pacotes da AUR, do core e do extra, baixados dos
  mirrors.
- Busca no banco local com índice FTS5, ordenada por correspondência e
  popularidade.
- Descobrir com os populares e os mais votados lidos do banco.
- Classe `Pacote`, que junta os pacotes da AUR e dos repositórios.

### Mudado
- A busca usa o índice FTS5 em vez de `LIKE`: os resultados saem na hora.
- O download e a inserção do banco ficam em módulos separados.

### Corrigido
- Correções na busca e no tema.

## [0.1.0] - 2026-09-15

### Adicionado
- Loja em Flask numa janela do pywebview, com busca na AUR e nos repositórios
  oficiais.
- Telas Descobrir, Buscar, Pacote, Fila, Instalados, Atualizações e
  Configurações.
- Busca com os modos AUR e repositórios oficiais.
- Fila de instalação com o paru, um pacote por vez, e a última pesquisa
  guardada.

### Mudado
- O código fica dividido em controllers, services e repositories.
