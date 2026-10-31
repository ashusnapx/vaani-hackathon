#!/usr/bin/env bash
# Re-pull Vaani docs (docs.vaanivoice.ai, Mintlify) into this folder as markdown.
# Usage: ./docs/vaani/sync.sh
set -euo pipefail
cd "$(dirname "$0")"
BASE=https://docs.vaanivoice.ai

curl -fsSL "$BASE/llms.txt" -o llms.txt
curl -fsSL "$BASE/api-reference/openapi.json" -o api-reference/openapi.json --create-dirs

# Every page listed in llms.txt, mirrored to its URL path
grep -oE "$BASE/[^)]+\.md" llms.txt | sort -u | while read -r url; do
  out="${url#$BASE/}"
  mkdir -p "$(dirname "$out")"
  # strip Mintlify's 3-line "Documentation Index" banner
  curl -fsSL "$url" | sed '1,/^$/{/^>/d;/^$/d;}' > "$out"
  echo "ok $out"
done

# Local index: point llms.txt links at the mirrored files
sed "s#$BASE/#./#g" llms.txt > INDEX.md
