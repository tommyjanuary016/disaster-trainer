#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$DIR/dist"
OUT="$DIR/../lecture_materials"
RAW="$OUT/raw_screens"
MOCKUP="$OUT/device_mockups"
TEMPLATE="$DIR/scripts/mockup_template.html"

mkdir -p "$RAW" "$MOCKUP"

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

# 撮影対象リスト: ID|URL
PAGES=(
  "01_launcher_top|http://127.0.0.1:$PORT/"
  "02_session_select|http://127.0.0.1:$PORT/?select_session=1"
  "03_role_select|http://127.0.0.1:$PORT/role-select"
  "04_qr_scanner|http://127.0.0.1:$PORT/training"
  "05_triage_patient|http://127.0.0.1:$PORT/training/triage-patient/1"
  "06_patient_detail|http://127.0.0.1:$PORT/training/patient/1"
  "07_patient_detail_pneumo|http://127.0.0.1:$PORT/training/patient/2"
  "08_treatment_scan|http://127.0.0.1:$PORT/training/treatment-scan/1"
  "09_radiology_scan|http://127.0.0.1:$PORT/training/radiology"
  "10_lab_scan|http://127.0.0.1:$PORT/training/lab"
  "11_patient_actor|http://127.0.0.1:$PORT/training/actor/1"
)

echo "[1/2] Capturing raw screens..."
for ITEM in "${PAGES[@]}"; do
  ID="${ITEM%%|*}"
  URL="${ITEM##*|}"
  OUT_RAW="$RAW/${ID}.png"
  echo "  Capturing $ID..."
  "$CHROME" "${CHROME_FLAGS[@]}" \
    --user-data-dir="/tmp/cd_${ID}" \
    --window-size=480,932 \
    --force-device-scale-factor=2 \
    --screenshot="$OUT_RAW" \
    "$URL" > /dev/null 2>&1 || true
done

echo "[2/2] Generating phone mockups..."
for ITEM in "${PAGES[@]}"; do
  ID="${ITEM%%|*}"
  IN_RAW="$RAW/${ID}.png"
  OUT_MOCKUP="$MOCKUP/${ID}_mockup.png"
  if [ -f "$IN_RAW" ]; then
    echo "  Framing $ID..."
    # Convert image path to file URL
    IMG_URL="file://$IN_RAW"
    TEMPLATE_URL="file://$TEMPLATE?src=$IMG_URL"
    "$CHROME" "${CHROME_FLAGS[@]}" \
      --user-data-dir="/tmp/cd_mockup_${ID}" \
      --window-size=540,1020 \
      --force-device-scale-factor=2 \
      --default-background-color=00000000 \
      --screenshot="$OUT_MOCKUP" \
      "$TEMPLATE_URL" > /dev/null 2>&1 || true
  fi
done

echo "Done! Screenshots saved to $OUT"
