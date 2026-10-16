# Versionamento

Como o Mosaic numera as versões, escreve os commits e lança uma versão nova.

## As versões

O número segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/):
`MAIOR.MENOR.CORREÇÃO`, como `0.6.0`.

- Enquanto a versão começar com **0**, o Mosaic está em desenvolvimento. O
  **MENOR** sobe quando entra coisa nova (ou algo muda de um jeito que quebra);
  a **CORREÇÃO** sobe quando só tem correções.
- A **1.0.0** é quando você achar a loja pronta para o dia a dia. Dali em
  diante, o **MAIOR** sobe quando algo quebra.

A versão mora em três lugares, e o `scripts/lancar.sh` mexe nos três juntos:

| Onde | Para quê |
| --- | --- |
| `config/versao.py` | o app sabe a própria versão (`python app.py --versao`) |
| `CHANGELOG.md` | o que mudou em cada versão, para quem usa |
| a tag `vX.Y.Z` no git | marca o commit exato daquela versão |

## Os commits

Toda mensagem segue o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/):

```
tipo(área): o que mudou
```

| Tipo | Quando | Exemplo |
| --- | --- | --- |
| `feat` | coisa nova | `feat(busca): busca por categoria` |
| `fix` | correção | `fix: Descobrir com o banco vazio` |
| `perf` | desempenho | `perf(banco): índice na coluna nome` |
| `refactor` | reorganiza sem mudar o que o app faz | `refactor(janela): janela.py mais simples` |
| `docs` | README, CHANGELOG, comentários | `docs: telas novas no README` |
| `build` | pacote, PKGBUILD, dependências | `build(pkg): depende do pacman-contrib` |
| `chore` | manutenção | `chore: ignora a pasta dist` |

- A **área** é opcional. As que já existem: `busca`, `banco`, `fila`,
  `instalados`, `atualizacoes`, `visual`, `mosaic-ui`, `janela`, `pkg`,
  `motion`.
- Escreva em minúsculas, dizendo o que mudou: `feat(fila): cancelar uma
  instalação`, e não `Update fila`.
- Um `!` antes dos dois pontos marca uma mudança que quebra algo:
  `feat(banco)!: banco novo, o antigo precisa ser baixado de novo`.
- Mais detalhes vão no corpo do commit, depois de uma linha em branco.

O tipo não é enfeite: é dele que sai o CHANGELOG (`feat` vira "Adicionado",
`fix` vira "Corrigido"...) e a sugestão da próxima versão.

**Ative a conferência uma vez em cada clone** do repositório:

```sh
git config core.hooksPath .githooks
```

Daí em diante, um commit fora do padrão é recusado na hora, com a explicação
de como escrever.

## Lançar uma versão

1. Veja o que entrou desde a última versão e qual seria a próxima:

   ```sh
   scripts/lancar.sh
   ```

2. Lance a versão (`patch`, `minor`, `major` ou o número, como `0.7.0`):

   ```sh
   scripts/lancar.sh minor
   ```

   O script atualiza o `config/versao.py`, escreve a seção da versão no
   `CHANGELOG.md` a partir dos commits e abre o CHANGELOG no editor
   (`$EDITOR`, ou o nano). Ajuste o texto, salve, feche e confirme: ele faz o
   commit `chore(versao): 0.7.0` e a tag `v0.7.0`.

   Se escreveu algo à mão embaixo de `## [Não lançado]` no CHANGELOG, isso
   entra na versão também.

3. Mande para o GitHub:

   ```sh
   git push --follow-tags
   ```

Errou e ainda não mandou? Desfaça com `git tag -d v0.7.0 && git reset --hard HEAD~1`.

## Ver as versões

```sh
git tag                     # todas as versões
git describe --tags         # em que versão você está (v0.6.0-3-gabc1234: 3 commits depois da 0.6.0)
git log --oneline v0.5.0..  # o que entrou desde a 0.5.0
git switch --detach v0.4.0  # a loja como era na 0.4.0 (volte com git switch main)
```

## O pacote

O PKGBUILD (`pkg/`) é de um pacote `-git`: ele sempre instala a `main` mais
recente, e a versão do pacote sai da última tag. Na `v0.6.0`, o pacote é
`0.6.0.r0.gabc1234`; três commits depois, `0.6.0.r3.gdef5678`. Não precisa
mexer no PKGBUILD a cada versão.

## No GitHub (opcional)

Em **Releases → Draft a new release**, escolha a tag e cole a seção da versão
do CHANGELOG. Quem visita o repositório vê as versões ali.
