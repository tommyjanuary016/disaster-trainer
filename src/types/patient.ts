// 患者データのTypeScript型定義

export type TriageColor = '赤' | '黄' | '緑' | '黒'
export type PatientStatus = '初期状態' | 'アセスメント完了' | '処置中' | '安定化済' | '悪化'

export interface PatientFindings {
    head_and_neck: string
    chest: string
    abdomen_and_pelvis: string
    limbs: string
    fast: string
    ample: string
    background: string
}

export interface RequiredTreatment {
    treatment_id: string
    treatment_name: string
    lock_timer_minutes: number
}

export interface Patient {
    id: number
    name: string
    age: number
    gender: 'M' | 'F'
    triage_color: TriageColor
    vitals_triage: string
    vitals_initial: string
    vitals_post: string
    findings: PatientFindings
    diagnosis: string
    required_treatments: RequiredTreatment[]
    // Firestoreで管理する動的ステータスフィールド
    status: PatientStatus
    assessment_completed: boolean // アセスメント完了フラグ
    timer_started_at: number | null // タイマー開始Unixタイムスタンプ（ms）
    timer_duration_ms: number | null // タイマー合計時間（ms）
    applied_treatment_id: string | null // 実施された処置ID
    completed_treatments?: string[] // 完了した処置IDのリスト
}
