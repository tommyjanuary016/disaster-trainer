import React, { useState, useEffect } from 'react'
import { Patient, RequiredTreatment, VitalSignStruct, TriageColor } from '../types/patient'

interface PatientFormProps {
    initialPatient?: Patient | null
    onSubmit: (patient: Patient) => void
    onCancel: () => void
}

const COMMON_TREATMENTS = [
    // 気道・呼吸
    { id: 'oxygen', name: '酸素投与', time: 5 },
    { id: 'hfnc', name: 'ハイフロー開始 (HFNC)', time: 5 },
    { id: 'intubation', name: '気管挿管', time: 5 },
    { id: 'surgical_airway', name: '外科的気道確保', time: 5 },
    { id: 'ventilator', name: '人工呼吸器開始', time: 5 },
    { id: 'needle_decompression', name: '胸腔穿刺 (緊急脱気)', time: 5 },
    { id: 'chest_tube', name: '胸腔ドレーン挿入', time: 5 },
    { id: 'gauze_towel_fixation', name: 'ガーゼ固定、タオル固定', time: 5 },
    { id: 'three_sided_taping', name: '三辺テーピング', time: 5 },
    // 循環・輸液・輸血
    { id: 'iv_access', name: '静脈路確保(末梢)', time: 5 },
    { id: 'iv_access_2', name: '静脈路確保(2本目)', time: 5 },
    { id: 'cv_access', name: '中心静脈路確保', time: 5 },
    { id: 'quinton_catheter', name: '血管アクセスカテーテル挿入 (クイントン)', time: 5 },
    { id: 'iv_fluid', name: '外液急速投与', time: 1 },
    { id: 'blood_transfusion', name: '緊急輸血 (RBC/FFP/PC)', time: 5 },
    // 薬剤投与
    { id: 'vasopressor', name: '昇圧剤投与', time: 5 },
    { id: 'antihypertensive', name: '降圧剤投与', time: 5 },
    { id: 'antibiotics', name: '抗菌薬投与', time: 5 },
    { id: 'sedation', name: '鎮静・鎮痛薬投与', time: 5 },
    // 蘇生・外科的介入・高度医療
    { id: 'pelvic_binder', name: 'サムスリング装着 (骨盤固定)', time: 5 },
    { id: 'cpr', name: '胸骨圧迫 / ACLS', time: 5 },
    { id: 'fasciotomy', name: '減張切開', time: 5 },
    { id: 'open_cardiac_massage', name: '開胸心マ', time: 5 },
    { id: 'aortic_cross_clamping', name: '開胸大動脈クランプ', time: 5 },
    { id: 'exploratory_laparotomy', name: '試験開腹', time: 5 },
    { id: 'emergency_c_section', name: '緊急帝王切開', time: 5 },
    { id: 'iabo', name: 'IABO (大動脈内バルーン閉塞)', time: 5 },
    { id: 'iabp', name: 'IABP (大動脈内バルーンポンピング)', time: 5 },
    { id: 'pcps', name: 'PCPS (VA-ECMO)', time: 5 },
    // 整形・その他
    { id: 'pericardiocentesis', name: '心嚢穿刺ドレナージ', time: 5 },
    { id: 'splint', name: 'シーネ固定', time: 5 },
    { id: 'traction', name: '直達牽引', time: 5 },
    { id: 'suture', name: '挫創処置 (洗浄縫合)', time: 5 },
    // 検査関係
    { id: 'xray', name: 'レントゲン(X-P)', time: 3 },
    { id: 'ct', name: 'CT画像検査', time: 5 },
    { id: 'blood_test', name: '血液検査', time: 5 },
    { id: 'blood_gas', name: '血液ガス', time: 3 },
]

// ------------------------------------------------------------------
// 傷病テンプレート（ワンタップで全項目を自動セット）
// ------------------------------------------------------------------
interface ClinicalPreset {
    id: string
    title: string
    icon: string
    triage_color: TriageColor
    diagnosis: string
    description: string
    vitals_triage_struct: VitalSignStruct
    vitals_initial_struct: VitalSignStruct
    vitals_post_struct: VitalSignStruct
    findings: {
        head_and_neck: string
        chest: string
        abdomen_and_pelvis: string
        limbs: string
        fast: string
        ample: string
        background: string
    }
    required_treatments: RequiredTreatment[]
    acting_instructions?: string
}

