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
        (s.gcs_e || s.gcs_v || s.gcs_m) ? `GCS E${s.gcs_e || 4}V${s.gcs_v || 5}M${s.gcs_m || 6}` : null,
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
// 解決策A: 診断名・トリアージ色から血液検査データを自動生成
// CSVの「血液検査データ」列が空欄の場合に呼び出される
// ------------------------------------------------------------------
export function generateDefaultBloodTestData(diagnosis: string, triage_color: string): string {
    const diag = diagnosis.toLowerCase()

    // 共通の重症度ベースライン
    const isRed    = triage_color === '赤'
    const isYellow = triage_color === '黄'

    // 診断名キーワードによる傷病パターン分類
    const isTraumaticBleed = /出血|骨折|骨盤|大腿|断裂|裂傷|挫創|外出血/.test(diag)
    const isChestInjury    = /気胸|血胸|肋骨|胸部外傷|肺挫傷/.test(diag)
    const isCrush          = /クラッシュ|挫滅|コンパートメント/.test(diag)
    const isHead           = /頭部|頭蓋|脳|硬膜/.test(diag)
    const isBurn           = /熱傷|火傷|吸入/.test(diag)
    const isSepsis         = /敗血症|感染/.test(diag)
    const isCardiac        = /心停止|心肺停止|心筋梗塞|心室細動/.test(diag)
    const isToxic          = /中毒|薬物|CO中毒/.test(diag)

    // ベースラインとなる正常値
    let wbc  = '9,800'
    let rbc  = '4.80'
    let hgb  = '14.2'
    let hct  = '42'
    let plt  = '18.5'
    let tp   = '7.2'
    let alb  = '4.1'
    let alt  = '28'
    let ast  = '24'
    let ldh  = '182'
    let tbil = '0.8'
    let bun  = '14'
    let cre  = '0.82'
    let na   = '139'
    let k    = '4.0'
    let cl   = '103'
    let cRP  = '0.3'
    let pt   = '100%'
    let aptt = '28.4'
    let fibr = '320'
    let ph   = '7.42'
    let pco2 = '39'
    let pO2  = '97'
    let hco3 = '25.2'
    let lac  = '1.2'
    let trop = '<0.01'
    let bn   = '<18'

    // 出血性外傷（赤タグ）
    if (isTraumaticBleed && isRed) {
        hgb = '6.8'; hct = '21'; rbc = '2.26'
        plt = '9.8'; pt = '48%'; aptt = '55.2'; fibr = '120'
        bun = '22'; cre = '1.20'
        ph = '7.15'; pco2 = '34'; hco3 = '11.8'; lac = '6.8'
        wbc = '14,200'
    } else if (isTraumaticBleed && isYellow) {
        hgb = '9.2'; hct = '28'; rbc = '3.01'
        plt = '14.2'; pt = '72%'; aptt = '38.1'; fibr = '210'
        lac = '3.1'; ph = '7.32'; hco3 = '18.4'
    }

    // 胸部外傷
    if (isChestInjury && isRed) {
        pO2 = '58'; pco2 = '52'; ph = '7.28'; hco3 = '16.2'; lac = '4.2'
        wbc = '12,800'; ast = '82'; alt = '44'
    } else if (isChestInjury && isYellow) {
        pO2 = '78'; pco2 = '44'; lac = '2.4'
    }

    // クラッシュ症候群
    if (isCrush) {
        cre = '3.40'; bun = '48'; k = '6.2'
        ldh = '2,840'; ast = '620'; alt = '380'; alb = '2.9'
        ph = '7.18'; hco3 = '12.4'; lac = '5.6'
        rbc = '3.12'; hgb = '8.6'
    }

    // 頭部外傷
    if (isHead) {
        na = '148'; k = '3.4'; bun = '20'
        if (isRed) { lac = '3.8'; ph = '7.30' }
    }

    // 熱傷・吸入外傷
    if (isBurn) {
        wbc = '18,200'; cRP = '12.4'; alb = '2.6'; tp = '5.1'
        bun = '28'; cre = '1.08'
        if (isRed) { hgb = '8.4'; hct = '25'; ph = '7.24'; pO2 = '62' }
    }

    // 敗血症
    if (isSepsis) {
        wbc = isRed ? '22,400' : '16,800'
        cRP = isRed ? '28.6' : '14.2'
        plt = isRed ? '6.2' : '12.0'; pt = isRed ? '38%' : '68%'
        lac = isRed ? '8.2' : '4.0'; ph = isRed ? '7.12' : '7.28'
        bun = '32'; cre = '1.80'; alb = '2.4'
    }

    // 心停止
    if (isCardiac) {
        ph = '6.98'; pco2 = '68'; hco3 = '8.6'; lac = '12.0'
        trop = '2.84'; k = '6.8'; cre = '1.60'
        wbc = '16,000'
    }

    // CO中毒など
    if (isToxic) {
        pO2 = '350 (高流量O2後)'; pco2 = '42'; ph = '7.38'
        lac = '3.6'; ast = '44'; alt = '38'
    }

    return [
        '【血算】',
        `WBC: ${wbc} /μL　RBC: ${rbc} × 10⁶/μL　Hgb: ${hgb} g/dL　Hct: ${hct}%　Plt: ${plt} × 10⁴/μL`,
        '',
        '【生化学】',
        `TP: ${tp} g/dL　Alb: ${alb} g/dL　T-Bil: ${tbil} mg/dL`,
        `AST: ${ast} IU/L　ALT: ${alt} IU/L　LDH: ${ldh} IU/L`,
        `BUN: ${bun} mg/dL　Cre: ${cre} mg/dL`,
        `Na: ${na} mEq/L　K: ${k} mEq/L　Cl: ${cl} mEq/L`,
        `CRP: ${cRP} mg/dL`,
        isCardiac ? `Troponin I: ${trop} ng/mL　BNP: ${bn} pg/mL` : '',
        '',
        '【凝固】',
        `PT: ${pt}　APTT: ${aptt} sec　Fibrinogen: ${fibr} mg/dL`,
        '',
        '【血液ガス（動脈血）】',
        `pH: ${ph}　PaCO₂: ${pco2} mmHg　PaO₂: ${pO2} mmHg　HCO₃⁻: ${hco3} mmol/L　Lac: ${lac} mmol/L`,
    ].filter(l => l !== '').join('\n')
}

