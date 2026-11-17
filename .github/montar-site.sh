#!/usr/bin/env bash
# Monta a pasta que vai para o GitHub Pages SÓ com os arquivos públicos do site.
# Os arquivos-fonte continuam na raiz do repositório; backend/, database/, docs/ e tests/ não são publicados.
#
# Uso:  bash .github/montar-site.sh [pasta_de_saida]        (padrão: _site)
# Se a variável API_URL existir, ela vira o endereço da API no config.js publicado.
set -euo pipefail
DESTINO="${1:-_site}"
rm -rf "$DESTINO"
mkdir -p "$DESTINO"
cp index.html 404.html config.js .nojekyll "$DESTINO"/
cp -r css js assets "$DESTINO"/

if [ -n "${API_URL:-}" ]; then
  API_URL="${API_URL%/}"
  if [[ ! "$API_URL" =~ ^https?://[A-Za-z0-9.:/_-]+$ ]]; then
    echo "ERRO: STUDYHUB_API_URL inválida: use algo como https://seu-usuario.pythonanywhere.com" >&2
    exit 1
  fi
  printf '// Gerado na publicação a partir da variável STUDYHUB_API_URL do repositório.\nwindow.STUDYHUB_CONFIG = {\n  API_URL: "%s",\n};\n' "$API_URL" > "$DESTINO/config.js"
  echo "config.js publicado com API_URL=$API_URL"
fi
echo "Site montado em $DESTINO ($(find "$DESTINO" -type f | wc -l) arquivos)"