const CLINICAL_PRESETS: ClinicalPreset[] = [
    {
        id: 'pelvic_fracture',
        title: '骨盤骨折 (出血性ショック)',
        icon: '🩸',
        triage_color: '赤',
        diagnosis: '骨盤骨折・後腹膜出血',
        description: 'BP低下、タキカル、FAST陽性。急速輸液・緊急輸血・サムスリングが必要。',
        vitals_triage_struct: { sbp: 82, dbp: 55, hr: 120, rr: 28, spo2: 98, temp: 35.8, gcs_e: 3, gcs_v: 4, gcs_m: 5 },
        vitals_initial_struct: { sbp: 70, dbp: 48, hr: 120, rr: 30, spo2: 98, temp: 35.5, gcs_e: 2, gcs_v: 4, gcs_m: 5 },
        vitals_post_struct: { sbp: 104, dbp: 60, hr: 90, rr: 28, spo2: 99, temp: 35.8, gcs_e: 4, gcs_v: 5, gcs_m: 5 },
        findings: {
            head_and_neck: '顔面に微小擦過傷あり',
            chest: '胸部打撲痕なし、両側清音',
            abdomen_and_pelvis: '下腹部右側に打撲痕、腸骨圧痛・骨盤動揺あり',
            limbs: '右下肢の短縮あり、右大腿部に打撲痕',
            fast: 'ダグラス窩にecho free space (+)',
            ample: 'A:なし / M:降圧剤 / P:高血圧 / L:2時間前昼食 / E:バス事故転落',
            background: '配偶者と2人暮らし、ADL自立'
        },
        required_treatments: [
            { treatment_id: 'iv_fluid', treatment_name: '外液急速投与', lock_timer_minutes: 1 },
            { treatment_id: 'blood_transfusion', treatment_name: '緊急輸血 (RBC/FFP/PC)', lock_timer_minutes: 5 },
            { treatment_id: 'pelvic_binder', treatment_name: 'サムスリング装着 (骨盤固定)', lock_timer_minutes: 5 }
        ],
        acting_instructions: '骨盤付近を押されると強く痛がり声をあげる。意識はやや朦朧。'
    },
    {
        id: 'tension_pneumothorax',
        title: '緊張性気胸 (呼吸苦)',
        icon: '🫁',
        triage_color: '赤',
        diagnosis: '右緊張性気胸',
        description: '呼吸数過多、SpO2低下、気管偏位。脱気・胸腔ドレーンが緊急必要。',
        vitals_triage_struct: { sbp: 95, dbp: 66, hr: 122, rr: 36, spo2: 90, temp: 36.0, gcs_e: 3, gcs_v: 3, gcs_m: 5 },
        vitals_initial_struct: { sbp: 88, dbp: 40, hr: 130, rr: 36, spo2: 88, temp: 36.0, gcs_e: 3, gcs_v: 3, gcs_m: 4 },
        vitals_post_struct: { sbp: 130, dbp: 70, hr: 102, rr: 20, spo2: 98, temp: 36.0, gcs_e: 3, gcs_v: 4, gcs_m: 5 },
        findings: {
            head_and_neck: '頸静脈怒張あり、気管右側へ偏位',
            chest: '右胸部皮下気腫、右呼吸音消失、打診で鼓音',
            abdomen_and_pelvis: '平坦・軟、圧痛なし',
            limbs: '著変なし',
            fast: '右胸腔lung sliding消失',
            ample: 'A:なし / M:なし / P:特記事項なし / L:3時間前 / E:右胸部強打',
            background: '一人暮らし、自給自足'
        },
        required_treatments: [
            { treatment_id: 'needle_decompression', treatment_name: '胸腔穿刺 (緊急脱気)', lock_timer_minutes: 5 },
            { treatment_id: 'chest_tube', treatment_name: '胸腔ドレーン挿入', lock_timer_minutes: 5 }
        ],
        acting_instructions: '息をはあはあ荒く吐き、胸を押さえて苦しがる。'
    },
    {
        id: 'epidural_hematoma',
        title: '急性硬膜外血腫 (頭部外傷)',
        icon: '🤕',
        triage_color: '赤',
        diagnosis: '右急性硬膜外血腫・頭蓋骨折',
        description: 'JCS/GCS低下傾向、瞳孔不同あり。頭部CTおよび開頭減圧術が必要。',
        vitals_triage_struct: { sbp: 152, dbp: 90, hr: 58, rr: 14, spo2: 97, temp: 36.8, gcs_e: 2, gcs_v: 3, gcs_m: 4 },
        vitals_initial_struct: { sbp: 168, dbp: 98, hr: 50, rr: 12, spo2: 96, temp: 36.8, gcs_e: 1, gcs_v: 2, gcs_m: 3 },
        vitals_post_struct: { sbp: 130, dbp: 80, hr: 72, rr: 16, spo2: 99, temp: 36.8, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
        findings: {
            head_and_neck: '右側頭部に大きな皮下血腫、右瞳孔散大 (4.5mm/2.5mm)',
            chest: '著変なし',
            abdomen_and_pelvis: '著変なし',
            limbs: '左上下肢に軽度麻痺あり',
            fast: '陰性',
            ample: 'A:なし / M:なし / P:なし / L:未詳 / E:頭部打撲',
            background: '家族連絡中'
        },
        required_treatments: [
            { treatment_id: 'ct', treatment_name: 'CT画像検査', lock_timer_minutes: 5 },
            { treatment_id: 'intubation', treatment_name: '気管挿管', lock_timer_minutes: 5 }
        ],
        acting_instructions: '呼びかけに対してうめき声のみで意識が薄い。'
    },
    {
        id: 'femur_fracture',
        title: '大腿骨骨折 (中等症外傷)',
        icon: '🩹',
        triage_color: '黄',
        diagnosis: '右大腿骨幹部開放骨折',
        description: 'バイタル比較的安定、劇痛あり。シーネ固定・鎮痛薬投与。',
        vitals_triage_struct: { sbp: 128, dbp: 78, hr: 98, rr: 20, spo2: 99, temp: 36.6, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
        vitals_initial_struct: { sbp: 124, dbp: 76, hr: 94, rr: 18, spo2: 99, temp: 36.6, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
        vitals_post_struct: { sbp: 118, dbp: 72, hr: 78, rr: 16, spo2: 99, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
        findings: {
            head_and_neck: '特記事項なし',
            chest: '特記事項なし',
            abdomen_and_pelvis: '平坦・軟',
            limbs: '右大腿部に変形・圧痛・出血あり。末梢動脈触知可能',
            fast: '陰性',
            ample: 'A:なし / M:なし / P:なし / L:1時間前 / E:転倒強打',
            background: 'ADL自立'
        },
        required_treatments: [
            { treatment_id: 'splint', treatment_name: 'シーネ固定', lock_timer_minutes: 5 },
            { treatment_id: 'sedation', treatment_name: '鎮静・鎮痛薬投与', lock_timer_minutes: 5 }
        ],
        acting_instructions: '右足を少し動かされただけで足を押さえて大声で痛がる。'
    },
    {
        id: 'hyperventilation',
        title: '過換気症候群 (軽症)',
        icon: '😮‍💨',
        triage_color: '緑',
        diagnosis: '過換気症候群・パニック状態',
        description: 'バイタル安定、手指痺れ・不安感。安心感の教示・鎮静が主体。',
        vitals_triage_struct: { sbp: 138, dbp: 88, hr: 118, rr: 34, spo2: 100, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
        vitals_initial_struct: { sbp: 130, dbp: 82, hr: 104, rr: 28, spo2: 100, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
        vitals_post_struct: { sbp: 112, dbp: 70, hr: 76, rr: 16, spo2: 99, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
        findings: {
            head_and_neck: '口唇の震え',
            chest: '外傷なし、両側清音',
            abdomen_and_pelvis: '異常なし',
            limbs: '両手指にトリソー徴候（助産師の手）、テタニー傾向',
            fast: '陰性',
            ample: 'A:なし / M:なし / P:過換気発作歴 / L:1時間前 / E:事故の目撃でパニック',
            background: '歩行可能'
        },
        required_treatments: [
            { treatment_id: 'sedation', treatment_name: '鎮静・鎮痛薬投与', lock_timer_minutes: 5 }
        ],
        acting_instructions: '手足が痺れると訴え、呼吸が浅く速くなっている。'
    },
    {
        id: 'cpa_black',
        title: '心肺停止 / 重度外傷 (死亡)',
        icon: '🖤',
        triage_color: '黒',
        diagnosis: '外傷性心肺停止 (CPA)',
        description: '自発呼吸なし、脈拍触知不能、瞳孔散大。救命不可判定。',
        vitals_triage_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 34.0, gcs_e: 1, gcs_v: 1, gcs_m: 1 },
        vitals_initial_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 34.0, gcs_e: 1, gcs_v: 1, gcs_m: 1 },
        vitals_post_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 34.0, gcs_e: 1, gcs_v: 1, gcs_m: 1 },
        findings: {
            head_and_neck: '瞳孔対光反射なし (左右6.0mm固定)',
            chest: '自発呼吸なし、心音消失',
            abdomen_and_pelvis: '開放性外傷あり',
            limbs: '総頸動脈・橈骨動脈触知不能',
            fast: '心停止を確認',
            ample: '不明',
            background: '不明'
        },
        required_treatments: [],
        acting_instructions: '応答なし。動かない。'
    }
]

const defaultPatient: Patient = {
    id: Date.now(),
    name: '',
    age: 35,
    gender: 'M',
    triage_color: '緑',
    vitals_triage: '',
    vitals_initial: '',
    vitals_post: '',
    vitals_triage_struct: { sbp: 120, dbp: 80, hr: 75, rr: 16, spo2: 99, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
    vitals_initial_struct: { sbp: 120, dbp: 80, hr: 75, rr: 16, spo2: 99, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
    vitals_post_struct: { sbp: 120, dbp: 80, hr: 75, rr: 16, spo2: 99, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 },
    vitals_deterioration_struct: { sbp: 90, dbp: 50, hr: 120, rr: 28, spo2: 90, temp: 36.5, gcs_e: 3, gcs_v: 4, gcs_m: 5 },
    findings: {
        head_and_neck: '',
        chest: '',
        abdomen_and_pelvis: '',
        limbs: '',
        fast: '',
        ample: '',
        background: '',
    },
    diagnosis: '',
    required_treatments: [],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
    necessary_tests_and_treatments: '',
    policy: '',
    image_urls: [],
    blood_test_data: '',
    acting_instructions: '',
    deterioration_enabled: false,
    deterioration_time_minutes: 30,
}

const PatientForm: React.FC<PatientFormProps> = ({ initialPatient, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<Patient>(initialPatient || defaultPatient)
    const [formMode, setFormMode] = useState<'quick' | 'wizard'>('quick') // 2WAYモード
    const [activeWizardStep, setActiveWizardStep] = useState<number>(1) // ウィザードステップ 1-4
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)

    useEffect(() => {
        if (initialPatient) {
            const enriched = { ...initialPatient }
            if (!enriched.vitals_triage_struct) {
                enriched.vitals_triage_struct = { sbp: 120, dbp: 80, hr: 75, rr: 16, spo2: 99, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 }
            }
            if (!enriched.vitals_initial_struct) {
                enriched.vitals_initial_struct = { sbp: 120, dbp: 80, hr: 75, rr: 16, spo2: 99, temp: 36.5, gcs_e: 4, gcs_v: 5, gcs_m: 6 }
            }
            setFormData(enriched)
            setFormMode('wizard') // 既存患者編集時は直接詳細ウィザードを開く
        } else {
            setFormData({ ...defaultPatient, id: Date.now() })
        }
    }, [initialPatient])

    // テンプレート適用の処理
    const handleApplyPreset = (preset: ClinicalPreset) => {
        setSelectedPresetId(preset.id)
        setFormData(prev => ({
            ...prev,
            triage_color: preset.triage_color,
            scene_triage_color: preset.triage_color,
            diagnosis: preset.diagnosis,
            vitals_triage_struct: { ...preset.vitals_triage_struct },
            vitals_initial_struct: { ...preset.vitals_initial_struct },
            vitals_post_struct: { ...preset.vitals_post_struct },
            findings: { ...preset.findings },
            required_treatments: [...preset.required_treatments],
            acting_instructions: preset.acting_instructions || prev.acting_instructions,
            // 氏名が未入力なら仮名を自動生成
            name: prev.name || `${preset.triage_color}区分 傷病者`
        }))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: Math.max(0, parseInt(value) || 0) }))
    }

    const handleFindingsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            findings: { ...prev.findings, [name]: value },
        }))
    }

    // 構造化V/S更新ヘルパー
    const updateVitalStruct = (
        field: 'vitals_triage_struct' | 'vitals_initial_struct' | 'vitals_post_struct' | 'vitals_deterioration_struct',
        key: keyof VitalSignStruct,
        rawValue: number
    ) => {
        setFormData(prev => ({
            ...prev,
            [field]: { ...(prev[field] || {}), [key]: rawValue }
        }))
    }

    // 手技の追加・削除
    const addTreatment = (tx: { id: string; name: string; time: number }) => {
        setFormData(prev => {
            const current = prev.required_treatments || []
            if (current.some(t => t.treatment_id === tx.id)) return prev
            return {
                ...prev,
                required_treatments: [
                    ...current,
                    { treatment_id: tx.id, treatment_name: tx.name, lock_timer_minutes: tx.time }
                ]
            }
        })
    }

    const removeTreatment = (index: number) => {
        setFormData((prev) => {
            const newTreatments = [...(prev.required_treatments || [])]
            newTreatments.splice(index, 1)
            return { ...prev, required_treatments: newTreatments }
        })
    }

    // 構造化V/Sをフリーテキストに変換（保存時の自動同期用）
    const structToText = (s: VitalSignStruct | undefined): string => {
        if (!s) return ''
        const parts = [
            s.sbp || s.dbp ? `BP ${s.sbp}/${s.dbp}` : null,
            s.hr ? `HR ${s.hr}` : null,
            s.rr ? `RR ${s.rr}` : null,
            s.spo2 ? `SpO2 ${s.spo2}%` : null,
            s.temp ? `Temp ${s.temp}℃` : null,
            s.gcs_e !== undefined || s.gcs_v !== undefined || s.gcs_m !== undefined
                ? `GCS E${s.gcs_e ?? 4}V${s.gcs_v ?? 5}M${s.gcs_m ?? 6}`
                : null,
        ].filter(Boolean)
        return parts.join(', ')
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            alert('患者名を入力してください')
            return
        }
        const vitals_triage = structToText(formData.vitals_triage_struct) || formData.vitals_triage
        const vitals_initial = structToText(formData.vitals_initial_struct) || formData.vitals_initial
        onSubmit({ ...formData, vitals_triage, vitals_initial })
    }

    return (
        <div className="patient-form card card--elevated" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', padding: '1.25rem', boxSizing: 'border-box', overflowX: 'hidden' }}>
            {/* ヘッダー */}
            <header className="patient-form__header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card__title" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {initialPatient ? '✏️ 患者情報を編集' : '➕ 患者データを新規登録'}
                    </h3>
                    <button type="button" onClick={onCancel} className="button button--secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}>
                        ✕ 閉じる
                    </button>
                </div>
            </header>

            {/* モード切替タブ */}
            {!initialPatient && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--gray-100)', padding: '0.35rem', borderRadius: '10px' }}>
                    <button
                        type="button"
                        onClick={() => setFormMode('quick')}
                        style={{
                            flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontWeight: 'bold', fontSize: '0.9rem',
                            background: formMode === 'quick' ? 'var(--white)' : 'transparent',
                            color: formMode === 'quick' ? 'var(--primary)' : 'var(--gray-600)',
                            boxShadow: formMode === 'quick' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        ⚡ クイック作成 (テンプレート選択)
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormMode('wizard')}
                        style={{
                            flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontWeight: 'bold', fontSize: '0.9rem',
                            background: formMode === 'wizard' ? 'var(--white)' : 'transparent',
                            color: formMode === 'wizard' ? 'var(--primary)' : 'var(--gray-600)',
                            boxShadow: formMode === 'wizard' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        📝 詳細作成 (ステップ入力)
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* ------------------------------------------------------------------ */}
                {/* モードA: ⚡ クイック作成モード */}
                {/* ------------------------------------------------------------------ */}
                {formMode === 'quick' && !initialPatient && (
                    <div>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', color: 'var(--gray-800)' }}>
                                1. 傷病テンプレートを選択 (ワンタップで全情報が自動入力されます)
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                {CLINICAL_PRESETS.map(preset => {
                                    const isSelected = selectedPresetId === preset.id
                                    const colorMap: Record<string, string> = { '赤': '#fee2e2', '黄': '#fef3c7', '緑': '#d1fae5', '黒': '#f1f5f9' }
                                    const borderMap: Record<string, string> = { '赤': '#dc2626', '黄': '#d97706', '緑': '#059669', '黒': '#334155' }

                                    return (
                                        <div
                                            key={preset.id}
                                            onClick={() => handleApplyPreset(preset)}
                                            style={{
                                                padding: '0.85rem', borderRadius: '10px', cursor: 'pointer',
                                                border: `2px solid ${isSelected ? borderMap[preset.triage_color] : 'var(--gray-200)'}`,
                                                background: isSelected ? colorMap[preset.triage_color] : 'var(--white)',
                                                transition: 'all 0.2s ease',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                                <span style={{ fontSize: '1.25rem' }}>{preset.icon}</span>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--gray-900)' }}>{preset.title}</span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-600)', margin: 0, lineHeight: '1.3' }}>
                                                {preset.description}
                                            </p>
                                            {isSelected && (
                                                <span style={{ position: 'absolute', right: '8px', top: '8px', fontSize: '0.8rem', background: borderMap[preset.triage_color], color: 'white', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                    ✓ 選択中
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* クイック入力必須フィールド */}
                        <div style={{ background: 'var(--gray-50)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--gray-200)', marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--gray-800)' }}>2. 患者基本情報を確認・入力</h4>
                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                <div>
                                    <label className="form-label">管理ID (自動採番)</label>
                                    <input
                                        type="number"
                                        name="id"
                                        value={formData.id}
                                        readOnly
                                        className="input"
                                        style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)', cursor: 'not-allowed', fontWeight: 'bold' }}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">シナリオタグ</label>
                                    <select
                                        name="scenario_tag"
                                        value={formData.scenario_tag || '基本'}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="基本">基本</option>
                                        <option value="地震・倒壊">地震・倒壊</option>
                                        <option value="多数傷病・交通事故">多数傷病・交通事故</option>
                                        <option value="爆発・火災">爆発・火災</option>
                                        <option value="NBC災害・中毒">NBC災害・中毒</option>
                                        <option value="カスタム">カスタム</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">患者氏名 <span style={{ color: 'red' }}>*</span></label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input" placeholder="例: 門司 太郎" />
                                </div>
                                <div>
                                    <label className="form-label">年齢</label>
                                    <input type="number" name="age" value={formData.age} onChange={handleNumberChange} required className="input" />
                                </div>
                                <div>
                                    <label className="form-label">性別</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className="input">
                                        <option value="M">男性 (M)</option>
                                        <option value="F">女性 (F)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">想定トリアージ区分</label>
                                    <select name="triage_color" value={formData.triage_color} onChange={handleChange} className="input" style={{ fontWeight: 'bold' }}>
                                        <option value="赤">🔴 I 赤 (最優先)</option>
                                        <option value="黄">🟡 II 黄 (待機)</option>
                                        <option value="緑">🟢 III 緑 (軽症)</option>
                                        <option value="黒">⚫ 0 黒 (死亡/救命不可)</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">診断名</label>
                                    <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="input" placeholder="例: 骨盤骨折" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------------ */}
                {/* モードB: 📝 詳細作成モード (4ステップウィザード) */}
                {/* ------------------------------------------------------------------ */}
                {(formMode === 'wizard' || initialPatient) && (
                    <div>
                        {/* ウィザードナビゲーションステップ */}
                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--gray-200)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            {[
                                { step: 1, label: '1. 基本情報' },
                                { step: 2, label: '2. バイタルサイン' },
                                { step: 3, label: '3. 所見 & AMPLE' },
                                { step: 4, label: '4. 診断・処置 & シナリオ' },
                            ].map(s => (
                                <button
                                    key={s.step}
                                    type="button"
                                    onClick={() => setActiveWizardStep(s.step)}
                                    style={{
                                        flex: 1, minWidth: '90px', padding: '0.55rem 0.25rem', border: 'none', background: 'none',
                                        borderBottom: activeWizardStep === s.step ? '3px solid var(--primary)' : '3px solid transparent',
                                        color: activeWizardStep === s.step ? 'var(--primary)' : 'var(--gray-600)',
                                        fontWeight: activeWizardStep === s.step ? 'bold' : 'normal',
                                        fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap'
                                    }}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Step 1: 基本情報 */}
                        {activeWizardStep === 1 && (
                            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label className="form-label">管理番号 (ID)</label>
                                    <input
                                        type="number"
                                        name="id"
                                        value={formData.id}
                                        readOnly
                                        className="input"
                                        style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)', cursor: 'not-allowed', fontWeight: 'bold' }}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">シナリオタグ</label>
                                    <select
                                        name="scenario_tag"
                                        value={formData.scenario_tag || '基本'}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="基本">基本</option>
                                        <option value="地震・倒壊">地震・倒壊</option>
                                        <option value="多数傷病・交通事故">多数傷病・交通事故</option>
                                        <option value="爆発・火災">爆発・火災</option>
                                        <option value="NBC災害・中毒">NBC災害・中毒</option>
                                        <option value="カスタム">カスタム</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">患者氏名 <span style={{ color: 'red' }}>*</span></label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input" placeholder="例: 小倉 花子" />
                                </div>
                                <div>
                                    <label className="form-label">年齢</label>
                                    <input type="number" name="age" value={formData.age} onChange={handleNumberChange} required className="input" />
                                </div>
                                <div>
                                    <label className="form-label">性別</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className="input">
                                        <option value="M">男性 (M)</option>
                                        <option value="F">女性 (F)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">想定トリアージ区分（正解）</label>
                                    <select name="triage_color" value={formData.triage_color} onChange={handleChange} className="input">
                                        <option value="赤">赤 (最優先治療)</option>
                                        <option value="黄">黄 (待機的治療)</option>
                                        <option value="緑">緑 (軽症)</option>
                                        <option value="黒">黒 (死亡/非救命対象)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Step 2: バイタルサイン (ワンタップ増減付) */}
                        {activeWizardStep === 2 && (
                            <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--gray-800)' }}>初期評価時バイタル (Primary Survey)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                                    {[
                                        { label: '収縮期血圧(SBP)', key: 'sbp', val: formData.vitals_initial_struct?.sbp ?? 120, unit: 'mmHg' },
                                        { label: '拡張期血圧(DBP)', key: 'dbp', val: formData.vitals_initial_struct?.dbp ?? 80, unit: 'mmHg' },
                                        { label: '心拍数 (HR)', key: 'hr', val: formData.vitals_initial_struct?.hr ?? 75, unit: 'bpm' },
                                        { label: '呼吸数 (RR)', key: 'rr', val: formData.vitals_initial_struct?.rr ?? 16, unit: '/min' },
                                        { label: 'SpO2', key: 'spo2', val: formData.vitals_initial_struct?.spo2 ?? 99, unit: '%' },
                                    ].map(item => (
                                        <div key={item.key}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.2rem' }}>{item.label}</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <input
                                                    type="number"
                                                    value={item.val}
                                                    onChange={e => updateVitalStruct('vitals_initial_struct', item.key as any, parseInt(e.target.value) || 0)}
                                                    className="input"
                                                    style={{ padding: '0.3rem', fontSize: '0.85rem', textAlign: 'center' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--gray-800)' }}>処置後改善バイタル (目標V/S)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', background: '#eff6ff', padding: '1rem', borderRadius: '8px' }}>
                                    {[
                                        { label: '収縮期血圧(SBP)', key: 'sbp', val: formData.vitals_post_struct?.sbp ?? 120 },
                                        { label: '拡張期血圧(DBP)', key: 'dbp', val: formData.vitals_post_struct?.dbp ?? 80 },
                                        { label: '心拍数 (HR)', key: 'hr', val: formData.vitals_post_struct?.hr ?? 75 },
                                        { label: '呼吸数 (RR)', key: 'rr', val: formData.vitals_post_struct?.rr ?? 16 },
                                        { label: 'SpO2', key: 'spo2', val: formData.vitals_post_struct?.spo2 ?? 99 },
                                    ].map(item => (
                                        <div key={item.key}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--gray-600)', display: 'block', marginBottom: '0.2rem' }}>{item.label}</label>
                                            <input
                                                type="number"
                                                value={item.val}
                                                onChange={e => updateVitalStruct('vitals_post_struct', item.key as any, parseInt(e.target.value) || 0)}
                                                className="input"
                                                style={{ padding: '0.3rem', fontSize: '0.85rem', textAlign: 'center' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: 所見 & AMPLE */}
                        {activeWizardStep === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div>
                                    <label className="form-label">頭頸部所見</label>
                                    <textarea name="head_and_neck" value={formData.findings?.head_and_neck || ''} onChange={handleFindingsChange} className="input" rows={2} placeholder="例: 顔面打撲痕あり、頸静脈怒張なし" />
                                </div>
                                <div>
                                    <label className="form-label">胸部所見</label>
                                    <textarea name="chest" value={formData.findings?.chest || ''} onChange={handleFindingsChange} className="input" rows={2} placeholder="例: 右前胸部に圧痛、呼吸音左右差なし" />
                                </div>
                                <div>
                                    <label className="form-label">腹部・骨盤所見</label>
                                    <textarea name="abdomen_and_pelvis" value={formData.findings?.abdomen_and_pelvis || ''} onChange={handleFindingsChange} className="input" rows={2} placeholder="例: 骨盤圧痛あり、腸骨動揺あり" />
                                </div>
                                <div>
                                    <label className="form-label">四肢所見</label>
                                    <textarea name="limbs" value={formData.findings?.limbs || ''} onChange={handleFindingsChange} className="input" rows={2} placeholder="例: 右大腿部変形、変色あり" />
                                </div>
                                <div>
                                    <label className="form-label">FAST所見 (超音波検査)</label>
                                    <input type="text" name="fast" value={formData.findings?.fast || ''} onChange={e => setFormData(prev => ({ ...prev, findings: { ...prev.findings, fast: e.target.value } }))} className="input" placeholder="例: ダグラス窩にecho free space (+)" />
                                </div>
                                <div style={{ background: 'var(--gray-50)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                                    <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>AMPLE 情報 (問診各項目)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>A: アレルギー</span>
                                            <input
                                                type="text"
                                                value={formData.findings?.ample_a || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, findings: { ...prev.findings, ample_a: e.target.value } }))}
                                                className="input"
                                                style={{ marginBottom: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                                placeholder="例: なし、ペニシリン"
                                            />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>M: 内服薬</span>
                                            <input
                                                type="text"
                                                value={formData.findings?.ample_m || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, findings: { ...prev.findings, ample_m: e.target.value } }))}
                                                className="input"
                                                style={{ marginBottom: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                                placeholder="例: 降圧剤、抗凝固薬"
                                            />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>P: 既往歴・妊娠</span>
                                            <input
                                                type="text"
                                                value={formData.findings?.ample_p || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, findings: { ...prev.findings, ample_p: e.target.value } }))}
                                                className="input"
                                                style={{ marginBottom: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                                placeholder="例: 高血圧、糖尿病、なし"
                                            />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>L: 最終飲食</span>
                                            <input
                                                type="text"
                                                value={formData.findings?.ample_l || ''}
                                                onChange={e => setFormData(prev => ({ ...prev, findings: { ...prev.findings, ample_l: e.target.value } }))}
                                                className="input"
                                                style={{ marginBottom: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                                placeholder="例: 2時間前昼食"
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>E: 受傷機転・イベント</span>
                                        <textarea
                                            value={formData.findings?.ample_e || ''}
                                            onChange={e => setFormData(prev => ({ ...prev, findings: { ...prev.findings, ample_e: e.target.value } }))}
                                            className="input"
                                            rows={2}
                                            style={{ marginBottom: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                            placeholder="例: 多重追突事故で座席から転落し下腹部を強打"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">患者背景 (生活歴・家族・ADL)</label>
                                    <input
                                        type="text"
                                        name="background"
                            