// ------------------------------------------------------------------
// 解決策A: 診断名・triage_colorからFAST所見テキストを自動生成
// CSV「FAST所見」列が空欄の場合に呼び出される
// ------------------------------------------------------------------
export function generateDefaultFastFindings(diagnosis: string, triage_color: string): string {
    const diag = diagnosis.toLowerCase()

    const hasPelvicFracture  = /骨盤骨折|骨盤外傷/.test(diag)
    const hasAbdominalTrauma = /腹部外傷|肝裂傷|脾裂傷|腸間膜損傷|腹腔内出血/.test(diag)
    const hasChestTrauma     = /血胸|血気胸|心タンポナーデ|心嚢液/.test(diag)
    const hasCrush           = /クラッシュ|挫滅/.test(diag)

    const isRed = triage_color === '赤'

    // 異常なし（緑・黒・無症状）
    if (triage_color === '緑' || triage_color === '黒') {
        return 'Morison窩：液体貯留なし（−）\n脾腎間：液体貯留なし（−）\n骨盤腔：液体貯留なし（−）\n心嚢：液体貯留なし（−）\n→ FAST陰性'
    }

    if (hasChestTrauma) {
        return `Morison窩：液体貯留なし（−）\n脾腎間：液体貯留なし（−）\n骨盤腔：液体貯留なし（−）\n心嚢：${isRed ? '心嚢液貯留あり（＋）、心タンポナーデ疑い' : '少量の液体貯留（+/−）'}\n→ FAST ${isRed ? '陽性（心嚢）' : '境界域'}`
    }

    if (hasPelvicFracture) {
        return `Morison窩：液体貯留なし（−）\n脾腎間：液体貯留なし（−）\n骨盤腔：${isRed ? '大量の液体貯留あり（＋＋）、後腹膜血腫の可能性' : '少量の液体貯留（+/−）'}\n心嚢：液体貯留なし（−）\n→ FAST ${isRed ? '陽性（骨盤腔）' : '境界域'}`
    }

    if (hasAbdominalTrauma || hasCrush) {
        return `Morison窩：${isRed ? '液体貯留あり（＋）、腹腔内出血疑い' : '少量の液体貯留（+/−）'}\n脾腎間：${isRed ? '液体貯留あり（＋）' : '液体貯留なし（−）'}\n骨盤腔：${isRed ? '液体貯留あり（＋）' : '液体貯留なし（−）'}\n心嚢：液体貯留なし（−）\n→ FAST ${isRed ? '陽性（腹腔内出血）' : '境界域'}`
    }

    // デフォルト（外傷全般・黄タグ）
    if (isRed) {
        return 'Morison窩：液体貯留あり（＋）\n脾腎間：液体貯留なし（−）\n骨盤腔：液体貯留なし（−）\n心嚢：液体貯留なし（−）\n→ FAST陽性（腹腔内出血疑い）'
    }
    return 'Morison窩：液体貯留なし（−）\n脾腎間：液体貯留なし（−）\n骨盤腔：液体貯留なし（−）\n心嚢：液体貯留なし（−）\n→ FAST陰性'
}


