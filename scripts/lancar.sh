#!/usr/bin/env bash
# Lança uma versão do Mosaic (o passo a passo está no VERSIONAMENTO.md).
#
#   scripts/lancar.sh           mostra a versão atual, o que entrou depois dela
#                               e qual seria a próxima
#   scripts/lancar.sh minor     lança a próxima: patch, minor ou major
#   scripts/lancar.sh 0.7.0     ou um número escolhido
#   scripts/lancar.sh -y minor  sem abrir o editor e sem perguntar
#
# Lançar é: config/versao.py com o número novo, a seção da versão escrita no
# CHANGELOG.md a partir das mensagens dos commits (o editor abre para você
# revisar), o commit "chore(versao): X.Y.Z" e a tag vX.Y.Z. Nada vai para o
# GitHub sozinho: no fim aparece o comando para mandar.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

erro() { echo "erro: $*" >&2; exit 1; }

sim=0
if [ "${1:-}" = "-y" ]; then sim=1; shift; fi

atual=$(sed -n 's/^VERSAO = "\(.*\)"/\1/p' config/versao.py)
ultimaTag=$(git describe --tags --abbrev=0 2>/dev/null || true)
intervalo="${ultimaTag:+$ultimaTag..}HEAD"

commits() { git log --reverse --format=%s "$intervalo" | grep -v '^chore(versao):' || true; }

proxima() {
  local maior menor correcao
  IFS=. read -r maior menor correcao <<< "$atual"
  case "$1" in
    major) echo "$((maior + 1)).0.0" ;;
    minor) echo "$maior.$((menor + 1)).0" ;;
    patch) echo "$maior.$menor.$((correcao + 1))" ;;
    *) echo "$1" ;;
  esac
}

sugestao() {
  # Antes da 1.0, uma mudança que quebra algo sobe o minor; depois, o major.
  if commits | grep -Eq '^[a-z]+(\([^)]*\))?!:'; then
    if [ "${atual%%.*}" = 0 ]; then echo minor; else echo major; fi
  elif commits | grep -Eq '^feat(\([^)]*\))?:'; then
    echo minor
  else
    echo patch
  fi
}

secao() {
  # Uma lista por tipo de commit; chore, style, test e ci não entram.
  local titulo tipos itens
  while IFS='|' read -r titulo tipos; do
    itens=$(commits | grep -E "^($tipos)(\(|!|:)" |
      sed -E 's/^[a-z]+\(([^)]*)\)!?: (.*)$/- **\1:** \2/; s/^[a-z]+!?: (.*)$/- \1/' || true)
    if [ -n "$itens" ]; then printf '### %s\n%s\n\n' "$titulo" "$itens"; fi
  done <<'TIPOS'
Adicionado|feat
Mudado|perf|refactor
Corrigido|fix
Pacote|build
Documentação|docs
TIPOS
}

if [ $# -eq 0 ]; then
  echo "Versão atual: $atual (tag ${ultimaTag:-nenhuma})"
  if [ -z "$(commits)" ]; then echo "Nada novo desde a ${ultimaTag}."; exit 0; fi
  echo
  echo "Desde a ${ultimaTag:-primeira versão}:"
  commits | sed 's/^/  /'
  tipo=$(sugestao)
  echo
  echo "Próxima versão sugerida: $(proxima "$tipo") ($tipo). Para lançar: scripts/lancar.sh $tipo"
  exit 0
fi

nova=$(proxima "$1")
[[ $nova =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || erro "versão inválida: $nova (use patch, minor, major ou X.Y.Z)"
! git rev-parse -q --verify "refs/tags/v$nova" > /dev/null || erro "a tag v$nova já existe"
[ -z "$(git status --porcelain)" ] || erro "tem mudança sem commit; faça o commit (ou git stash) antes de lançar"
[ -n "$(commits)" ] || erro "nada novo desde a $ultimaTag"
ramo=$(git branch --show-current)
[ "$ramo" = main ] || echo "aviso: você está na branch $ramo, não na main"

# Se algo falhar daqui até o commit, tudo volta como estava.
trap 'git checkout -- config/versao.py CHANGELOG.md; echo "Nada foi lançado." >&2' ERR

sed -i "s/^VERSAO = \".*\"/VERSAO = \"$nova\"/" config/versao.py

# A seção nova entra embaixo do "## [Não lançado]", levando junto o que
# estava escrito à mão ali.
GERADA="$(secao)" NOVA="$nova" HOJE="$(date +%F)" python3 - << 'PY'
import os
import re

caminho = "CHANGELOG.md"
texto = open(caminho, encoding="utf-8").read()
cabecalho = "## [Não lançado]"
inicio = texto.index(cabecalho) + len(cabecalho)
achado = re.search(r"^## \[", texto[inicio:], re.M)
fim = inicio + achado.start() if achado else len(texto)
manual = texto[inicio:fim].strip()
secao = "\n\n".join(parte for parte in (manual, os.environ["GERADA"].strip()) if parte)
novo = f"\n\n## [{os.environ['NOVA']}] - {os.environ['HOJE']}\n\n{secao}\n\n"
open(caminho, "w", encoding="utf-8").write(texto[:inicio] + novo + texto[fim:])
PY

if [ "$sim" = 0 ]; then
  # O editor pode ter argumentos (EDITOR="code --wait").
  read -r -a editor <<< "${VISUAL:-${EDITOR:-nano}}"
  "${editor[@]}" CHANGELOG.md
  echo
  git --no-pager diff --stat
  read -r -p "Lançar a v$nova? [s/N] " resposta
  if [ "$resposta" != s ] && [ "$resposta" != S ]; then
    trap - ERR
    git checkout -- config/versao.py CHANGELOG.md
    echo "Nada foi lançado."
    exit 0
  fi
fi

notas=$(NOVA="$nova" python3 - << 'PY'
import os
import re

texto = open("CHANGELOG.md", encoding="utf-8").read()
achado = re.search(r"^## \[" + re.escape(os.environ["NOVA"]) + r"\].*?\n(.*?)(?=^## \[|\Z)", texto, re.M | re.S)
print(achado.group(1).strip() if achado else "")
PY
)

git commit -q -m "chore(versao): $nova" -- config/versao.py CHANGELOG.md
trap - ERR
# --cleanup=whitespace: sem isso o git apaga as linhas "### ..." da mensagem.
git tag -a --cleanup=whitespace "v$nova" -m "Mosaic $nova" -m "$notas"

echo "Pronto: Mosaic $nova (commit e tag v$nova)."
echo "Para mandar para o GitHub:  git push --follow-tags"
if [ "$(git config core.hooksPath || true)" != .githooks ]; then
  echo "Dica: ative a conferência das mensagens de commit com  git config core.hooksPath .githooks"
fi
