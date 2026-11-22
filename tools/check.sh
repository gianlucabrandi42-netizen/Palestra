#!/bin/sh
# Tutte le prove automatiche (22/11/2026). Da lanciare prima di ogni pubblicazione: sh tools/check.sh
# Servono python3 e playwright (pip install playwright; playwright install chromium). Esce con errore se una prova fallisce.
cd "$(dirname "$0")/.." || exit 1
ok=0
for f in tests/*.py; do
  case "$f" in tests/common.py) continue;; esac
  python3 "$f" || ok=1
done
[ $ok = 0 ] && echo "✓ tutte le prove superate" || echo "✗ qualche prova non è passata"
exit $ok
