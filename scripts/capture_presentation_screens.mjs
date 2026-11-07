import { spawn } from 'node:child_process'
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

// 1. 静的ファイルサーバー (SPA対応)
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

const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0]
    let filePath = path.join(DIST_DIR, reqPath)

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
    } else {
        // SPAフォールバック (index.html)
        const indexPath = path.join(DIST_DIR, 'index.html')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        fs.createReadStream(indexPath).pipe(res)
    }
})

const PORT = 3344
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve))
console.log(`[HTTP Server] Listening on http://127.0.0.1:${PORT}`)

// 2. Google Chrome を CDP モードで起動
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const USER_DATA_DIR = '/tmp/chrome_lecture_capture_' + Date.now()
const CDP_PORT = 9222

const chromeProc = spawn(CHROME_PATH, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--window-size=600,1100',
    '--no-proxy-server',
    '--hide-scrollbars',
    'about:blank',
], { stdio: 'ignore' })

// CDP エンドポイントの待機
let wsUrl = null
for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300))
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`)
        const data = await res.json()
        if (data && data[0] && data[0].webSocketDebuggerUrl) {
            wsUrl = data[0].webSocketDebuggerUrl
            break
        }
    } catch (e) {
        // wait
    }
}

if (!wsUrl) {
    console.error('Failed to connect to Chrome CDP')
    chromeProc.kill()
    server.close()
    process.exit(1)
}

console.log('[CDP] Connected to Chrome:', wsUrl)

// CDP RPC クライアント
class CdpClient {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl)
        this.id = 1
        this.callbacks = new Map()
        this.ready = new Promise((resolve) => {
            this.ws.onopen = resolve
        })
        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            if (msg.id && this.callbacks.has(msg.id)) {
                const { resolve, reject } = this.callbacks.get(msg.id)
                this.callbacks.delete(msg.id)
                if (msg.error) reject(msg.error)
                else resolve(msg.result)
            }
        }
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = this.id++
            this.callbacks.set(id, { resolve, reject })
            this.ws.send(JSON.stringify({ id, method, params }))
        })
    }

    close() {
        this.ws.close()
    }
}

const cdp = new CdpClient(wsUrl)
await cdp.ready

// スマホ (iPhone 15/16 Pro相当: 393x852, DPR=2) 設定
await cdp.send('Page.enable')
await cdp.send('DOM.enable')
await cdp.send('Runtime.enable')
await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 393,
    height: 852,
    deviceScaleFactor: 2,
    mobile: true,
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// 撮影タスク定義
const tasks = [
    {
        name: '01_launcher_top',
        title: '01. 起動・ランチャー画面',
        url: `http://127.0.0.1:${PORT}/`,
        action: async () => {
            // 初期状態
            await wait(1500)
        }
    },
    {
        name: '02_session_select',
        title: '02. セッション選択モーダル',
        url: `http://127.0.0.1:${PORT}/`,
        action: async () => {
            await wait(1000)
            // 「訓練スタート」ボタンをクリック
            await cdp.send('Runtime.evaluate', {
                expression: `document.getElementById('btn-training-start')?.click();`
            })
            await wait(1200)
        }
    },
    {
        name: '03_role_select',
        title: '03. ロール選択画面',
        url: `http://127.0.0.1:${PORT}/role-select?session_id=session-2026-demo`,
        action: async () => {
            await wait(1800)
        }
    },
    {
        name: '04_qr_scanner',
        title: '04. QRスキャナー画面（カメラ・手動入力切替）',
        url: `http://127.0.0.1:${PORT}/training?session_id=session-2026-demo`,
        action: async () => {
            // ロールを設定
            await cdp.send('Runtime.evaluate', {
                expression: `localStorage.setItem('disaster_user_role', 'doctor');`
            })
            await wait(1800)
        }
    },
    {
        name: '05_triage_assessment',
        title: '05. トリアージ評価画面（赤黄緑黒・バイタル確認）',
        url: `http://127.0.0.1:${PORT}/training/triage-patient/1?session_id=session-2026-demo`,
        action: async () => {
            await wait(2200)
        }
    },
    {
        name: '06_patient_detail',
        title: '06. 患者詳細画面（バイタル・所見・処置ボタン）',
        url: `http://127.0.0.1:${PORT}/training/patient/1?session_id=session-2026-demo`,
        action: async () => {
            await wait(2200)
        }
    },
    {
        name: '07_treatment_scan',
        title: '07. 処置スキャン画面（処置カードQR読取・実施）',
        url: `http://127.0.0.1:${PORT}/training/treatment-scan/1?session_id=session-2026-demo`,
        action: async () => {
            await wait(2000)
        }
    },
    {
        name: '08_radiology_scan',
        title: '08. 画像検査（放射線）スキャン画面',
        url: `http://127.0.0.1:${PORT}/training/radiology?session_id=session-2026-demo`,
        action: async () => {
            await wait(2000)
        }
    },
    {
        name: '09_lab_scan',
        title: '09. 検体検査スキャン画面',
        url: `http://127.0.0.1:${PORT}/training/lab?session_id=session-2026-demo`,
        action: async () => {
            await wait(2000)
        }
    },
    {
        name: '10_patient_actor',
        title: '10. 患者役アクター画面（呼吸・脈拍アニメ・演技指示）',
        url: `http://127.0.0.1:${PORT}/training/actor/1?session_id=session-2026-demo`,
        action: async () => {
            await wait(2200)
        }
    }
]