// 定型処置マスター（csv.ts内にコピー、処置名照合用）
const TREATMENT_MASTER = [
    { id: 'oxygen', name: '酸素投与' },
    { id: 'hfnc', name: 'ハイフロー開始 (HFNC)' },
    { id: 'intubation', name: '気管挿管' },
    { id: 'surgical_airway', name: '外科的気道確保' },
    { id: 'ventilator', name: '人工呼吸器開始' },
    { id: 'needle_decompression', name: '胸腔穿刺 (絊急脱気)' },
    { id: 'chest_tube', name: '胸腔ドレーン挿入' },
    { id: 'gauze_towel_fixation', name: 'ガーゼ固定、タオル固定' },
    { id: 'three_sided_taping', name: '三辺テーピング' },
    { id: 'iv_access', name: '静脈路確保(末梢)' },
    { id: 'iv_access_2', name: '静脈路確保(2本目)' },
    { id: 'cv_access', name: '中心静脈路確保' },
    { id: 'quinton_catheter', name: '血管アクセスカテーテル挿入 (クイントン)' },
    { id: 'iv_fluid', name: '外液急速投与' },
    { id: 'blood_transfusion', name: '絊急輸血 (RBC/FFP/PC)' },
    { id: 'vasopressor', name: '昇圧剤投与' },
    { id: 'antihypertensive', name: '降圧剤投与' },
    { id: 'antibiotics', name: '抗菌薬投与' },
    { id: 'sedation', name: '鹮静・鹮痛薬投与' },
    { id: 'pelvic_binder', name: 'サムスリング装著 (骨盤固定)' },
    { id: 'cpr', name: '胸骨圧迫 / ACLS' },
    { id: 'fasciotomy', name: '減張切開' },
    { id: 'open_cardiac_massage', name: '開胸心マ' },
    { id: 'aortic_cross_clamping', name: '開胸大動脈クランプ' },
    { id: 'exploratory_laparotomy', name: '試験開腹' },
    { id: 'emergency_c_section', name: '絊急帝王切開' },
    { id: 'iabo', name: 'IABO (大動脈内バルーン閉塞)' },
    { id: 'iabp', name: 'IABP (大動脈内バルーンポンピング)' },
    { id: 'pcps', name: 'PCPS (VA-ECMO)' },
    { id: 'pericardiocentesis', name: '心囊穿刺ドレナージ' },
    { id: 'splint', name: 'シーネ固定' },
    { id: 'traction', name: '直達犍引' },
    { id: 'suture', name: '挨創処置 (洗浄縫合)' },
    { id: 'xray', name: 'レントゲン(X-P)' },
    { id: 'ct', name: 'CT画像検査' },
    { id: 'blood_test', name: '血液検査' },
    { id: 'blood_gas', name: '血液ガス' },
]

// 処置名またはIDからTREATMENT_MASTERを照合
function findTreatment(nameOrId: string): { id: string; name: string; time: number } | null {
    const s = nameOrId.trim()
    // IDで照合
    const byId = TREATMENT_MASTER.find(t => t.id === s)
    if (byId) return { ...byId, time: 5 }
    // 名前で完全一致
    const byName = TREATMENT_MASTER.find(t => t.name === s)
    if (byName) return { ...byName, time: 5 }
    // 部分一致（名前にキーワードを含む）
    const byPartial = TREATMENT_MASTER.find(t => t.name.includes(s) || s.includes(t.name))
    if (byPartial) return { ...byPartial, time: 5 }
    return null
}

