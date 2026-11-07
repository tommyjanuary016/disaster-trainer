#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/../lecture_materials/controller_screens"
mkdir -p "$OUT"
rm -rf /tmp/cd_c07 /tmp/cd_c08 /tmp/cd_c09 2>/dev/null || true

PORT=4323
node "$DIR/scripts/spa_server.mjs" > /dev/null 2>&1 &
SERVER_PID=$!
sleep 1

cleanup() {
  kill $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

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
  --hide-scrollbars
)

echo "Capturing C-07 (Patient New Registration Form)..."
"$CHROME" "${CHROME_FLAGS[@]}" \
  --user-data-dir="/tmp/cd_c07" \
  --window-size=1920,1080 \
  --force-device-scale-factor=1 \
  --screenshot="$OUT/C-07_patient_form_new.png" \
  "http://127.0.0.1:$PORT/admin?auth=1&master_auth=1&create_patient=1" > /dev/null 2>&1 || true

echo "Capturing C-08 (Patient Edit & Treatment Requirements)..."
"$CHROME" "${CHROME_FLAGS[@]}" \
  --user-data-dir="/tmp/cd_c08" \
  --window-size=1920,1080 \
  --force-device-scale-factor=1 \
  --screenshot="$OUT/C-08_patient_form_treatments.png" \
  "http://127.0.0.1:$PORT/admin?auth=1&master_auth=1&edit_patient=1" > /dev/null 2>&1 || true

echo "Capturing C-09 (Patient Scenario Management & Acting Instructions)..."
"$CHROME" "${CHROME_FLAGS[@]}" \
  --user-data-dir="/tmp/cd_c09" \
  --window-size=1920,1080 \
  --force-device-scale-factor=1 \
  --screenshot="$OUT/C-09_patient_form_acting.png" \
  "http://127.0.0.1:$PORT/admin?auth=1&master_auth=1&create_patient=1" > /dev/null 2>&1 || true

echo "Done! C-07, C-08, C-09 captured."