console.log('[Capture] Starting raw screenshots capture...')

for (const task of tasks) {
    console.log(`[Capture] -> ${task.title}...`)
    await cdp.send('Page.navigate', { url: task.url })
    await task.action()

    const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
    })

    const rawPath = path.join(RAW_DIR, `${task.name}.png`)
    fs.writeFileSync(rawPath, Buffer.from(data, 'base64'))
    console.log(`  Saved raw: ${rawPath}`)
}

console.log('[Capture] All raw screenshots captured!')

// 3. 美しいスマホモックアップ枠（Device Frame）の合成
console.log('[Mockup] Generating device mockups with sleek iPhone frame...')

// モックアップ用の一時HTMLを配置
const mockupHtmlPath = path.join('/tmp', 'phone_mockup_template.html')

function generateMockupHtml(imgBase64) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: transparent;
    width: 520px;
    height: 980px;
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
      0 0 0 10px #1c1c1e,
      0 0 0 11px rgba(255, 255, 255, 0.15),
      0 30px 70px rgba(0, 0, 0, 0.55);
    overflow: hidden;
  }
  .screen-img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    border-radius: 46px;
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
    box-shadow: inset 0 0 2px rgba(255,255,255,0.1);
  }
  .dynamic-island__sensor {
    width: 11px;
    height: 11px;
    background: #0d0d15;
    border-radius: 50%;
    border: 1px solid #1a1a2e;
  }
  .dynamic-island__camera {
    width: 11px;
    height: 11px;
    background: #080812;
    border-radius: 50%;
    border: 1px solid #141424;
    position: relative;
  }
  .dynamic-island__camera::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 3px;
    height: 3px;
    background: rgba(30, 80, 180, 0.6);
    border-radius: 50%;
  }
  /* Home indicator bar */
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
    height: 50%;
    background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%);
    pointer-events: none;
    border-top-left-radius: 46px;
    border-top-right-radius: 46px;
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

// モックアップ撮影用にウィンドウサイズを変更 (520x980, DPR=2)
await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 520,
    height: 980,
    deviceScaleFactor: 2,
    mobile: false,
})

for (const task of tasks) {
    const rawPath = path.join(RAW_DIR, `${task.name}.png`)
    if (!fs.existsSync(rawPath)) continue

    const rawBase64 = 'data:image/png;base64,' + fs.readFileSync(rawPath).toString('base64')
    const htmlContent = generateMockupHtml(rawBase64)
    fs.writeFileSync(mockupHtmlPath, htmlContent)

    await cdp.send('Page.navigate', { url: `file://${mockupHtmlPath}` })
    await wait(400)

    const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
        fromSurface: true,
    })

    const mockupPath = path.join(MOCKUP_DIR, `${task.name}_mockup.png`)
    fs.writeFileSync(mockupPath, Buffer.from(data, 'base64'))
    console.log(`  Saved mockup: ${mockupPath}`)
}

console.log('[Complete] All device mockups generated successfully!')

cdp.close()
chromeProc.kill()
server.close()
process.exit(0)
