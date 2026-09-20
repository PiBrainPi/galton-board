#!/usr/bin/env bash
# deploy_vercel.sh — Deploy des Galton Boards (galton-board.ingenieur-tools.de) nach Vercel (Production).
# Migration 20.09.2026: Galton Board lebt auf Vercel (Team pi-brain, Projekt galton-board).
#
# Verwendung:
#   bash scripts/deploy_vercel.sh          # Deploy gh-pages-Stand → Production
#
# Voraussetzungen:
#   - Token-Datei ~/.config/vercel_token (chmod 600)
#   - Deploy-Quelle: gh-pages-Stand des Repos (index.html), CNAME-Datei wird entfernt
#
# Deploy-Reihenfolge (Regel 5): Änderungen prüfen + Freigabe, DANN deployen.

set -euo pipefail
TOKEN_FILE="$HOME/.config/vercel_token"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "❌ Token-Datei fehlt: $TOKEN_FILE" >&2
  exit 1
fi
TOKEN="$(cat "$TOKEN_FILE")"

DEPLOY_DIR="$(mktemp -d)"
git -C "$(cd "$(dirname "$0")/.." && pwd)" archive gh-pages | tar -x -C "$DEPLOY_DIR"
rm -f "$DEPLOY_DIR/CNAME"
mkdir -p "$DEPLOY_DIR/.vercel"
cat > "$DEPLOY_DIR/.vercel/project.json" <<'EOF'
{"projectId":"prj_n97wad2vNwDzqwJab0mBKEf04h8k","orgId":"team_PIuJWDNsvKdNogMgAPQOUilp","projectName":"galton-board"}
EOF

cd "$DEPLOY_DIR"
echo "➜ Vercel-Deploy (Production) …"
npx --yes vercel@latest deploy --prod --yes --token "$TOKEN"

echo ""
echo "✅ Deploy fertig. Verifikation:"
echo "   https://galton-board.ingenieur-tools.de/"