// ------------------------------------------------------------------
// マスタCSV雛形生成（現在のPatient型に合わせた完全対応版）
// セッション中でない場合にダウンロードされる「患者雛形CSV」として使用
// ------------------------------------------------------------------
export function exportMasterCSV(patients: Patient[]): string {
    // ヘッダー列定義（Patient型の全フィールドに対応）
    const headers = [
        'シナリオタグ',
        '管理番号',
        '患者氏名',
        '年齢',
        '性別',
        '想定トリアージ区分',
        '現場トリアージ区分',
        // 構造化V/S（トリアージ時）
        'トリアージ時_SBP', 'トリアージ時_DBP', 'トリアージ時_HR',
        'トリアージ時_RR', 'トリアージ時_SpO2', 'トリアージ時_Temp', 'トリアージ時_GCS_E', 'トリアージ時_GCS_V', 'トリアージ時_GCS_M',
        // 構造化V/S（初期評価時）
        '初期評価時_SBP', '初期評価時_DBP', '初期評価時_HR',
        '初期評価時_RR', '初期評価時_SpO2', '初期評価時_Temp', '初期評価時_GCS_E', '初期評価時_GCS_V', '初期評価時_GCS_M',
        // 身体所見
        '頭謝部所見',
        '胸部所見',
        '腹部・骨盤所見',
        '四肢所見',
        'FAST所見',
        // AMPLE分割（5列）
        'A:アレルギー',
        'M:内服薬',
        'P:既往歴・妊娠',
        'L:最終飲食',
        'E:受傷機転',
        // 患者背景
        '患者背景',
        // 診断・方针
        '診断名',
        '必要検査・安定処置',
        '方针',
        // アクター情報
        '演技・痛がり方アドバイス',
        // 画像・採血
        '画像ＵＲＬ（カンマ区切り）',
        '血液検査データ',
        // 必要処置（処置名 — COMMON_TREATMENTSから選択、最大1履歴あるのみここに出力）
        '処置名_1', '拘束時間分_1',
        '処置名_2', '拘束時間分_2',
        '処置名_3', '拘束時間分_3',
        '処置名_4', '拘束時間分_4',
        '処置名_5', '拘束時間分_5',
        // 悪化シナリオ
        '悪化シナリオ有効',
        '悪化到達時間（分）',
        '悪化目標_SBP', '悪化目標_DBP', '悪化目標_HR',
        '悪化目標_RR', '悪化目標_SpO2', '悪化目標_Temp', '悪化目標_GCS_E', '悪化目標_GCS_V', '悪化目標_GCS_M',
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

        // 処置を最大10件まで展開
        const treatmentCells: string[] = []
        for (let i = 0; i < 5; i++) {
            const rt = treatments[i]
            treatmentCells.push(rt ? rt.treatment_name : '')
            treatmentCells.push(rt ? String(rt.lock_timer_minutes) : '')
        }

        // AMPLE各項目の出力（分割データ側または一括AMPLEの分解）
        const ample_a = p.findings?.ample_a ?? ''
        const ample_m = p.findings?.ample_m ?? ''
        const ample_p = p.findings?.ample_p ?? ''
        const ample_l = p.findings?.ample_l ?? ''
        const ample_e = p.findings?.ample_e ?? ''

        const row = [
            p.scenario_tag || '基本',
            p.id,
            p.name,
            p.age,
            p.gender === 'M' ? '男性(M)' : '女性(F)',
            p.triage_color,
            p.scene_triage_color || '',
            // トリアージ時V/S
            vs_t?.sbp  ?? '', vs_t?.dbp  ?? '', vs_t?.hr   ?? '',
            vs_t?.rr   ?? '', vs_t?.spo2 ?? '', vs_t?.temp ?? '', vs_t?.gcs_e ?? '', vs_t?.gcs_v ?? '', vs_t?.gcs_m ?? '',
            // 初期評価時V/S
            vs_i?.sbp  ?? '', vs_i?.dbp  ?? '', vs_i?.hr   ?? '',
            vs_i?.rr   ?? '', vs_i?.spo2 ?? '', vs_i?.temp ?? '', vs_i?.gcs_e ?? '', vs_i?.gcs_v ?? '', vs_i?.gcs_m ?? '',
            // 所見
            p.findings?.head_and_neck      || '',
            p.findings?.chest              || '',
            p.findings?.abdomen_and_pelvis  || '',
            p.findings?.limbs              || '',
            p.findings?.fast               || '',
            // AMPLE5分割
            ample_a, ample_m, ample_p, ample_l, ample_e,
            // 患者背景
            p.findings?.background         || '',
            // 診断・方针
            p.diagnosis                    || '',
            p.necessary_tests_and_treatments || '',
            p.policy                       || '',
            // アクター
            p.acting_instructions          || '',
            // 画像・採血
            (p.image_urls || []).join(','),
            p.blood_test_data              || '',
            // 処置（最大5件）
            ...treatmentCells,
            // 悪化シナリオ
            p.deterioration_enabled ? '有効' : '無効',
            p.deterioration_time_minutes ?? 30,
            vs_p?.sbp  ?? '', vs_p?.dbp  ?? '', vs_p?.hr   ?? '',
            vs_p?.rr   ?? '', vs_p?.spo2 ?? '', vs_p?.temp ?? '', vs_p?.gcs_e ?? '', vs_p?.gcs_v ?? '', vs_p?.gcs_m ?? '',
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
        '管理番号', '患者氏名', 'シナリオタグ', '年齢', '性別', '想定トリアージ区分', '現場トリアージ区分', '診断名',
        '現在ステータス', 'トリアージ完了日時', '初期V/S完了日時', '最終処置完了日時',
        '処置済み項目', '画像検査実施', '血液検査実施', 
        '初期V/S_SBP', '初期V/S_DBP', '初期V/S_HR', '初期V/S_RR', '初期V/S_SpO2', '初期V/S_Temp', '初期V/S_GCS_E', '初期V/S_GCS_V', '初期V/S_GCS_M',
        '最新V/S(テキスト)',
        'KPI_病着からトリアージまでの時間(分)', 'KPI_トリアージから初期評価までの時間(分)', 'KPI_病着から根本治療までの時間(分)', 'KPI_急変の有無', 'KPI_トリアージ乖離'
    ]

    const formatTime = (ms?: number | null) => {
        if (!ms) return ''
        const d = new Date(ms)
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
    }

    const rows = patients.map(p => {
        const vs_i = p.vitals_initial_struct

        // KPI計算用
        const calcMinutes = (start?: number, end?: number) => {
            if (!start || !end) return ''
            const diffMs = end - start
            if (diffMs < 0) return '0'
            return (diffMs / (1000 * 60)).toFixed(1)
        }

        const triageDiff = () => {
            if (!p.scene_triage_color) return ''
            if (p.scene_triage_color === p.triage_color) return '一致'
            // 簡易的な乖離判定（重さ: 赤>黄>緑>黒 とみなす）
            const severity = { '赤': 4, '黄': 3, '緑': 2, '黒': 1 }
            const sceneSev = severity[p.scene_triage_color] || 0
            const realSev = severity[p.triage_color] || 0
            if (sceneSev > realSev) return 'オーバートリアージ'
            if (sceneSev < realSev) return 'アンダートリアージ'
            return ''
        }

        const row = [
            p.id,
            p.name,
            p.scenario_tag || '基本',
            p.age,
            p.gender === 'M' ? '男性' : '女性',
            p.triage_color,
            p.scene_triage_color || '',
            p.diagnosis || '',
            p.status,
            formatTime(p.triage_time_ms),
            formatTime(p.initial_vs_time_ms),
            formatTime(p.post_vs_time_ms), // 最終処置完了日時とみなす
            p.completed_treatments?.join(',') || 'なし',
            p.tests_completed ? '済' : '未',
            p.stabilization_completed ? '済' : '未',
            vs_i?.sbp ?? '', vs_i?.dbp ?? '', vs_i?.hr ?? '',
            vs_i?.rr ?? '', vs_i?.spo2 ?? '', vs_i?.temp ?? '', vs_i?.gcs_e ?? '', vs_i?.gcs_v ?? '', vs_i?.gcs_m ?? '',
            // ログ用に改行を空白に変換
            (structToText(p.vitals_initial_struct) || p.vitals_initial || '').replace(/\n/g, ' '),
            // KPIs
            calcMinutes(p.reception_time_ms, p.triage_time_ms),
            calcMinutes(p.triage_time_ms, p.initial_vs_time_ms),
            calcMinutes(p.reception_time_ms, p.post_vs_time_ms),
            (p.status === '急変' || p.status === '悪化') ? '発生' : 'なし',
            triageDiff()
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

        // 自動補完ロジック：空欄の場合、トリアージ色から生成
        const generateDefaultVitals = (color: string) => {
            if (color === '赤') return { sbp: 80, dbp: 50, hr: 130, rr: 30, spo2: 90, temp: 36.5, gcs_e: 2, gcs_v: 3, gcs_m: 4 }
            if (color === '黄') return { sbp: 100, dbp: 60, hr: 110, rr: 24, spo2: 95, temp: 36.5, gcs_e: 3, gcs_v: 4, gcs_m: 6 }
            if (color === '緑') return { sbp: 120, dbp: 80, hr: 80, rr: 16, spo2: 98, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 }
            if (color === '黒') return { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 36.5, gcs_e: 1, gcs_v: 1, gcs_m: 1 }
            return { sbp: 120, dbp: 80, hr: 80, rr: 16, spo2: 98, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 }
        }

        const vitals_triage_struct = data['トリアージ時_SBP'] ? {
            sbp:  parseNum(data['トリアージ時_SBP']),
            dbp:  parseNum(data['トリアージ時_DBP']),
            hr:   parseNum(data['トリアージ時_HR']),
            rr:   parseNum(data['トリアージ時_RR']),
            spo2: parseNum(data['トリアージ時_SpO2']),
            temp: parseNum(data['トリアージ時_Temp']) || 36.5,
            gcs_e: parseNum(data['トリアージ時_GCS_E']) || undefined,
            gcs_v: parseNum(data['トリアージ時_GCS_V']) || undefined,
            gcs_m: parseNum(data['トリアージ時_GCS_M']) || undefined,
        } : generateDefaultVitals(triage_color);

        const vitals_initial_struct = data['初期評価時_SBP'] ? {
            sbp:  parseNum(data['初期評価時_SBP']),
            dbp:  parseNum(data['初期評価時_DBP']),
            hr:   parseNum(data['初期評価時_HR']),
            rr:   parseNum(data['初期評価時_RR']),
            spo2: parseNum(data['初期評価時_SpO2']),
            temp: parseNum(data['初期評価時_Temp']) || 36.5,
            gcs_e: parseNum(data['初期評価時_GCS_E']) || undefined,
            gcs_v: parseNum(data['初期評価時_GCS_V']) || undefined,
            gcs_m: parseNum(data['初期評価時_GCS_M']) || undefined,
        } : generateDefaultVitals(triage_color);

        const vitals_post_struct = data['悪化目標_SBP'] ? {
            sbp:  parseNum(data['悪化目標_SBP']),
            dbp:  parseNum(data['悪化目標_DBP']),
            hr:   parseNum(data['悪化目標_HR']),
            rr:   parseNum(data['悪化目標_RR']),
            spo2: parseNum(data['悪化目標_SpO2']),
            temp: parseNum(data['悪化目標_Temp']) || 36.5,
            gcs_e: parseNum(data['悪化目標_GCS_E']) || undefined,
            gcs_v: parseNum(data['悪化目標_GCS_V']) || undefined,
            gcs_m: parseNum(data['悪化目標_GCS_M']) || undefined,
        } : undefined;

        const vitals_rosc_struct = (data['ROSC可能'] === '可能' && data['ROSC目標_SBP']) ? {
            sbp:  parseNum(data['ROSC目標_SBP']),
            dbp:  parseNum(data['ROSC目標_DBP']),
            hr:   parseNum(data['ROSC目標_HR']),
            rr:   parseNum(data['ROSC目標_RR']),
            spo2: parseNum(data['ROSC目標_SpO2']),
            temp: parseNum(data['ROSC目標_Temp']) || 36.5,
        } : undefined

        // ------------------------------------------------------------------
        // 処置のビルド: 処置名_1〜5 → 文字列とTREATMENT_MASTERで照合して結び付け
        // 処置名がなくて必要検査・安定処置列に記載があれば自動分解して登録
        // ------------------------------------------------------------------
        let required_treatments: { treatment_id: string; treatment_name: string; lock_timer_minutes: number }[] = []

        // まず処置名_1〜5列を参照
        for (let j = 1; j <= 5; j++) {
            const nameOrId = data[`処置名_${j}`]
            const time = data[`拘束時間分_${j}`]
            if (nameOrId && nameOrId.trim()) {
                const matched = findTreatment(nameOrId)
                if (matched) {
                    required_treatments.push({
                        treatment_id: matched.id,
                        treatment_name: matched.name,
                        lock_timer_minutes: parseInt(time) || matched.time,
                    })
                } else {
                    // TREATMENT_MASTERにないカスタム処置名はそのまま登録
                    required_treatments.push({
                        treatment_id: `custom_${j}_${Date.now()}`,
                        treatment_name: nameOrId.trim(),
                        lock_timer_minutes: parseInt(time) || 5,
                    })
                }
            }
        }

        // 処置名列が全て空で、必要検査・安定処置列に記載があれば自動分解
        if (required_treatments.length === 0) {
            const rawTests = data['必要検査・安定処置'] || ''
            if (rawTests.trim()) {
                // 読点、カンマ、改行、「、」で分割
                const items = rawTests.split(/[、,，\n／･・]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0)
                let autoIdx = 1
                for (const item of items) {
                    const matched = findTreatment(item)
                    if (matched) {
                        required_treatments.push({
                            treatment_id: matched.id,
                            treatment_name: matched.name,
                            lock_timer_minutes: matched.time,
                        })
                    } else if (item.length > 0) {
                        required_treatments.push({
                            treatment_id: `auto_${autoIdx++}_${Date.now()}`,
                            treatment_name: item,
                            lock_timer_minutes: 5,
                        })
                    }
                }
            }
        }

        // AMPLE各項目を読み込む（新形式優先、旧形式の後方互換も対応）
        const ample_a = data['A:アレルギー'] || ''
        const ample_m = data['M:内服薬'] || ''
        const ample_p = data['P:既往歴・妊娠'] || ''
        const ample_l = data['L:最終飲食'] || ''
        const ample_e = data['E:受傷機転'] || ''
        // 旧形式の一括AMPLEテキスト
        const ampleRaw = data['AMPLE'] || ''

        const patient: Patient = {
            scenario_tag: data['シナリオタグ'] || 'カスタム',
            id: Math.max(0, parseInt(data['管理番号'], 10) || Date.now() + i),
            name: data['患者氏名'] || '名称未設定',
            age: Math.max(0, parseInt(data['年齢'], 10) || 30),
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
                head_and_neck:       data['頭謝部所見']        || '',
                chest:               data['胸部所見']          || '',
                abdomen_and_pelvis:  data['腹部・骨盤所見']    || '',
                limbs:               data['四肢所見']          || '',
                // FAST所見が空欄の場合は診断名・トリアージ色から自動生成（解決策A）
                fast: data['FAST所見'] || generateDefaultFastFindings(
                    data['診断名'] || '',
                    triage_color
                ),
                ample: ampleRaw,
                // AMPLE分割各項目
                ample_a,
                ample_m,
                ample_p,
                ample_l,
                ample_e,
                // 後方互換: '患者背景'列下位互換
                background: data['患者背景'] || data['背景（負傷機転）'] || '',
            },
            diagnosis:                      data['診断名']                      || '',
            necessary_tests_and_treatments: data['必要検査・安定処置']          || '',
            policy:                         data['方针']                        || '',
            acting_instructions:            data['演技・痛がり方アドバイス']    || '',
            image_urls: data['画像ＵＲＬ（カンマ区切り）']
                ? data['画像ＵＲＬ（カンマ区切り）'].split(',').map((s: string) => s.trim()).filter(Boolean)
                : [],
            // 血液検査データが空欄の場合は診断名・トリアージ色から自動生成（解決策A）
            blood_test_data: data['血液検査データ'] || generateDefaultBloodTestData(
                data['診断名'] || '',
                triage_color
            ),
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
