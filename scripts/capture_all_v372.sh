#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/../lecture_materials"
RAW="$OUT/raw_screens"
MOCKUP="$OUT/device_mockups"
ADMIN_DIR="$OUT/controller_screens"
TS_RAW_DIR="$OUT/troubleshooting_raw"
TS_MOCKUP_DIR="$OUT/troubleshooting_mockups"
TEMPLATE="$DIR/scripts/mockup_template.html"

mkdir -p "$RAW" "$MOCKUP" "$ADMIN_DIR" "$TS_RAW_DIR" "$TS_MOCKUP_DIR"
rm -rf /tmp/cd_* /tmp/cd_mockup_* 2>/dev/null || true

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

echo "=========================================================="
echo " [1/3] Player & Learning Screens (Mobile)"
echo "=========================================================="

PLAYER_PAGES=(
  "01_launcher_top|http://127.0.0.1:$PORT/"
  "01_b_launcher_join_qr|http://127.0.0.1:$PORT/?show_qr=1"
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
  "12_experience_mode|http://127.0.0.1:$PORT/training?tab=list&exp=1"
)

for ITEM in "${PLAYER_PAGES[@]}"; do
  ID="${ITEM%%|*}"
  URL="${ITEM##*|}"
  OUT_RAW="$RAW/${ID}.png"
  OUT_MOCKUP="$MOCKUP/${ID}_mockup.png"
  echo "  Capturing $ID..."
  "$CHROME" "${CHROME_FLAGS[@]}" \
    --user-data-dir="/tmp/cd_${ID}" \
    --window-size=480,932 \
    --force-device-scale-factor=2 \
    --screenshot="$OUT_RAW" \
    "$URL" > /dev/null 2>&1 || true

  if [ -f "$OUT_RAW" ]; then
    IMG_URL="file://$OUT_RAW"
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
echo "=========================================================="
echo " [2/3] Troubleshooting Screens (Mobile)"
echo "=========================================================="

TS_PAGES=(
  "T-01_camera_fallback_list|http://127.0.0.1:$PORT/training?tab=list"
  "T-02_manual_number_entry|http://127.0.0.1:$PORT/training"
  "T-03_actor_procedure_qr_button|http://127.0.0.1:$PORT/training/actor/1"
  "T-03_b_actor_modal_select|http://127.0.0.1:$PORT/training/actor/1?modal=1"
  "T-03_c_actor_modal_qr_zoom|http://127.0.0.1:$PORT/training/actor/1?modal=1&item=needle_decompression"
  "T-04_procedure_qr_display|http://127.0.0.1:$PORT/qr-generator?tab=procedure"
  "T-05_medical_item_qr_display|http://127.0.0.1:$PORT/qr-generator?tab=item"
)

for ITEM in "${TS_PAGES[@]}"; do
  ID="${ITEM%%|*}"
  URL="${ITEM##*|}"
  OUT_RAW="$TS_RAW_DIR/${ID}.png"
  OUT_MOCKUP="$TS_MOCKUP_DIR/${ID}_mockup.png"
  echo "  Capturing $ID..."
  "$CHROME" "${CHROME_FLAGS[@]}" \
    --user-data-dir="/tmp/cd_${ID}" \
    --window-size=480,932 \
    --force-device-scale-factor=2 \
    --screenshot="$OUT_RAW" \
    "$URL" > /dev/null 2>&1 || true

  if [ -f "$OUT_RAW" ]; then
    IMG_URL="file://$OUT_RAW"
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
echo "=========================================================="
echo " [3/3] Controller Screens (Desktop 1920x1080)"
echo "=========================================================="

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
echo "All v3.7.2 screens and mockups generated successfully!"
