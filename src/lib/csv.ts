import { Patient, VitalSignStruct } from '../types/patient'

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

// 構造化V/S → テキスト変換ユーティリティ
function structToText(s: VitalSignStruct | undefined): string {
    if (!s) return ''
    const parts = [
        (s.sbp || s.dbp) ? `BP ${s.sbp}/${s.dbp}` : null,
        s.hr   ? `HR ${s.hr}`          : null,
        s.rr   ? `RR ${s.rr}`          : null,
        s.spo2 ? `SpO2 ${s.spo2}%`     : null,
        s.temp ? `Temp ${s.temp}℃`     : null,
        (s.jcs !== undefined && s.jcs !== null) ? `JCS ${s.jcs}` : null,
    ].filter(Boolean)
    return parts.join(', ')
}

// CSVセルのエスケープ
function escapeCSV(str: string | number | undefined | null): string {
    if (str === null || str === undefined) return '""'
    const safeStr = String(str).replace(/"/g, '""')
    return `"${safeStr}"`
}

// ------------------------------------------------------------------
// マスターCSV雛形生成（現在のPatient型に合わせた完全対応版）
// セッション中でない場合にダウンロードされる「患者雛形CSV」として使用
// ------------------------------------------------------------------
export function exportMasterCSV(patients: Patient[]): string {
    // ヘッダー列定義（Patient型の全フィールドに対応）
    const headers = [
        '管理番号',
        '患者氏名',
        '年齢',
        '性別',
        '想定トリアージ区分',
        '現場トリアージ区分',
        // 構造化V/S（トリアージ時）
        'トリアージ時_SBP', 'トリアージ時_DBP', 'トリアージ時_HR',
        'トリアージ時_RR', 'トリアージ時_SpO2', 'トリアージ時_Temp', 'トリアージ時_JCS',
        // 構造化V/S（初期評価時）
        '初期評価時_SBP', '初期評価時_DBP', '初期評価時_HR',
        '初期評価時_RR', '初期評価時_SpO2', '初期評価時_Temp', '初期評価時_JCS',
        // 身体所見
        '頭頸部所見',
        '胸部所見',
        '腹部・骨盤所見',
        '四肢所見',
        'FAST所見',
        'AMPLE',
        '背景（負傷機転）',
        // 診断・方針
        '診断名',
        '必要検査・安定処置',
        '方針',
        // アクター情報
        '演技・痛がり方アドバイス',
        // 画像・採血
        '画像URL（カンマ区切り）',
        '血液検査データ',
        // 必要処置（最大5件）
        '処置名_1', '拘束時間分_1',
        '処置名_2', '拘束時間分_2',
        '処置名_3', '拘束時間分_3',
        '処置名_4', '拘束時間分_4',
        '処置名_5', '拘束時間分_5',
        // 悪化シナリオ
        '悪化シナリオ有効',
        '悪化到達時間（分）',
        '悪化目標_SBP', '悪化目標_DBP', '悪化目標_HR',
        '悪化目標_RR', '悪化目標_SpO2', '悪化目標_Temp', '悪化目標_JCS',
        'ROSC可能',
        'ROSC目標_SBP', 'ROSC目標_DBP', 'ROSC目標_HR',
        'ROSC目標_RR', 'ROSC目標_SpO2', 'ROSC目標_Temp',
    ]

    const rows = patients.map(p => {
        const vs_t = p.vitals_triage_struct
        const vs_i = p.vitals_initial_struct
        const vs_p = p.vitals_post_struct
        const vs_r = p.vitals_rosc_struct
        const treatments = p.required_treatments || []

        // 処置を最大5件まで展開
        const treatmentCells: string[] = []
        for (let i = 0; i < 5; i++) {
            const rt = treatments[i]
            treatmentCells.push(rt ? rt.treatment_name : '')
            treatmentCells.push(rt ? String(rt.lock_timer_minutes) : '')
        }

        const row = [
            p.id,
            p.name,
            p.age,
            p.gender === 'M' ? '男性(M)' : '女性(F)',
            p.triage_color,
            p.scene_triage_color || '',
            // トリアージ時V/S
            vs_t?.sbp  ?? '', vs_t?.dbp  ?? '', vs_t?.hr   ?? '',
            vs_t?.rr   ?? '', vs_t?.spo2 ?? '', vs_t?.temp ?? '', vs_t?.jcs ?? '',
            // 初期評価時V/S
            vs_i?.sbp  ?? '', vs_i?.dbp  ?? '', vs_i?.hr   ?? '',
            vs_i?.rr   ?? '', vs_i?.spo2 ?? '', vs_i?.temp ?? '', vs_i?.jcs ?? '',
            // 所見
            p.findings?.head_and_neck     || '',
            p.findings?.chest             || '',
            p.findings?.abdomen_and_pelvis || '',
            p.findings?.limbs             || '',
            p.findings?.fast              || '',
            p.findings?.ample             || '',
            p.findings?.background        || '',
            // 診断・方針
            p.diagnosis             || '',
            p.necessary_tests_and_treatments || '',
            p.policy                || '',
            // アクター
            p.acting_instructions   || '',
            // 画像・採血
            (p.image_urls || []).join(','),
            p.blood_test_data       || '',
            // 処置（最大5件）
            ...treatmentCells,
            // 悪化シナリオ
            p.deterioration_enabled ? '有効' : '無効',
            p.deterioration_time_minutes ?? 30,
            vs_p?.sbp  ?? '', vs_p?.dbp  ?? '', vs_p?.hr   ?? '',
            vs_p?.rr   ?? '', vs_p?.spo2 ?? '', vs_p?.temp ?? '', vs_p?.jcs ?? '',
            p.rosc_possible ? '可能' : '不可',
            vs_r?.sbp  ?? '', vs_r?.dbp  ?? '', vs_r?.hr   ?? '',
            vs_r?.rr   ?? '', vs_r?.spo2 ?? '', vs_r?.temp ?? '',
        ]
        return row.map(cell => escapeCSV(cell as string)).join(',')
    })

    return '\uFEFF' + [headers.join(','), ...rows].join('\n') // BOM付きUTF-8でExcelで文字化けしない
}

// ------------------------------------------------------------------
// 訓練結果の振り返り用CSV（セッション中に使う従来のexportCSV）
// ------------------------------------------------------------------
export function exportCSV(patients: Patient[]): string {
    const headers = [
        '管理番号', '患者氏名', '年齢', '性別', '想定トリアージ区分', '現場トリアージ区分', '診断名',
        '現在ステータス', 'トリアージ完了日時', '初期V/S完了日時', 
        '処置済み項目', '画像検査実施', '血液検査実施', 
        '初期V/S_SBP', '初期V/S_DBP', '初期V/S_HR', '初期V/S_RR', '初期V/S_SpO2', '初期V/S_Temp', '初期V/S_JCS',
        '最新V/S(テキスト)'
    ]

    const formatTime = (ms?: number | null) => {
        if (!ms) return ''
        const d = new Date(ms)
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
    }

    const rows = patients.map(p => {
        const vs_i = p.vitals_initial_struct
        const row = [
            p.id,
            p.name,
            p.age,
            p.gender === 'M' ? '男性' : '女性',
            p.triage_color,
            p.scene_triage_color || '',
            p.diagnosis || '',
            p.status,
            formatTime(p.triage_time_ms),
            formatTime(p.initial_vs_time_ms),
            p.completed_treatments?.join(',') || 'なし',
            p.tests_completed ? '済' : '未',
            p.stabilization_completed ? '済' : '未',
            vs_i?.sbp ?? '', vs_i?.dbp ?? '', vs_i?.hr ?? '',
            vs_i?.rr ?? '', vs_i?.spo2 ?? '', vs_i?.temp ?? '', vs_i?.jcs ?? '',
            // ログ用に改行を空白に変換
            (structToText(p.vitals_initial_struct) || p.vitals_initial || '').replace(/\n/g, ' ')
        ]
        return row.map(cell => escapeCSV(cell as string)).join(',')
    })

    return '\uFEFF' + [headers.join(','), ...rows].join('\n')
}

// ------------------------------------------------------------------
// CSVインポート用: CSVデータをPatient[]にマッピング
// ------------------------------------------------------------------
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

        const triageStr = data['想定トリアージ区分'] || data['トリアージ区分'] || '緑'
        const triage_color: '赤' | '黄' | '緑' | '黒' =
            triageStr.includes('赤') ? '赤' :
            triageStr.includes('黄') ? '黄' :
            triageStr.includes('黒') ? '黒' : '緑'

        const sceneTriageStr = data['現場トリアージ区分'] || ''
        const scene_triage_color: '赤' | '黄' | '緑' | '黒' | undefined =
            sceneTriageStr.includes('赤') ? '赤' :
            sceneTriageStr.includes('黄') ? '黄' :
            sceneTriageStr.includes('黒') ? '黒' :
            sceneTriageStr.includes('緑') ? '緑' : undefined

        // 構造化V/Sのパース（新フォーマット優先、なければフリーテキストから推定）
        const parseNum = (s: string) => (s && s !== '') ? (parseFloat(s) || 0) : 0

        const vitals_triage_struct = data['トリアージ時_SBP'] ? {
            sbp:  parseNum(data['トリアージ時_SBP']),
            dbp:  parseNum(data['トリアージ時_DBP']),
            hr:   parseNum(data['トリアージ時_HR']),
            rr:   parseNum(data['トリアージ時_RR']),
            spo2: parseNum(data['トリアージ時_SpO2']),
            temp: parseNum(data['トリアージ時_Temp']) || 36.5,
            jcs:  parseNum(data['トリアージ時_JCS']),
        } : undefined

        const vitals_initial_struct = data['初期評価時_SBP'] ? {
            sbp:  parseNum(data['初期評価時_SBP']),
            dbp:  parseNum(data['初期評価時_DBP']),
            hr:   parseNum(data['初期評価時_HR']),
            rr:   parseNum(data['初期評価時_RR']),
            spo2: parseNum(data['初期評価時_SpO2']),
            temp: parseNum(data['初期評価時_Temp']) || 36.5,
            jcs:  parseNum(data['初期評価時_JCS']),
        } : undefined

        const vitals_post_struct = data['悪化目標_SBP'] ? {
            sbp:  parseNum(data['悪化目標_SBP']),
            dbp:  parseNum(data['悪化目標_DBP']),
            hr:   parseNum(data['悪化目標_HR']),
            rr:   parseNum(data['悪化目標_RR']),
            spo2: parseNum(data['悪化目標_SpO2']),
            temp: parseNum(data['悪化目標_Temp']) || 36.5,
            jcs:  parseNum(data['悪化目標_JCS']),
        } : undefined

        const vitals_rosc_struct = (data['ROSC可能'] === '可能' && data['ROSC目標_SBP']) ? {
            sbp:  parseNum(data['ROSC目標_SBP']),
            dbp:  parseNum(data['ROSC目標_DBP']),
            hr:   parseNum(data['ROSC目標_HR']),
            rr:   parseNum(data['ROSC目標_RR']),
            spo2: parseNum(data['ROSC目標_SpO2']),
            temp: parseNum(data['ROSC目標_Temp']) || 36.5,
        } : undefined

        // 処置は処置名_1〜5列から読み取る
        const required_treatments = []
        for (let j = 1; j <= 5; j++) {
            const name = data[`処置名_${j}`]
            const time = data[`拘束時間分_${j}`]
            if (name && name.trim()) {
                required_treatments.push({
                    treatment_id: `custom_${j}_${Date.now()}`,
                    treatment_name: name.trim(),
                    lock_timer_minutes: parseInt(time) || 5,
                })
            }
        }

        const patient: Patient = {
            id: Math.max(0, parseInt(data['管理番号'], 10) || Date.now() + i),
            name: data['患者氏名'] || '名称未設定',
            age: Math.max(0, parseInt(data['年齢'], 10) || 0),
            gender: (data['性別'] || '').includes('F') || (data['性別'] || '').includes('女') ? 'F' : 'M',
            triage_color,
            scene_triage_color,
            vitals_triage: vitals_triage_struct ? structToText(vitals_triage_struct) : '',
            vitals_initial: vitals_initial_struct ? structToText(vitals_initial_struct) : '',
            vitals_post: vitals_post_struct ? structToText(vitals_post_struct) : '',
            vitals_triage_struct,
            vitals_initial_struct,
            vitals_post_struct,
            vitals_rosc_struct,
            findings: {
                head_and_neck:       data['頭頸部所見']        || '',
                chest:               data['胸部所見']          || '',
                abdomen_and_pelvis:  data['腹部・骨盤所見']    || '',
                limbs:               data['四肢所見']          || '',
                fast:                data['FAST所見']          || '',
                ample:               data['AMPLE']             || '',
                background:          data['背景（負傷機転）']  || '',
            },
            diagnosis:                      data['診断名']                      || '',
            necessary_tests_and_treatments: data['必要検査・安定処置']          || '',
            policy:                         data['方針']                        || '',
            acting_instructions:            data['演技・痛がり方アドバイス']    || '',
            image_urls: data['画像URL（カンマ区切り）']
                ? data['画像URL（カンマ区切り）'].split(',').map(s => s.trim()).filter(Boolean)
                : [],
            blood_test_data: data['血液検査データ'] || '',
            required_treatments,
            deterioration_enabled:       data['悪化シナリオ有効'] === '有効',
            deterioration_time_minutes:  parseInt(data['悪化到達時間（分）']) || 30,
            rosc_possible:               data['ROSC可能'] === '可能',
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
