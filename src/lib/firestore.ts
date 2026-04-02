// Firestore CRUD操作とモックフォールバック
import {
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    setDoc,
    Unsubscribe,
} from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { Patient } from '../types/patient'
import { mockPatients } from '../data/mockData'

// モック用インメモリストア（モードの場合は変更をここで管理）
const mockStore: Map<number, Patient> = new Map(
    mockPatients.map((p) => [p.id, { ...p }])
)

// セッション管理用
export let activeSessionId: string | null = null

// モックのリスナー登録（疑似リアルタイム同期）
const mockListeners: Map<number, Set<(patient: Patient) => void>> = new Map()

function notifyMockListeners(patientId: number) {
    const patient = mockStore.get(patientId)
    if (!patient) return
    const listeners = mockListeners.get(patientId)
    if (listeners) {
        listeners.forEach((fn) => fn({ ...patient }))
    }
}

// ------------------------------------------------------------------
// 患者データをリアルタイム購読する
// モックモード: インメモリストアを購読
// Firestoreモード: onSnapshotを使用
// ------------------------------------------------------------------
export function subscribeToPatient(
    patientId: number,
    callback: (patient: Patient | null) => void
): Unsubscribe {
    if (USE_MOCK || !db) {
        // モックモード: 現在の値をすぐ返す
        const patient = mockStore.get(patientId)
        callback(patient ? { ...patient } : null)

        // リスナー登録
        if (!mockListeners.has(patientId)) {
            mockListeners.set(patientId, new Set())
        }
        const wrappedCallback = (p: Patient) => callback({ ...p })
        mockListeners.get(patientId)!.add(wrappedCallback)

        return () => {
            mockListeners.get(patientId)?.delete(wrappedCallback)
        }
    }

    // Firestoreモード
    const docRef = doc(db, 'patients', String(patientId))
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data() as Patient)
        } else {
            callback(null)
        }
    })
}

// ------------------------------------------------------------------
// 患者データを一度だけ取得する
// ------------------------------------------------------------------
export async function fetchPatient(patientId: number): Promise<Patient | null> {
    if (USE_MOCK || !db) {
        return mockStore.get(patientId) ?? null
    }
    const docRef = doc(db, 'patients', String(patientId))
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    return snap.data() as Patient
}

// ------------------------------------------------------------------
// すべての患者データを取得する（Admin用）
// ------------------------------------------------------------------
import { collection, getDocs } from 'firebase/firestore'

export async function fetchAllPatients(sessionIdOnly = true): Promise<Patient[]> {
    if (USE_MOCK || !db) {
        const all = Array.from(mockStore.values())
        if (sessionIdOnly && activeSessionId) {
            return all.filter(p => p.session_id === activeSessionId)
        }
        return all
    }
    const collRef = collection(db, 'patients')
    const snap = await getDocs(collRef)
    let docs = snap.docs.map(doc => doc.data() as Patient)
    if (sessionIdOnly && activeSessionId) {
        docs = docs.filter(p => p.session_id === activeSessionId)
    }
    return docs
}

// ------------------------------------------------------------------
// 患者データを新規作成（初期データ投入用）
// ------------------------------------------------------------------
export async function createPatient(patient: Patient): Promise<void> {
    if (USE_MOCK || !db) {
        mockStore.set(patient.id, { ...patient })
        notifyMockListeners(patient.id)
        return
    }
    const docRef = doc(db, 'patients', String(patient.id))
    await setDoc(docRef, patient)
}

// ------------------------------------------------------------------
// アセスメント完了フラグを更新する
// ------------------------------------------------------------------
export async function updateAssessmentCompleted(
    patientId: number,
    completed: boolean
): Promise<void> {
    if (USE_MOCK || !db) {
        const patient = mockStore.get(patientId)
        if (patient) {
            patient.assessment_completed = completed
            // アセスメント完了でステータスを更新
            if (completed && patient.status === '初期状態') {
                patient.status = 'アセスメント完了'
            }
            notifyMockListeners(patientId)
        }
        return
    }
    const docRef = doc(db, 'patients', String(patientId))
    const updates: Partial<Patient> = { assessment_completed: completed }
    // アセスメント完了時はステータスも更新（Firestore側はトランザクション不要のため簡易実装）
    if (completed) {
        const current = await fetchPatient(patientId)
        if (current?.status === '初期状態') {
            updates.status = 'アセスメント完了'
        }
    }
    await updateDoc(docRef, updates as Record<string, unknown>)
}

// ------------------------------------------------------------------
// 患者の特定フラグを更新する（放射線科・検査科・各種完了等）
// ------------------------------------------------------------------
export async function updatePatientFlags(
    patientId: number,
    flags: Partial<Patient>
): Promise<void> {
    if (USE_MOCK || !db) {
        const patient = mockStore.get(patientId)
        if (patient) {
            Object.assign(patient, flags)
            notifyMockListeners(patientId)
        }
        return
    }
    const docRef = doc(db, 'patients', String(patientId))
    await updateDoc(docRef, flags as Record<string, unknown>)
}
// ------------------------------------------------------------------
export async function startTreatmentTimer(
    patientId: number,
    treatmentId: string,
    durationMinutes: number
): Promise<void> {
    const now = Date.now()
    const durationMs = durationMinutes * 60 * 1000

    if (USE_MOCK || !db) {
        const patient = mockStore.get(patientId)
        if (patient) {
            patient.timer_started_at = now
            patient.timer_duration_ms = durationMs
            patient.applied_treatment_id = treatmentId
            patient.status = '処置中'
            notifyMockListeners(patientId)
        }
        return
    }

    const docRef = doc(db, 'patients', String(patientId))
    await updateDoc(docRef, {
        timer_started_at: now,
        timer_duration_ms: durationMs,
        applied_treatment_id: treatmentId,
        status: '処置中',
    })
}

