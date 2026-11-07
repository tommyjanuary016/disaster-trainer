#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$DIR/lecture_materials/manual_src"
OUT="$DIR/lecture_materials/documents"

mkdir -p "$OUT"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_FLAGS=(
  --headless
  --no-sandbox
  --disable-gpu
  --disable-background-networking
  --disable-sync
  --disable-translate
  --disable-features=Translate,OptimizationHints,MediaRouter
  --no-first-run
  --no-default-browser-check
  --print-to-pdf-no-header
)

echo "Generating Player Handbook PDF (4 pages)..."
"$CHROME" "${CHROME_FLAGS[@]}" \
  --print-to-pdf="$OUT/01_プレイヤー操作ハンドブック.pdf" \
  "file://$SRC/player_handbook.html" > /dev/null 2>&1 || true

echo "Generating Controller Manual PDF (3 pages)..."
"$CHROME" "${CHROME_FLAGS[@]}" \
  --print-to-pdf="$OUT/02_コントローラー運用マニュアル.pdf" \
  "file://$SRC/controller_manual.html" > /dev/null 2>&1 || true

echo "All PDFs generated successfully in $OUT!"
