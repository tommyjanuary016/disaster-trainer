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
    sbp: number;     // 収縮期血圧 (mmHg)
    dbp: number;     // 拡張期血圧 (mmHg)
    hr: number;      // 心拍数 (bpm)
    rr: number;      // 呼吸数 (/min)
    spo2: number;    // 動脈血酸素飽和度 (%)
    temp: number;    // 体温 (℃)
    jcs?: number;    // Japan Coma Scale（意識レベル）
}

export interface Patient {
    // ------------------------------------
    // マスター（CSV由来）データ
    // ------------------------------------
    id: number
    base_patient_id?: number // セッション内で複製された場合の大元のマスターID
    name: string
    age: number
    gender: 'M' | 'F'
    triage_color: TriageColor // 想定トリアージ区分
    scene_triage_color?: TriageColor // 災害現場トリアージ区分
    
    // フリーテキストでのV/S（下位互換用・新規作成時は不要）
    vitals_triage: string // 現場トリアージ時V/S（表示フォールバック用）
    vitals_initial: string // 各診療エリア到着時（初期）V/S（表示フォールバック用）
    vitals_post: string // 処置後V/S（表示フォールバック用）

    // 構造化V/S（新UIで入力されたデータ）
    vitals_triage_struct?: VitalSignStruct  // トリアージ時
    vitals_initial_struct?: VitalSignStruct // 初期評価時（Primary Survey）
    vitals_post_struct?: VitalSignStruct    // 処置後V/S
    vitals_deterioration_struct?: VitalSignStruct // 悪化到達目標バイタル
    
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
    triage_time_ms?: number // トリアージ開始時刻
    initial_vs_time_ms?: number // 診療初期V/S測定時刻
    post_vs_time_ms?: number // 処置完了時刻
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
    examLockTimeMinutes?: number;
    treatmentLockTimeMinutes?: number;
    isTestMode?: boolean;         // 動作確認モード（全拘束時間5秒）
    sessionStartMs?: number;      // セッション作成時のUNIXタイムスタンプ（ms）
    config?: any;                 // セッションの設定全体
}
