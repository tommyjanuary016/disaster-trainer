#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$DIR/dist"
OUT="$DIR/../lecture_materials"
ADMIN_DIR="$OUT/controller_screens"
TS_RAW_DIR="$OUT/troubleshooting_raw"
TS_MOCKUP_DIR="$OUT/troubleshooting_mockups"
TEMPLATE="$DIR/scripts/mockup_template.html"

mkdir -p "$ADMIN_DIR" "$TS_RAW_DIR" "$TS_MOCKUP_DIR"

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

echo "=========================================="
echo " Part A: Controller Screens (Desktop 1920x1080)"
echo "=========================================="

ADMIN_PAGES=(
  "C-01_admin_session_manage|http://127.0.0.1:$PORT/admin?auth=1&new_session=1"
  "C-02_dashboard_overview|http://127.0.0.1:$PORT/admin?auth=1&tab=dashboard"
  "C-03_dashboard_area_map|http://127.0.0.1:$PORT/admin?auth=1&tab=dashboard"
  "C-04_dashboard_timeline_log|http://127.0.0.1:$PORT/admin?auth=1&tab=dashboard"
  "C-05_patient_master_list|http://127.0.0.1:$PORT/admin?auth=1&tab=patients"
  "C-06_settings_sheets_export|http://127.0.0.1:$PORT/admin?auth=1&tab=settings"
)

for ITEM in "${ADMIN_PAGES[@]}"; do
  ID="${ITEM%%|*}"
  URL="${ITEM##*|}"
  OUT_FILE="$ADMIN_DIR/${ID}.png"
  echo "  Capturing $ID..."
  "$CHROME" "${CHROME_FLAGS[@]}" \
    --user-data-dir="/tmp/cd_${ID}" \
    --window-size=1920,1080 \
    --force-device-scale-factor=1 \
    --screenshot="$OUT_FILE" \
    "$URL" > /dev/null 2>&1 || true
done

echo ""
echo "=========================================="
echo " Part B: Troubleshooting Screens (Mobile)"
echo "=========================================="

TS_PAGES=(
  "T-01_camera_fallback_list|http://127.0.0.1:$PORT/training?tab=list"
  "T-02_manual_number_entry|http://127.0.0.1:$PORT/training"
  "T-03_actor_procedure_qr_button|http://127.0.0.1:$PORT/training/actor/1"
  "T-04_procedure_qr_display|http://127.0.0.1:$PORT/qr-generator?tab=procedure"
  "T-05_medical_item_qr_display|http://127.0.0.1:$PORT/qr-generator?tab=item"
)

echo " [1/2] Capturing raw mobile screens..."
for ITEM in "${TS_PAGES[@]}"; do
  ID="${ITEM%%|*}"
  URL="${ITEM##*|}"
  OUT_RAW="$TS_RAW_DIR/${ID}.png"
  echo "  Capturing $ID..."
  "$CHROME" "${CHROME_FLAGS[@]}" \
    --user-data-dir="/tmp/cd_${ID}" \
    --window-size=480,932 \
    --force-device-scale-factor=2 \
    --screenshot="$OUT_RAW" \
    "$URL" > /dev/null 2>&1 || true
done

echo " [2/2] Generating phone mockups for troubleshooting..."
for ITEM in "${TS_PAGES[@]}"; do
  ID="${ITEM%%|*}"
  IN_RAW="$TS_RAW_DIR/${ID}.png"
  OUT_MOCKUP="$TS_MOCKUP_DIR/${ID}_mockup.png"
  if [ -f "$IN_RAW" ]; then
    echo "  Framing $ID..."
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

echo ""
echo "Done! All screens successfully captured."
