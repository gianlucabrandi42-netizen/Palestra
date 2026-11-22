#!/bin/sh
# Pubblica l'app SOLO se le prove automatiche passano (22/11/2026).
# Uso: sh tools/pubblica.sh "Messaggio del commit"
#  1. nuova versione (data e ora) in sw.js e index.html (tools/versione.sh)
#  2. tutte le prove (tools/check.sh): se una fallisce si ferma, rimette la versione di prima e NON pubblica
#  3. commit, allineamento con main (se un'altra chat ha pubblicato nel frattempo) e push: GitHub Pages pubblica da solo
cd "$(dirname "$0")/.." || exit 1
MSG="$1"; [ -z "$MSG" ] && { echo "uso: sh tools/pubblica.sh \"messaggio\""; exit 1; }
OLD=$(sed -n 's/^const VERSION = "\([^"]*\)";/\1/p' sw.js)
sh tools/versione.sh >/dev/null; NEW=$(sed -n 's/^const VERSION = "\([^"]*\)";/\1/p' sw.js)
echo "Versione $NEW · prove in corso…"
if ! sh tools/check.sh > /tmp/palestra-check.log 2>&1; then
  grep -E "✗|ERRORE|PROBLEMI" -A2 /tmp/palestra-check.log | head -40
  sh tools/versione.sh "$OLD" >/dev/null
  echo "PROVE FALLITE: non pubblico (log completo: /tmp/palestra-check.log)"; exit 1
fi
tail -1 /tmp/palestra-check.log
git add -A
git commit -q -m "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxcyaTBycEg2Buw1zr7oa3" || exit 1
if ! git -c push.negotiate=true push -q origin HEAD:main 2>/dev/null; then
  echo "Un'altra chat ha pubblicato: mi allineo e riprovo le prove"
  git pull -q --rebase origin main || { echo "CONFLITTO: risolvilo a mano"; exit 1; }
  sh tools/check.sh > /tmp/palestra-check.log 2>&1 || { tail -20 /tmp/palestra-check.log; echo "PROVE FALLITE dopo l'allineamento: non pubblico"; exit 1; }
  git -c push.negotiate=true push -q origin HEAD:main || exit 1
fi
echo "Pubblicato $NEW"
