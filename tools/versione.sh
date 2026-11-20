#!/bin/sh
# Nuova versione dell'app: cambia VERSION in sw.js e il "?v=" dei file in index.html (così i telefoni scaricano sempre i file nuovi,
# anche con un service worker vecchio installato). Uso: sh tools/versione.sh 2026-11-21-1
V="$1"; [ -z "$V" ] && { echo "uso: sh tools/versione.sh AAAA-MM-GG-N"; exit 1; }
cd "$(dirname "$0")/.." || exit 1
sed -i "s/^const VERSION = \"[^\"]*\";/const VERSION = \"$V\";/" sw.js
sed -i -E "s/(href=\"style\.css|src=\"(data|schede|macchine|macchine-db|macchine-schede|nutrizione|app|cibo)\.js)(\?v=[^\"]*)?\"/\1?v=$V\"/g" index.html
grep -c "?v=$V" index.html; grep "^const VERSION" sw.js
