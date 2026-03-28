import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 手技名称からIDへのマッピング（既知のもの）
const KNOWN_TREATMENTS = {
  'バイタルサイン測定': 'vitals',
  'バイタル': 'vitals',
  '頭頸部診察': 'head_and_neck',
  '胸部診察': 'chest',
  '腹部骨盤診察': 'abdomen_and_pelvis',
  '腹部・骨盤診察': 'abdomen_and_pelvis',
  '四肢診察': 'limbs',
  'FAST': 'fast',
  'AMPLE': 'ample',
  '背景聴取': 'background',
  '酸素投与': 'oxygen',
  '末梢静脈路確保': 'iv_access',
  '輸液': 'iv_fluid',
  '気管挿管': 'intubation',
  '胸腔ドレーン': 'chest_tube',
  '骨盤固定': 'pelvic_binder',
  '止血帯': 'tourniquet',
  '創処置': 'wound_care',
  'エコー': 'echo',
  'X線': 'xray',
  'CT': 'ct',
  '血液検査': 'blood_test',
  '輸血': 'blood_transfusion',
  '心電図': 'ecg',
  '除細動': 'defibrillation',
  'CPR': 'cpr'
}

function parseCSV(csvText) {
  const rows = []
  let row = []
  let currentVal = ''
  let insideQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    if (char === '"') {
      if (insideQuotes && csvText[i + 1] === '"') {
        currentVal += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(currentVal.trim())
      currentVal = ''
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++
      }
      row.push(currentVal.trim())
      rows.push(row)
      row = []
      currentVal = ''
    } else {
      currentVal += char
    }
  }
  
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim())
    rows.push(row)
  }

  const headers = rows[0]
  const data = []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length <= 1 && !rows[i][0]) continue // Skip empty rows
    const obj = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j] || ''
    }
    data.push(obj)
  }
  return data
}

function generateTreatmentId(name) {
  const cleanName = name.replace(/[\n\r]/g, '').trim()
  if (!cleanName) return null
  if (KNOWN_TREATMENTS[cleanName]) {
    return KNOWN_TREATMENTS[cleanName]
  }
  // 未知の手技の場合は英数字の簡易ハッシュを作るか、名前をエンコードする
  // 今回は簡易的に 'trt_' + ランダムな英数字
  return 'trt_' + Buffer.from(cleanName).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toLowerCase()
}

function parseTreatments(treatmentsStr) {
  if (!treatmentsStr) return []
  // 「、」または改行で分割
  const parts = treatmentsStr.split(/[、\n\r]/)
  const results = []
  for (const p of parts) {
    const name = p.trim()
    if (!name) continue
    const id = generateTreatmentId(name)
    if (id) {
      results.push({
        treatment_id: id,
        treatment_name: name,
        lock_timer_minutes: 0 // デフォルト値。必要に応じてマッピング
      })
    }
  }
  // 重複排除
  const unique = []
  const ids = new Set()
  for (const r of results) {
    if (!ids.has(r.treatment_id)) {
      unique.push(r)
      ids.add(r.treatment_id)
    }
  }
  return unique
}

async function main() {
  const inputPath = path.join(__dirname, 'patients.csv')
  const outputPath = path.join(__dirname, '../src/data/mockPatients.ts')

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found at ${inputPath}`)
    console.log('Please place your exported Google Sheet as "patients.csv" in the "scripts" folder.')
    process.exit(1)
  }

  console.log('Reading CSV file...')
  const csvContent = fs.readFileSync(inputPath, 'utf8')
  
  const rawData = parseCSV(csvContent)
  const mockPatients = []

  let nextId = 1
  for (const row of rawData) {
    // 必須チェック
    if (!row['患者氏名']) continue

    const id = parseInt(row['管理番号'], 10) || nextId++
    
    // 性別のパース
    let gender = 'M'
    const gStr = row['性別']
    if (gStr && (gStr.includes('女') || gStr === 'F')) {
      gender = 'F'
    }

    mockPatients.push({
      id: id,
      name: row['患者氏名'] || `患者_${id}`,
      age: parseInt(row['年齢'], 10) || 50,
      gender: gender,
      triage_color: '黒', // 指示により元データを反映しないが、型制約上ダミー設定
      vitals_triage: row['トリアージエリアV/S'] || '',
      vitals_initial: row['各診療エリアV/S'] || '',
      vitals_post: row['処置後V/S'] || '',
      findings: {
        head_and_neck: row['頭部・顔面・頸部'] || '',
        chest: row['胸部'] || '',
        abdomen_and_pelvis: row['腹部・骨盤'] || '',
        limbs: row['四肢'] || '',
        fast: row['FAST'] || '',
        ample: row['AMPLE'] || '',
        background: row['生活歴・家族情報'] || ''
      },
      diagnosis: row['診断名'] || '',
      required_treatments: parseTreatments(row['必要検査・安定処置']),
      
      // 動的ステータス初期値
      status: '初期状態',
      assessment_completed: false,
      timer_started_at: null,
      timer_duration_ms: null,
      applied_treatment_id: null,
      completed_treatments: []
    })
  }

  const outputContent = `// 自動生成ファイル (scripts/importCsv.mjs により生成)
// 更新日: ${new Date().toLocaleString()}
import { Patient } from '../types/patient'

export const mockPatients: Patient[] = ${JSON.stringify(mockPatients, null, 2)}
`

  fs.writeFileSync(outputPath, outputContent, 'utf8')
  console.log(`Successfully generated ${mockPatients.length} patients!`)
  console.log(`Saved to: ${outputPath}`)
}

main().catch(console.error)