export async function completeTreatment(
    patientId: number,
    _success: boolean
): Promise<void> {
    if (USE_MOCK || !db) {
        const patient = mockStore.get(patientId)
        if (patient) {
            const addedId = patient.applied_treatment_id || 'unknown'
            patient.completed_treatments = patient.completed_treatments || []
            patient.completed_treatments.push(addedId)
            patient.status = 'アセスメント完了' // 継続して処置可能にする
            patient.timer_started_at = null
            patient.timer_duration_ms = null
            patient.applied_treatment_id = null

            // 必須処置がすべて完了したか判定
            if (patient.required_treatments && patient.required_treatments.length > 0) {
                const requiredIds = patient.required_treatments.map(rt => rt.treatment_id)
                const allRequiredMet = requiredIds.every(id => patient.completed_treatments!.includes(id))
                if (allRequiredMet) {
                    patient.stabilization_completed = true
                }
            }

            notifyMockListeners(patientId)
        }
        return
    }

    const docRef = doc(db, 'patients', String(patientId))
    const snap = await getDoc(docRef)
    if (snap.exists()) {
        const p = snap.data() as Patient
        const addedId = p.applied_treatment_id || 'unknown'
        const currentCompleted = p.completed_treatments || []
        const newCompleted = [...currentCompleted, addedId]

        // 必須処置がすべて完了したか判定
        let isStabilized = p.stabilization_completed || false
        if (p.required_treatments && p.required_treatments.length > 0) {
            const requiredIds = p.required_treatments.map(rt => rt.treatment_id)
            const allRequiredMet = requiredIds.every(id => newCompleted.includes(id))
            if (allRequiredMet) {
                isStabilized = true
            }
        }

        await updateDoc(docRef, {
            status: 'アセスメント完了',
            timer_started_at: null,
            timer_duration_ms: null,
            applied_treatment_id: null,
            completed_treatments: newCompleted,
            stabilization_completed: isStabilized
        })
    }
}

// ------------------------------------------------------------------
// Firestoreへの初期データ投入（開発用）
// ------------------------------------------------------------------
export async function seedPatientsToFirestore(patients: Patient[]): Promise<void> {
    for (const patient of patients) {
        await createPatient(patient)
    }
    console.log(`${patients.length}件の患者データを投入しました`)
}

// モックストアをリセット（テスト用）
export function resetMockStore(): void {
    mockStore.clear()
    mockPatients.forEach((p) => mockStore.set(p.id, { ...p }))
    activeSessionId = null
}

// ------------------------------------------------------------------
// セッション（訓練シナリオ）作成ロジック
// ------------------------------------------------------------------
export interface SessionConfig {
    totalPatients: number
    redRatio: number
    yellowRatio: number
    greenRatio: number
    blackRatio: number
    sortBySeverity: boolean // トリアージ順搬入
}

export async function createTrainingSession(config: SessionConfig): Promise<string> {
    const sessionId = 'session_' + Date.now()
    
    // 全マスターデータから取得
    const masterData = await fetchAllPatients(false) 
    // すでにセッションに属しているものは除外してマスタープールとする
    const pool = masterData.filter(p => !p.session_id)

    // 重症度ごとに分類
    const reds = pool.filter(p => p.triage_color === '赤')
    const yellows = pool.filter(p => p.triage_color === '黄')
    const greens = pool.filter(p => p.triage_color === '緑')
    const blacks = pool.filter(p => p.triage_color === '黒')

    // Fisher-Yates shuffle
    const shuffle = (array: any[]) => {
        const arr = [...array]
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr
    }

    const targetRed = Math.floor(config.totalPatients * (config.redRatio / 100))
    const targetYellow = Math.floor(config.totalPatients * (config.yellowRatio / 100))
    const targetGreen = Math.floor(config.totalPatients * (config.greenRatio / 100))
    let targetBlack = config.totalPatients - (targetRed + targetYellow + targetGreen)
    if (targetBlack < 0) targetBlack = 0

    const selected: Patient[] = [
        ...shuffle(reds).slice(0, targetRed),
        ...shuffle(yellows).slice(0, targetYellow),
        ...shuffle(greens).slice(0, targetGreen),
        ...shuffle(blacks).slice(0, targetBlack)
    ]

    // 人数が足りない場合は全カテゴリーからランダムに追加
    if (selected.length < config.totalPatients) {
        const remainingPool = shuffle(pool.filter(p => !selected.includes(p)))
        selected.push(...remainingPool.slice(0, config.totalPatients - selected.length))
    }

    // 順序の決定
    if (config.sortBySeverity) {
        const order = { '赤': 1, '黄': 2, '緑': 3, '黒': 4 }
        selected.sort((a, b) => order[a.triage_color] - order[b.triage_color])
    } else {
        shuffle(selected)
    }

    // セッションに登録（新しいIDを付与して複製）
    activeSessionId = sessionId
    const sessionPatients = selected.map((p, index) => ({
        ...p,
        id: Date.now() + index, // 新規一意ID
        session_id: sessionId,
        status: '初期状態' as any,
        assessment_completed: false,
        reception_time_ms: Date.now(),
        timer_started_at: null,
        timer_duration_ms: null,
        applied_treatment_id: null,
        completed_treatments: []
    }))

    for (const p of sessionPatients) {
        await createPatient(p)
    }

    return sessionId
}

export function setActiveSession(sessionId: string | null) {
    activeSessionId = sessionId
}

// モックかどうかを外部に公開
export { USE_MOCK }
