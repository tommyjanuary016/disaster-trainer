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

export async function fetchAllPatients(): Promise<Patient[]> {
    if (USE_MOCK || !db) {
        return Array.from(mockStore.values())
    }
    const collRef = collection(db, 'patients')
    const snap = await getDocs(collRef)
    return snap.docs.map(doc => doc.data() as Patient)
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
// タイマーを開始する（全端末に同期される）
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

        await updateDoc(docRef, {
            status: 'アセスメント完了',
            timer_started_at: null,
            timer_duration_ms: null,
            applied_treatment_id: null,
            completed_treatments: newCompleted
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
}

// モックかどうかを外部に公開
export { USE_MOCK }
