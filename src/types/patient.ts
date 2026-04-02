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
    background: string // 生活歴・家族情報 に相当
}

export interface RequiredTreatment {
    treatment_id: string
    treatment_name: string
    lock_timer_minutes: number
}

export interface VitalSignStruct {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    spo2: number;
    temp: number;
}

export interface Patient {
    // ------------------------------------
    // マスター（CSV由来）データ
    // ------------------------------------
    id: number
    name: string
    age: number
    gender: 'M' | 'F'
    triage_color: TriageColor
    
    // フリーテキストでのV/S
    vitals_triage: string
    vitals_initial: string // 各診療エリアV/S
    vitals_post: string

    // 線形悪化計算用の構造化V/S（任意）
    vitals_initial_struct?: VitalSignStruct
    vitals_post_struct?: VitalSignStruct
    
    findings: PatientFindings
    diagnosis: string
    
    // システム上の旧必須処置リスト (ロックタイマー発動用)
    required_treatments: RequiredTreatment[]
    
    // 新規テキスト項目
    necessary_tests_and_treatments?: string // 必要検査・安定処置 (管理者・裏方用)
    policy?: string // 方針
    image_urls?: string[] // 画像テストのURLリスト
    blood_test_data?: string // 血液検査データの所見テキスト
    acting_instructions?: string // 演技内容 (模擬患者用)

    // 線形悪化・蘇生の設定
    deterioration_enabled?: boolean // 悪化するかどうか
    deterioration_time_minutes?: number // 悪化にかかる時間（分）
    rosc_possible?: boolean // CPRによるROSCが可能かどうか
    vitals_rosc_struct?: VitalSignStruct // ROSC成功した場合の目標バイタル

    // ------------------------------------
    // トランザクション（動的）データ
    // ------------------------------------
    session_id?: string // セッションID（全体共有プールの場合は未定義）
    status: PatientStatus
    assessment_completed: boolean // アセスメント完了フラグ
    reception_time_ms?: number // 診療開始・受付時間 (タイマー・悪化の起点)
    timer_started_at: number | null // ロックタイマー開始Unixタイムスタンプ（ms）
    timer_duration_ms: number | null // ロックタイマー合計時間（ms）
    applied_treatment_id: string | null // 実施された処置ID
    completed_treatments?: string[] // 完了した処置IDのリスト
    
    // 新しいフラグ
    tests_completed?: boolean // 放射線・検査科での検査が完了したか
    stabilization_completed?: boolean // 安定化処置がすべて完了し、悪化が停止したか
}

// 訓練セッションの型定義
export interface TrainingSession {
    id: string;
    title: string;
    date: string;
    isActive: boolean;
    totalPatients: number;
    // 割合設定など拡張可能
}
