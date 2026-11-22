#!/bin/sh
# Nuova versione dell'app: cambia VERSION in sw.js e il "?v=" dei file in index.html (così i telefoni scaricano sempre i file nuovi,
# anche con un service worker vecchio installato). Uso: sh tools/versione.sh 2026-11-21-1
# Senza argomento usa data e ora (es. 2026-11-22-2115): due chat che pubblicano lo stesso giorno non riusano lo stesso numero.
V="${1:-$(TZ=Europe/Rome date +%Y-%m-%d-%H%M)}"
cd "$(dirname "$0")/.." || exit 1
sed -i "s/^const VERSION = \"[^\"]*\";/const VERSION = \"$V\";/" sw.js
sed -i -E "s/(href=\"style\.css|src=\"(data|schede|macchine|macchine-db|macchine-schede|nutrizione|cibo|revisione|js\/[0-9a-z-]+)\.js)(\?v=[^\"]*)?\"/\1?v=$V\"/g" index.html
grep -c "?v=$V" index.html; grep "^const VERSION" sw.js
