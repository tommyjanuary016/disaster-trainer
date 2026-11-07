import { execSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../..')
const DIST_DIR = path.resolve(__dirname, '../dist')
const OUT_DIR = path.resolve(ROOT_DIR, 'lecture_materials')
const RAW_DIR = path.resolve(OUT_DIR, 'raw_screens')
const MOCKUP_DIR = path.resolve(OUT_DIR, 'device_mockups')

fs.mkdirSync(RAW_DIR, { recursive: true })
fs.mkdirSync(MOCKUP_DIR, { recursive: true })

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
}

// 1. 静的ファイルサーバー (SPA対応)
const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0]
    let filePath = path.join(DIST_DIR, reqPath)

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
    } else {
        const indexPath = path.join(DIST_DIR, 'index.html')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        fs.createReadStream(indexPath).pipe(res)
    }
})

const PORT = 4321
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve))
console.log(`[HTTP Server] Running on http://127.0.0.1:${PORT}`)

const CHROME = '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"'
const USER_DATA = `/tmp/cdata_lecture_${Date.now()}`

const screens = [
    { id: '01_launcher_top', title: '01. 起動・ランチャー画面', url: `http://127.0.0.1:${PORT}/` },
    { id: '02_session_select', title: '02. セッション選択モーダル', url: `http://127.0.0.1:${PORT}/?select_session=1` },
    { id: '03_role_select', title: '03. ロール選択画面', url: `http://127.0.0.1:${PORT}/role-select?session_id=session-2026-demo` },
    { id: '04_qr_scanner', title: '04. QRコードスキャナー画面', url: `http://127.0.0.1:${PORT}/training?session_id=session-2026-demo` },
    { id: '05_triage_patient', title: '05. トリアージ判定・評価画面', url: `http://127.0.0.1:${PORT}/training/triage-patient/1?session_id=session-2026-demo` },
    { id: '06_patient_detail_pelvic', title: '06. 患者詳細画面（骨盤骨折・バイタル）', url: `http://127.0.0.1:${PORT}/training/patient/1?session_id=session-2026-demo` },
    { id: '07_patient_detail_pneumo', title: '07. 患者詳細画面（緊張性気胸・重症例）', url: `http://127.0.0.1:${PORT}/training/patient/2?session_id=session-2026-demo` },
    { id: '08_treatment_scan', title: '08. 処置QRスキャン画面', url: `http://127.0.0.1:${PORT}/training/treatment-scan/1?session_id=session-2026-demo` },
    { id: '09_radiology_scan', title: '09. 画像検査（放射線）画面', url: `http://127.0.0.1:${PORT}/training/radiology?session_id=session-2026-demo` },
    { id: '10_lab_scan', title: '10. 検体検査画面', url: `http://127.0.0.1:${PORT}/training/lab?session_id=session-2026-demo` },
    { id: '11_patient_actor', title: '11. 模擬患者（アクター）専用画面', url: `http://127.0.0.1:${PORT}/training/actor/1?session_id=session-2026-demo` },
]

console.log('[Capture] Capturing raw mobile screens...')

for (const s of screens) {
    const rawOut = path.join(RAW_DIR, `${s.id}.png`)
    console.log(`  -> ${s.title}...`)
    try {
        const cmd = `${CHROME} --headless --no-sandbox --disable-gpu --user-data-dir=${USER_DATA} --window-size=393,852 --force-device-scale-factor=2 --virtual-time-budget=2000 --hide-scrollbars --screenshot=${rawOut} "${s.url}"`
        execSync(cmd, { stdio: 'pipe' })
        console.log(`     Saved raw: ${rawOut}`)
    } catch (e) {
        console.error(`     Failed capturing ${s.id}:`, e.message)
    }
}

// 2. スマホモックアップ枠（Device Frame）の合成
console.log('\n[Mockup] Generating sleek iPhone device mockups...')

function buildMockupHtml(imgBase64) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: transparent;
    width: 480px;
    height: 940px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  }
  .phone-frame {
    position: relative;
    width: 393px;
    height: 852px;
    border-radius: 54px;
    background: #000;
    box-shadow: 
      0 0 0 4px #2c2c2e,
      0 0 0 10px #18181a,
      0 0 0 11px rgba(255, 255, 255, 0.15),
      0 28px 65px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }
  .screen-img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    border-radius: 44px;
  }
  /* Dynamic Island */
  .dynamic-island {
    position: absolute;
    top: 11px;
    left: 50%;
    transform: translateX(-50%);
    width: 124px;
    height: 35px;
    background: #000;
    border-radius: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
  }
  .dynamic-island__sensor {
    width: 10px;
    height: 10px;
    background: #0a0a14;
    border-radius: 50%;
    border: 1px solid #141424;
  }
  .dynamic-island__camera {
    width: 10px;
    height: 10px;
    background: #06060c;
    border-radius: 50%;
    border: 1px solid #10101e;
    position: relative;
  }
  .dynamic-island__camera::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 3px;
    height: 3px;
    background: rgba(30, 80, 200, 0.5);
    border-radius: 50%;
  }
  /* Home indicator */
  .home-bar {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 134px;
    height: 5px;
    background: rgba(255, 255, 255, 0.55);
    border-radius: 3px;
    z-index: 1000;
  }
  /* Glass reflection */
  .glass-glare {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 45%;
    background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 65%);
    pointer-events: none;
    border-top-left-radius: 44px;
    border-top-right-radius: 44px;
    z-index: 999;
  }
</style>
</head>
<body>
  <div class="phone-frame">
    <div class="dynamic-island">
      <div class="dynamic-island__sensor"></div>
      <div class="dynamic-island__camera"></div>
    </div>
    <img class="screen-img" src="${imgBase64}" />
    <div class="glass-glare"></div>
    <div class="home-bar"></div>
  </div>
</body>
</html>`
}

const templatePath = '/tmp/device_mockup_template.html'

for (const s of screens) {
    const rawPath = path.join(RAW_DIR, `${s.id}.png`)
    if (!fs.existsSync(rawPath)) continue

    const base64Data = 'data:image/png;base64,' + fs.readFileSync(rawPath).toString('base64')
    fs.writeFileSync(templatePath, buildMockupHtml(base64Data))

    const mockupOut = path.join(MOCKUP_DIR, `${s.id}_mockup.png`)
    console.log(`  -> Device mockup for ${s.title}...`)
    try {
        const cmd = `${CHROME} --headless --no-sandbox --disable-gpu --user-data-dir=${USER_DATA} --window-size=480,940 --force-device-scale-factor=2 --virtual-time-budget=500 --default-background-color=00000000 --screenshot=${mockupOut} "file://${templatePath}"`
        execSync(cmd, { stdio: 'pipe' })
        console.log(`     Saved mockup: ${mockupOut}`)
    } catch (e) {
        console.error(`     Failed mockup for ${s.id}:`, e.message)
    }
}

console.log('\n[Done] All screenshots and device mockups created in lecture_materials/!')
server.close()
process.exit(0)
