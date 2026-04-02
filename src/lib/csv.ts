import { Patient } from '../types/patient'
import { mockPatients } from '../data/mockData'

// カスタムCSVパーサー（外部ライブラリ不要で軽量・高速）
export function parseCSV(csvText: string): string[][] {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentCell = ''
    let insideQuotes = false

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i]
        const nextChar = csvText[i + 1]

        if (char === '"' && insideQuotes && nextChar === '"') {
            // エスケープされたダブルクォート
            currentCell += '"'
            i++ // 次のクォートをスキップ
        } else if (char === '"') {
            // クォートの開始/終了
            insideQuotes = !insideQuotes
        } else if (char === ',' && !insideQuotes) {
            // セルの区切り
            currentRow.push(currentCell)
            currentCell = ''
        } else if ((char === '\r' && nextChar === '\n') || char === '\n' || char === '\r') {
            if (!insideQuotes) {
                // 行の区切り
                currentRow.push(currentCell)
                rows.push(currentRow)
                currentRow = []
                currentCell = ''
                if (char === '\r' && nextChar === '\n') i++ // \r\nの\nをスキップ
            } else {
                currentCell += char
            }
        } else {
            currentCell += char
        }
    }

    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell)
        rows.push(currentRow)
    }

    return rows.filter(row => row.some(cell => cell.trim() !== '')) // 空行を除外
}

// 数値抽出ユーティリティ（V/Sから数値を安全に取り出す）
function extractNumber(text: string | undefined): number | null {
    if (!text) return null
    const match = text.match(/\d+(\.\d+)?/)
    return match ? parseFloat(match[0]) : null
}

// 血圧抽出ユーティリティ ("120/80" のような形式に対応)
function extractBP(text: string | undefined): { sbp: number | null, dbp: number | null } {
    if (!text) return { sbp: null, dbp: null }
    const match = text.match(/(\d+)\s*\/\s*(\d+)/)
    if (match) {
        return { sbp: parseFloat(match[1]), dbp: parseFloat(match[2]) }
    }
    // スラッシュがない場合は最初の数値をsbpにする
    const num = extractNumber(text)
    return { sbp: num, dbp: null }
}

export function mapCSVToPatients(csvRows: string[][]): Patient[] {
    if (csvRows.length < 2) return []

    const headers = csvRows[0].map(h => h.trim())
    const patients: Patient[] = []

    for (let i = 1; i < csvRows.length; i++) {
        const row = csvRows[i]
        const data: Record<string, string> = {}
        headers.forEach((header, index) => {
            data[header] = row[index] || ''
        })

        // idがなければスキップ
        if (!data['管理番号']) continue

        const triageStr = data['トリアージ区分'] || '緑'
        const triage_color = triageStr.includes('赤') ? '赤' :
                             triageStr.includes('黄') ? '黄' :
                             triageStr.includes('黒') ? '黒' : '緑'

        const vInitialStr = data['各診療エリアV/S'] || ''
        const bpInitial = extractBP(vInitialStr.match(/bp[:：]?\s*[\d/]+/i)?.[0])

        const patientId = parseInt(data['管理番号'], 10) || Date.now() + i
        const defaultMatch = mockPatients.find(m => m.id === patientId)

        const patient: Patient = {
            id: patientId,
            name: data['患者氏名'] || '名称未設定',
            age: parseInt(data['年齢'], 10) || 0,
            gender: (data['性別'] || '').includes('F') || (data['性別'] || '').includes('女') ? 'F' : 'M',
            triage_color,
            vitals_triage: data['トリアージエリアV/S'] || '',
            vitals_initial: vInitialStr,
            vitals_post: data['処置後V/S'] || '',
            
            // 線形悪化用初期値（簡易パース）
            vitals_initial_struct: {
                sbp: bpInitial.sbp ?? 120,
                dbp: bpInitial.dbp ?? 80,
                hr: extractNumber(vInitialStr.match(/hr[:：]?\s*\d+/i)?.[0]) ?? 80,
                rr: extractNumber(vInitialStr.match(/r[:：]?\s*\d+/i)?.[0]) ?? 16,
                spo2: extractNumber(vInitialStr.match(/spo2[:：]?\s*\d+/i)?.[0]) ?? 98,
                temp: extractNumber(vInitialStr.match(/kt[:：]?\s*[\d.]+/i)?.[0]) ?? 36.5,
            },

            findings: {
                head_and_neck: data['頭部・顔面・頸部'] || '',
                chest: data['胸部'] || '',
                abdomen_and_pelvis: data['腹部・骨盤'] || '',
                limbs: data['四肢'] || '',
                fast: data['FAST'] || '',
                ample: data['AMPLE'] || '',
                background: data['生活歴・家族情報'] || '',
            },
            diagnosis: data['診断名'] || '',
            required_treatments: defaultMatch ? (defaultMatch.required_treatments || []) : [],
            
            // 新規項目
            necessary_tests_and_treatments: data['必要検査・安定処置'] || '',
            policy: data['方針'] || '',
            image_urls: data['画像'] ? data['画像'].split(',').map(s => s.trim()) : [],
            blood_test_data: data['血液検査データ'] || '',
            acting_instructions: data['演技内容'] || '',

            status: '初期状態',
            assessment_completed: false,
            timer_started_at: null,
            timer_duration_ms: null,
            applied_treatment_id: null,
        }

        patients.push(patient)
    }

    return patients
}

// 訓練結果の出力用CSV生成
export function exportCSV(patients: Patient[]): string {
    const headers = [
        '管理番号', '患者氏名', '年齢', '性別', 'トリアージ区分',
        '現在ステータス', '処置済み項目', '画像検査実施', '血液検査実施', '最終バイタルサイン'
    ]

    const escapeCSV = (str: string | undefined | null) => {
        if (!str) return '""'
        const safeStr = String(str).replace(/"/g, '""')
        return `"${safeStr}"`
    }

    const rows = patients.map(p => {
        const row = [
            p.id,
            p.name,
            p.age,
            p.gender === 'M' ? '男性' : '女性',
            p.triage_color,
            p.status,
            p.completed_treatments?.join(',') || 'なし',
            p.tests_completed ? '済' : '未',
            p.stabilization_completed ? '済' : '未',
            // ログ用に改行を空白に変換
            (p.vitals_initial || '').replace(/\n/g, ' ')
        ]
        return row.map(cell => escapeCSV(cell as string)).join(',')
    })

    return [headers.join(','), ...rows].join('\n')
}
