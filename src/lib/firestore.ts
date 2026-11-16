// Firestore CRUD操作とモックフォールバック
import {
    doc,
    getDoc,
    onSnapshot,
    updateDoc,
    setDoc,
    deleteDoc,
    runTransaction,
    Unsubscribe,
    collection,
    getDocs,
    writeBatch,
    query,
    where,
} from 'firebase/firestore'
import { db, USE_MOCK } from './firebase'
import { Patient, TrainingSession, PatientDisposition, ActiveTreatment } from '../types/patient'
export type { Patient, TrainingSession, PatientDisposition, ActiveTreatment } from '../types/patient'
import { mockPatients } from '../data/mockData'
import { getIsExperienceMode } from '../hooks/useExperienceMode'

// 操作体験モード (他スマホと連動しないモード) 用の端末ローカルストア
const experienceStore: Map<number, Patient> = new Map()
const experienceListeners: Map<number, Set<(patient: Patient) => void>> = new Map()

function getOrInitExperiencePatient(patientId: number, basePatient?: Patient | null): Patient | null {
    if (experienceStore.has(patientId)) {
        return experienceStore.get(patientId)!
    }
    const source = basePatient || mockStore.get(patientId) || mockPatients.find(p => p.id === patientId)
    if (source) {
        const cloned: Patient = JSON.parse(JSON.stringify(source))
        // 体験モードでは常に真っさらな初期状態から開始する
        cloned.status = '未トリアージ'
        cloned.triage_color = null
        cloned.triage_completed_at = undefined
        cloned.assessment_completed = false
        cloned.tests_completed = false
        cloned.treatment_completed = false
        cloned.applied_treatment_id = undefined
        cloned.applied_treatments = []
        cloned.completed_exams = []
        cloned.lock_timer_end = undefined
        cloned.lock_timer_minutes = undefined
        cloned.current_treatment_id = undefined
        cloned.disposition = undefined
        cloned.disposition_time = undefined
        cloned.is_deteriorating = false
        cloned.vital_history = []
        cloned.action_logs = []
        experienceStore.set(patientId, cloned)
        return cloned
    }
    return null
}

function notifyExperienceListeners(patientId: number) {
    const p = experienceStore.get(patientId)
    if (!p) return
    const listeners = experienceListeners.get(patientId)
    if (listeners) {
        listeners.forEach(fn => fn(JSON.parse(JSON.stringify(p))))
    }
}

// モック用インメモリストア（モードの場合は変更をここで管理）
const mockStore: Map<number, Patient> = new Map(
    mockPatients.map((p) => [p.id, { ...p }])
)

// セッション管理用（localStorageで永続化）
const STORAGE_KEY_SESSION = 'disaster_active_session_id'
export let activeSessionId: string | null = localStorage.getItem(STORAGE_KEY_SESSION) || 'session-2026-demo'

// モックセッションストア（モックモードでセッション情報を保持）
const DEFAULT_MOCK_SESSION: TrainingSession = {
    id: 'session-2026-demo',
    title: '2026年度 災害医療実地訓練（本番）',
    createdAt: new Date().toISOString(),
    date: new Date().toISOString(),
    isActive: true,
    status: 'active',
    examLockTimeMinutes: 1,
    treatmentLockTimeMinutes: 5,
    isTestMode: false,
    config: {
        examLockTimeMinutes: 1,
        treatmentLockTimeMinutes: 5,
        isTestMode: false,
    },
    totalPatients: mockPatients.length,
    sessionStartMs: Date.now() - 1000 * 60 * 15,
}
const mockSessionStore: Map<string, any> = new Map([
    [DEFAULT_MOCK_SESSION.id, DEFAULT_MOCK_SESSION],
])
const mockSessionListeners: Map<string, Set<(session: TrainingSession | null) => void>> = new Map()

function notifyMockSessionListeners(sessionId: string) {
    const meta = mockSessionStore.get(sessionId) || null
    const listeners = mockSessionListeners.get(sessionId)
    if (listeners) {
        listeners.forEach(fn => fn(meta ? { ...meta } : null))
    }
}

// モック患者の初期状態（セッションIDを付与）
mockStore.forEach((p, id) => {
    p.session_id = DEFAULT_MOCK_SESSION.id
    if (id === 1) {
        p.status = '診察中'
        p.assessment_completed = true
    } else if (id === 2) {
        p.status = '処置中'
        p.applied_treatment_id = 'needle_decompression'
        p.assessment_completed = true
    } else if (id === 3) {
        p.status = '処置完了'
        p.assessment_completed = true
        p.completed_treatments = ['iv_fluid']
    } else if (id === 4) {
        p.status = '待機中'
    } else if (id === 5) {
        p.status = '搬入済'
    }
})

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
// 端末ごとの「自分が開始した進行中アクション」管理（同時アクション時の自端末のみロック用）
// ------------------------------------------------------------------
const STORAGE_KEY_MY_ACTIONS = 'disaster_my_active_actions'

export function getMyActiveAction(patientId: number): ActiveTreatment | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_MY_ACTIONS)
        if (!raw) return null
        const map = JSON.parse(raw) as Record<string, ActiveTreatment>
        return map[String(patientId)] || null
    } catch {
        return null
    }
}

export function setMyActiveAction(patientId: number, action: ActiveTreatment): void {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_MY_ACTIONS)
        const map: Record<string, ActiveTreatment> = raw ? JSON.parse(raw) : {}
        map[String(patientId)] = action
        localStorage.setItem(STORAGE_KEY_MY_ACTIONS, JSON.stringify(map))
    } catch (e) {
        console.error('Failed to save my active action:', e)
    }
}

export function clearMyActiveAction(patientId: number, actionId?: string): void {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_MY_ACTIONS)
        if (!raw) return
        const map = JSON.parse(raw) as Record<string, ActiveTreatment>
        const current = map[String(patientId)]
        if (!current) return
        if (!actionId || current.action_id === actionId) {
            delete map[String(patientId)]
            localStorage.setItem(STORAGE_KEY_MY_ACTIONS, JSON.stringify(map))
        }
    } catch (e) {
        console.error('Failed to clear my active action:', e)
    }
}

// セッション状態のインメモリキャッシュ（一時停止中の自動完了抑制用）
const sessionStatusCache: Map<string, TrainingSession> = new Map()
const pendingAutoCompletions = new Set<string>()

function updateSessionCache(session: TrainingSession | null) {
    if (session?.id) {
        sessionStatusCache.set(session.id, session)
    }
}

/** 患者から現在の有効な進行中アクション一覧を取得（レガシー単一タイマー互換） */
function getNormalizedActiveTreatments(patient: Patient): ActiveTreatment[] {
    if (patient.active_treatments && patient.active_treatments.length > 0) {
        return patient.active_treatments
    }
    if (
        patient.status === '処置中' &&
        patient.timer_started_at != null &&
        patient.timer_duration_ms != null &&
        patient.applied_treatment_id
    ) {
        return [{
            action_id: `legacy_${patient.timer_started_at}`,
            treatment_id: patient.applied_treatment_id,
            started_at: patient.timer_started_at,
            duration_ms: patient.timer_duration_ms,
        }]
    }
    return []
}

/** 処置・診察開始時の患者ステータス算出ヘルパー */
function applyStartTreatmentToPatient(data: Patient, newAction: ActiveTreatment, now: number) {
    const existingActive = getNormalizedActiveTreatments(data)
    const expired = existingActive.filter(at => now >= at.started_at + at.duration_ms)
    const stillRunning = existingActive.filter(at => now < at.started_at + at.duration_ms)

    const completed = [...(data.completed_treatments || [])]
    for (const exp of expired) {
        if (!completed.includes(exp.treatment_id)) {
            completed.push(exp.treatment_id)
        }
    }
    const nextActive = [...stillRunning, newAction]

    return {
        active_treatments: nextActive,
        completed_treatments: completed,
        timer_started_at: newAction.started_at,
        timer_duration_ms: newAction.duration_ms,
        applied_treatment_id: newAction.treatment_id,
        status: '処置中' as Patient['status'],
    }
}

/** 処置・診察完了時の患者ステータス算出ヘルパー */
function applyCompleteTreatmentToPatient(data: Patient, targetActionIds?: string[] | string, now: number = Date.now()) {
    const existingActive = getNormalizedActiveTreatments(data)
    let toComplete: ActiveTreatment[] = []
    let remaining: ActiveTreatment[] = []

    if (targetActionIds !== undefined) {
        const idSet = new Set(Array.isArray(targetActionIds) ? targetActionIds : [targetActionIds])
        toComplete = existingActive.filter(at => idSet.has(at.action_id))
        remaining = existingActive.filter(at => !idSet.has(at.action_id))
    } else {
        const expired = existingActive.filter(at => now >= at.started_at + at.duration_ms)
        if (expired.length > 0) {
            toComplete = expired
            remaining = existingActive.filter(at => now < at.started_at + at.duration_ms)
        } else if (existingActive.length > 0) {
            // 手動強制完了など: 先頭または最後のアクションを完了
            toComplete = [existingActive[existingActive.length - 1]]
            remaining = existingActive.slice(0, -1)
        }
    }

    const currentCompleted = data.completed_treatments || []
    const newCompleted = [...currentCompleted]
    if (toComplete.length > 0) {
        for (const item of toComplete) {
            if (item.treatment_id && !newCompleted.includes(item.treatment_id)) {
                newCompleted.push(item.treatment_id)
            }
        }
    } else if (targetActionIds === undefined && data.applied_treatment_id && !newCompleted.includes(data.applied_treatment_id)) {
        // active_treatments も仮想タイマーも無いが applied_treatment_id だけ残っていた場合のフォールバック
        newCompleted.push(data.applied_treatment_id)
    }

    // 必須処置がすべて完了したか判定
    let isStabilized = data.stabilization_completed || false
    let postVsTimeMs = data.post_vs_time_ms
    if (data.required_treatments && data.required_treatments.length > 0) {
        const requiredIds = data.required_treatments.map(rt => rt.treatment_id)
        const allRequiredMet = requiredIds.every(id => newCompleted.includes(id))
        if (allRequiredMet) {
            isStabilized = true
            if (!postVsTimeMs) postVsTimeMs = now
        }
    }

    if (remaining.length > 0) {
        const latest = remaining[remaining.length - 1]
        return {
            active_treatments: remaining,
            completed_treatments: newCompleted,
            stabilization_completed: isStabilized,
            post_vs_time_ms: postVsTimeMs ?? null,
            status: '処置中' as Patient['status'],
            timer_started_at: latest.started_at,
            timer_duration_ms: latest.duration_ms,
            applied_treatment_id: latest.treatment_id,
        }
    }

    return {
        active_treatments: [] as ActiveTreatment[],
        completed_treatments: newCompleted,
        stabilization_completed: isStabilized,
        post_vs_time_ms: postVsTimeMs ?? null,
        status: (isStabilized ? '処置完了' : 'アセスメント完了') as Patient['status'],
        timer_started_at: null,
        timer_duration_ms: null,
        applied_treatment_id: null,
    }
}

/**
 * 患者の処置タイマーが満了（期限切れ）している場合、
 * 即座に「完了状態に変換した患者データ」を同期的に返却しつつ、
 * 非同期で completeTreatment を実行して Firestore / mockStore を同期する（1周遅れ解決）
 */
export function checkAutoTimerExpiration(patient: Patient | null): Patient | null {
    if (!patient) return null

    // セッションが一時停止中または準備中の場合は自動完了を実行しない
    if (patient.session_id) {
        const cached = sessionStatusCache.get(patient.session_id) || mockSessionStore.get(patient.session_id)
        if (cached?.status === 'paused' || cached?.status === 'preparing') {
            return patient
        }
    }

    const activeList = getNormalizedActiveTreatments(patient)
    if (activeList.length === 0) return patient

    const now = Date.now()
    const expired = activeList.filter(at => now >= at.started_at + at.duration_ms)
    if (expired.length === 0) return patient

    const expiredIds = expired.map(at => at.action_id)
    const lockKey = `${patient.id}:${expiredIds.join(',')}`
    if (!pendingAutoCompletions.has(lockKey)) {
        pendingAutoCompletions.add(lockKey)
        completeTreatment(patient.id, true, expiredIds)
            .catch(e => console.error('Auto check complete error:', e))
            .finally(() => {
                setTimeout(() => pendingAutoCompletions.delete(lockKey), 3000)
            })
    }

    // 自端末のアクションが満了していたらローカル保存も掃除
    const myAction = getMyActiveAction(patient.id)
    if (myAction && expiredIds.includes(myAction.action_id)) {
        clearMyActiveAction(patient.id, myAction.action_id)
    }

    const nextFields = applyCompleteTreatmentToPatient(patient, expiredIds, now)
    return {
        ...patient,
        ...nextFields,
        post_vs_time_ms: nextFields.post_vs_time_ms ?? patient.post_vs_time_ms,
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
    // 操作体験モード (他スマホと連動しないモード)
    if (getIsExperienceMode()) {
        const p = getOrInitExperiencePatient(patientId)
        callback(checkAutoTimerExpiration(p ? JSON.parse(JSON.stringify(p)) : null))

        if (!experienceListeners.has(patientId)) {
            experienceListeners.set(patientId, new Set())
        }
        const wrapped = (updated: Patient) => callback(checkAutoTimerExpiration(JSON.parse(JSON.stringify(updated))))
        experienceListeners.get(patientId)!.add(wrapped)

        return () => {
            experienceListeners.get(patientId)?.delete(wrapped)
        }
    }

    if (USE_MOCK || !db) {
        // モックモード: 現在の値をすぐ返す
        const raw = mockStore.get(patientId)
        const patient = checkAutoTimerExpiration(raw ? { ...raw } : null)
        callback(patient)

        // リスナー登録
        if (!mockListeners.has(patientId)) {
            mockListeners.set(patientId, new Set())
        }
        const wrappedCallback = (p: Patient) => callback(checkAutoTimerExpiration({ ...p }))
        mockListeners.get(patientId)!.add(wrappedCallback)

        return () => {
            mockListeners.get(patientId)?.delete(wrappedCallback)
        }
    }

    // Firestoreモード
    const docRef = doc(db, 'patients', String(patientId))
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            const p = snap.data() as Patient
            const resolved = checkAutoTimerExpiration(p)
            callback(resolved)
        } else {
            callback(null)
        }
    })
}

// ------------------------------------------------------------------
// 患者データを一度だけ取得する
// ------------------------------------------------------------------
export async function fetchPatient(patientId: number): Promise<Patient | null> {
    // 操作体験モード (他スマホと連動しないモード)
    if (getIsExperienceMode()) {
        const p = getOrInitExperiencePatient(patientId)
        return checkAutoTimerExpiration(p ? JSON.parse(JSON.stringify(p)) : null)
    }

    if (USE_MOCK || !db) {
        const p = mockStore.get(patientId) ?? null
        return checkAutoTimerExpiration(p ? { ...p } : null)
    }
    const docRef = doc(db, 'patients', String(patientId))
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    const p = snap.data() as Patient
    return checkAutoTimerExpiration(p)
}

/**
 * ID (絶対ID, base_patient_id, 通し番号, 末尾番号等) で柔軟に患者を検索する
 */
export async function fetchPatientFlexible(queryIdStr: string | number): Promise<Patient | null> {
    const numId = typeof queryIdStr === 'number' ? queryIdStr : parseInt(queryIdStr, 10)
    if (isNaN(numId)) return null

    // 1. 完全一致IDで探す
    const direct = await fetchPatient(numId)
    if (direct) return direct

    // 2. セッション内の患者一覧を取得して柔軟マッチ
    const allPatients = await fetchAllPatients(true)
    if (allPatients.length === 0) {
        const fallbackAll = await fetchAllPatients(false)
        allPatients.push(...fallbackAll)
    }

    // 2a. base_patient_id で検索
    const byBaseId = allPatients.find(p => p.base_patient_id === numId)
    if (byBaseId) return byBaseId

    // 2b. id で検索
    const byId = allPatients.find(p => p.id === numId)
    if (byId) return byId

    // 2c. 末尾番号 (id % 1000 または id % 100) で検索
    const byMod1000 = allPatients.find(p => (p.id % 1000) === numId || (p.id % 100) === numId)
    if (byMod1000) return byMod1000

    // 2d. 1始まりの通し番号 (インデックス + 1) で検索
    // トリアージ区分等の並び順でソートされたインデックスに対応
    const order: Record<string, number> = { '赤': 1, '黄': 2, '緑': 3, '黒': 4 }
    const sorted = [...allPatients].sort((a, b) => (order[a.triage_color] || 9) - (order[b.triage_color] || 9) || a.id - b.id)
    if (numId >= 1 && numId <= sorted.length) {
        return sorted[numId - 1]
    }

    return null
}


// ------------------------------------------------------------------
// すべての患者データを取得する（Admin用）
// ------------------------------------------------------------------

export async function fetchAllPatients(sessionIdOnly = true, explicitSessionId?: string): Promise<Patient[]> {
    const targetSessionId = explicitSessionId !== undefined ? explicitSessionId : (sessionIdOnly ? activeSessionId : null)
    if (USE_MOCK || !db) {
        const all = Array.from(mockStore.values()).map(p => {
            checkAutoTimerExpiration(p)
            return p
        })
        if (targetSessionId) {
            return all.filter(p => p.session_id === targetSessionId)
        }
        return all
    }
    const collRef = collection(db, 'patients')
    let snap
    if (targetSessionId) {
        const q = query(collRef, where('session_id', '==', targetSessionId))
        snap = await getDocs(q)
    } else {
        snap = await getDocs(collRef)
    }
    let docs = snap.docs.map(doc => {
        const p = doc.data() as Patient
        checkAutoTimerExpiration(p)
        return p
    })
    return docs
}

// ------------------------------------------------------------------
// 全患者データをリアルタイム購読する（Admin用）
// ------------------------------------------------------------------


export function subscribeToAllPatients(
    callback: (patients: Patient[]) => void,
    sessionIdOnly = true,
    explicitSessionId?: string // 明示的に指定する場合（未指定時は activeSessionId を使用）
): Unsubscribe {
    const targetSessionId = explicitSessionId !== undefined ? explicitSessionId : (sessionIdOnly ? activeSessionId : null)
    if (USE_MOCK || !db) {
        // モックモード: 初回の通知
        const notify = () => {
            const all = Array.from(mockStore.values()).map(p => {
                checkAutoTimerExpiration(p)
                return p
            })
            if (targetSessionId) {
                callback(all.filter(p => p.session_id === targetSessionId))
            } else {
                callback(all)
            }
        }
        notify()

        const intervalId = setInterval(notify, 1000)
        return () => clearInterval(intervalId)
    }

    // Firestoreモード
    const collRef = collection(db, 'patients')
    let q = query(collRef)
    if (targetSessionId) {
        q = query(collRef, where('session_id', '==', targetSessionId))
    }

    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map(doc => {
            const p = doc.data() as Patient
            checkAutoTimerExpiration(p)
            return p
        })
        callback(docs)
    })
}

// ------------------------------------------------------------------
// 施設独自の追加患者（custom_patients）を取得する
// ------------------------------------------------------------------
export async function fetchCustomPatients(): Promise<Patient[]> {
    if (USE_MOCK || !db) {
        // モックモードではカスタム患者は0件（基礎25名のみ）
        return []
    }
    const collRef = collection(db, 'custom_patients')
    const snap = await getDocs(collRef)
    return snap.docs.map(doc => doc.data() as Patient)
}

// ------------------------------------------------------------------
// 施設独自の追加患者を保存する
// ------------------------------------------------------------------
export async function saveCustomPatient(patient: Patient): Promise<void> {
    if (USE_MOCK || !db) {
        // モックモードではメモリ上に保存
        mockStore.set(patient.id, { ...patient })
        notifyMockListeners(patient.id)
        return
    }
    const docRef = doc(db, 'custom_patients', String(patient.id))
    await setDoc(docRef, patient)
}

// ------------------------------------------------------------------
// カスタム患者を一括削除する
// ------------------------------------------------------------------
export async function deleteAllCustomPatients(): Promise<void> {
    if (USE_MOCK || !db) return
    const collRef = collection(db, 'custom_patients')
    const snap = await getDocs(collRef)
    const batch = writeBatch(db)
    snap.docs.forEach(d => {
        batch.delete(d.ref)
    })
    await batch.commit()
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
// 単一患者データを削除する
// ------------------------------------------------------------------
export async function deletePatient(patientId: number): Promise<void> {
    if (USE_MOCK || !db) {
        mockStore.delete(patientId)
        return
    }
    const { deleteDoc } = await import('firebase/firestore')
    const docRef = doc(db, 'patients', String(patientId))
    await deleteDoc(docRef)
    
    // custom_patients にも存在すれば併せて削除
    try {
        const customRef = doc(db, 'custom_patients', String(patientId))
        await deleteDoc(customRef)
    } catch (e) {
        // 無視
    }
}

// ------------------------------------------------------------------
// アセスメント完了フラグを更新する
// ------------------------------------------------------------------
export async function updateAssessmentCompleted(
    patientId: number,
    completed: boolean
): Promise<void> {
    if (getIsExperienceMode()) {
        const patient = getOrInitExperiencePatient(patientId)
        if (patient) {
            patient.assessment_completed = completed
            if (completed && patient.status === '初期状態') {
                patient.status = 'アセスメント完了'
            }
            notifyExperienceListeners(patientId)
        }
        return
    }

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
    if (getIsExperienceMode()) {
        const patient = getOrInitExperiencePatient(patientId)
        if (patient) {
            Object.assign(patient, flags)
            notifyExperienceListeners(patientId)
        }
        return
    }

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
// 患者の搬出・転帰（Disposition）を確定する
// ------------------------------------------------------------------
export async function updatePatientDisposition(
    patientId: number,
    disposition: PatientDisposition
): Promise<void> {
    await updatePatientFlags(patientId, { disposition })
}
// ------------------------------------------------------------------
// 処置・診察タイマーを開始する（診療エリアでは複数人同時アクション可）
// ------------------------------------------------------------------
export async function startTreatmentTimer(
    patientId: number,
    treatmentId: string,
    durationMinutes: number
): Promise<ActiveTreatment> {
    const now = Date.now()
    const durationMs = durationMinutes * 60 * 1000
    const actionId = `${treatmentId}_${now}_${Math.random().toString(36).slice(2, 6)}`
    const newAction: ActiveTreatment = {
        action_id: actionId,
        treatment_id: treatmentId,
        started_at: now,
        duration_ms: durationMs,
    }

    // この端末自身が開始したアクションとして保存（自端末のみロック表示するため）
    setMyActiveAction(patientId, newAction)

    if (getIsExperienceMode()) {
        const patient = getOrInitExperiencePatient(patientId)
        if (patient) {
            Object.assign(patient, applyStartTreatmentToPatient(patient, newAction, now))
            notifyExperienceListeners(patientId)
        }
        return newAction
    }

    if (USE_MOCK || !db) {
        const patient = mockStore.get(patientId)
        if (patient) {
            Object.assign(patient, applyStartTreatmentToPatient(patient, newAction, now))
            notifyMockListeners(patientId)
        }
        return newAction
    }

    const docRef = doc(db, 'patients', String(patientId))
    await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef)
        if (!docSnap.exists()) {
            throw new Error('Patient does not exist')
        }
        const data = docSnap.data() as Patient
        const updates = applyStartTreatmentToPatient(data, newAction, now)
        transaction.update(docRef, updates as Record<string, unknown>)
    })
    return newAction
}

export async function completeTreatment(
    patientId: number,
    _success: boolean,
    targetActionIds?: string[] | string
): Promise<void> {
    const now = Date.now()

    if (getIsExperienceMode()) {
        const patient = getOrInitExperiencePatient(patientId)
        if (patient) {
            const updates = applyCompleteTreatmentToPatient(patient, targetActionIds, now)
            Object.assign(patient, {
                ...updates,
                post_vs_time_ms: updates.post_vs_time_ms ?? patient.post_vs_time_ms,
            })
            notifyExperienceListeners(patientId)
        }
        return
    }

    if (USE_MOCK || !db) {
        const patient = mockStore.get(patientId)
        if (patient) {
            const updates = applyCompleteTreatmentToPatient(patient, targetActionIds, now)
            Object.assign(patient, {
                ...updates,
                post_vs_time_ms: updates.post_vs_time_ms ?? patient.post_vs_time_ms,
            })
            notifyMockListeners(patientId)
        }
        return
    }

    const docRef = doc(db, 'patients', String(patientId))
    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef)
        if (!snap.exists()) return
        const p = snap.data() as Patient
        const updates = applyCompleteTreatmentToPatient(p, targetActionIds, now)
        const payload: Record<string, unknown> = {
            active_treatments: updates.active_treatments,
            completed_treatments: updates.completed_treatments,
            stabilization_completed: updates.stabilization_completed,
            status: updates.status,
            timer_started_at: updates.timer_started_at,
            timer_duration_ms: updates.timer_duration_ms,
            applied_treatment_id: updates.applied_treatment_id,
        }
        if (updates.post_vs_time_ms != null) {
            payload.post_vs_time_ms = updates.post_vs_time_ms
        }
        transaction.update(docRef, payload)
    })
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
    title: string                // セッションのタイトル
    totalPatients: number
    redRatio: number
    yellowRatio: number
    greenRatio: number
    blackRatio: number
    sortBySeverity: boolean      // トリアージ順搬入
    useBasePatients: boolean     // 基礎25名（アプリ内蔵）を使用するか
    examLockTimeMinutes: number  // 身体診察・評価のデフォルト拘束時間
    treatmentLockTimeMinutes: number // 手技（点滴・外科処置など）のデフォルト拘束時間
    customProcedureLockTimes?: Record<string, number> // 手技別個別拘束時間設定 (分)
    isTestMode?: boolean         // 動作確認モード：全拘束時間を5秒に短縮
    selectedScenarios?: string[] // 使用するシナリオタグのリスト（空なら全対象）
    useExactScenarioMatch?: boolean // 指定したシナリオの患者を「そのまま全員」使用する（割合抽出を無視）
    selectedPatientIds?: number[] // 個別選択モードで選ばれた患者ID一覧
    startImmediately?: boolean    // true: 作成後すぐに訓練開始 / false: 事前準備（preparing）として作成
}

export async function createTrainingSession(config: SessionConfig): Promise<string> {
    const now = Date.now()
    const sessionId = 'session_' + now
    
    // Fisher-Yates shuffle
    const shuffle = (array: any[]) => {
        const arr = [...array]
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr
    }

    // 患者プールの構築
    // 1. 基礎患者（25名）： mockPatientsから（useBasePatients=trueの場合）
    // 2. 施設独自追加分： Firestore custom_patientsコレクションから
    const basePool: Patient[] = config.useBasePatients
        ? mockPatients.map(p => ({ ...p, is_base_patient: true } as any))
        : []
    
    // Firestoreでのカスタム患者取得
    const customPool: Patient[] = await fetchCustomPatients()
    const allPool = [...basePool, ...customPool]
    
    // マスターデータ（Firestore）からも取得する（既にセッションに属しているものは除外）
    const masterData = await fetchAllPatients(false)
    const mockIds = new Set(mockPatients.map(p => p.id))
    const firestorePool = masterData.filter(p => !p.session_id && (config.useBasePatients || !mockIds.has(p.id)))
    
    // プール = allPool に firestorePool を追加（両方にある場合は重複排除）
    const idSet = new Set(allPool.map(p => p.id))
    const merged = [...allPool, ...firestorePool.filter(p => !idSet.has(p.id))]
    let pool = merged

    // 個別選択された患者IDがある場合は最優先でその患者を抽出
    let selected: Patient[] = []
    if (config.selectedPatientIds && config.selectedPatientIds.length > 0) {
        const selectedIdSet = new Set(config.selectedPatientIds)
        selected = pool.filter(p => selectedIdSet.has(p.id))
    } else {
        // シナリオタグでフィルタリング
        if (config.selectedScenarios && config.selectedScenarios.length > 0) {
            pool = pool.filter(p => config.selectedScenarios!.includes(p.scenario_tag || '基本'))
        }

        if (config.useExactScenarioMatch) {
            // 割合指定を無視し、プールにある患者をそのまま全員使用する
            selected = [...pool]
        } else {
            // 重症度ごとに分類してランダム抽出
            const reds = pool.filter(p => p.triage_color === '赤')
            const yellows = pool.filter(p => p.triage_color === '黄')
            const greens = pool.filter(p => p.triage_color === '緑')
            const blacks = pool.filter(p => p.triage_color === '黒')

            const targetRed = Math.floor(config.totalPatients * (config.redRatio / 100))
            const targetYellow = Math.floor(config.totalPatients * (config.yellowRatio / 100))
            const targetGreen = Math.floor(config.totalPatients * (config.greenRatio / 100))
            let targetBlack = config.totalPatients - (targetRed + targetYellow + targetGreen)
            if (targetBlack < 0) targetBlack = 0

            selected = [
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
        }
    }

    // 順序の決定
    if (config.sortBySeverity) {
        const order: Record<string, number> = { '赤': 1, '黄': 2, '緑': 3, '黒': 4 }
        selected.sort((a, b) => (order[a.triage_color] || 9) - (order[b.triage_color] || 9))
    } else {
        selected = shuffle(selected)
    }

    // セッションに登録（新しいIDを付与して複製）
    // 動作確認モードの場合、全拘束時間を5秒に短縮する
    const TEST_MODE_LOCK_MINUTES = 5 / 60 // 5秒 = 0.0833...分
    const isStartingNow = config.startImmediately !== false
    const sessionStartMs = isStartingNow ? now : 0

    if (isStartingNow) {
        activeSessionId = sessionId
        localStorage.setItem(STORAGE_KEY_SESSION, sessionId) // localStorage にも保存
    }

    const sessionPatients = selected.map((p, index) => ({
        ...p,
        id: now + index, // 新規一意ID
        base_patient_id: p.id,
        session_id: sessionId,
        status: '初期状態' as any,
        assessment_completed: false,
        reception_time_ms: sessionStartMs,
        timer_started_at: null,
        timer_duration_ms: null,
        applied_treatment_id: null,
        completed_treatments: [],
        active_treatments: [],
        // 動作確認モード時は拘束時間を一律5秒に強制上書き、または個別カスタム時間が設定されていればそれを適用
        required_treatments: p.required_treatments?.map(rt => {
            if (config.isTestMode) {
                return { ...rt, lock_timer_minutes: TEST_MODE_LOCK_MINUTES }
            }
            if (config.customProcedureLockTimes && config.customProcedureLockTimes[rt.treatment_id] !== undefined) {
                return { ...rt, lock_timer_minutes: config.customProcedureLockTimes[rt.treatment_id] }
            }
            return rt
        }) || []
    }))

    // セッションメタデータを作成（Firestore互換のため undefined を除去）
    const sanitizedConfig = JSON.parse(JSON.stringify(config))
    const sessionMeta: TrainingSession = {
        id: sessionId,
        title: config.title || `訓練セッション ${new Date().toLocaleString('ja-JP')}`,
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(),
        isActive: isStartingNow,
        status: isStartingNow ? 'active' : 'preparing',
        pausedAtMs: null,
        totalPausedDurationMs: 0,
        examLockTimeMinutes: config.examLockTimeMinutes,
        treatmentLockTimeMinutes: config.treatmentLockTimeMinutes,
        isTestMode: config.isTestMode || false,
        config: sanitizedConfig,
        totalPatients: sessionPatients.length,
        sessionStartMs,
    }

    // モックストア・キャッシュにも保存
    mockSessionStore.set(sessionId, sessionMeta)
    updateSessionCache(sessionMeta)

    for (const p of sessionPatients) {
        await createPatient(p)
    }

    // Firestoreにセッションメタデータを保存
    if (!USE_MOCK && db) {
        const sessionRef = doc(db, 'sessions', sessionId)
        await setDoc(sessionRef, sessionMeta as any)
    }

    return sessionId
}

export function setActiveSession(sessionId: string | null) {
    activeSessionId = sessionId
    if (sessionId) {
        localStorage.setItem(STORAGE_KEY_SESSION, sessionId)
    } else {
        localStorage.removeItem(STORAGE_KEY_SESSION)
    }
}

// ------------------------------------------------------------------
// アクティブな訓練セッション一覧を取得する（プレイヤー参加可能：訓練中のみ）
// ------------------------------------------------------------------
export async function fetchActiveSessions(): Promise<TrainingSession[]> {
    const isJoinable = (s: TrainingSession) => {
        const st = s.status || (s.isActive ? 'active' : 'ended')
        return st === 'active'
    }

    if (USE_MOCK || !db) {
        const sessions: TrainingSession[] = []
        mockSessionStore.forEach((meta) => {
            if (isJoinable(meta as TrainingSession)) sessions.push(meta as TrainingSession)
        })
        return sessions
    }
    const collRef = collection(db, 'sessions')
    const snap = await getDocs(query(collRef, where('isActive', '==', true)))
    return snap.docs
        .map(d => d.data() as TrainingSession)
        .filter(isJoinable)
}

// ------------------------------------------------------------------
// 管理画面用：全セッション一覧（準備中・訓練中・一時停止・終了済み）を取得
// ------------------------------------------------------------------
export async function fetchManageableSessions(): Promise<TrainingSession[]> {
    let sessions: TrainingSession[] = []
    if (USE_MOCK || !db) {
        mockSessionStore.forEach((meta) => {
            sessions.push(meta as TrainingSession)
        })
    } else {
        const snap = await getDocs(collection(db, 'sessions'))
        sessions = snap.docs.map(d => d.data() as TrainingSession)
    }
    sessions.forEach(updateSessionCache)
    return sessions.sort((a, b) => {
        const ta = new Date(a.createdAt || a.date || 0).getTime()
        const tb = new Date(b.createdAt || b.date || 0).getTime()
        return tb - ta
    })
}

// ------------------------------------------------------------------
// セッション情報を1件取得する
// ------------------------------------------------------------------
export async function fetchTrainingSession(sessionId: string): Promise<TrainingSession | null> {
    if (USE_MOCK || !db) {
        const meta = mockSessionStore.get(sessionId)
        if (meta) {
            updateSessionCache(meta as TrainingSession)
            return meta as TrainingSession
        }
        return null
    }
    const docRef = doc(db, 'sessions', sessionId)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
        const data = snap.data() as TrainingSession
        updateSessionCache(data)
        return data
    }
    return null
}

// ------------------------------------------------------------------
// セッション情報をリアルタイム購読する（一時停止・再開・開始状態の同期用）
// ------------------------------------------------------------------
export function subscribeToTrainingSession(
    sessionId: string,
    callback: (session: TrainingSession | null) => void
): Unsubscribe {
    if (USE_MOCK || !db) {
        const current = mockSessionStore.get(sessionId) || null
        updateSessionCache(current)
        callback(current ? { ...current } : null)

        if (!mockSessionListeners.has(sessionId)) {
            mockSessionListeners.set(sessionId, new Set())
        }
        const wrapped = (s: TrainingSession | null) => {
            updateSessionCache(s)
            callback(s)
        }
        mockSessionListeners.get(sessionId)!.add(wrapped)
        return () => {
            mockSessionListeners.get(sessionId)?.delete(wrapped)
        }
    }

    const docRef = doc(db, 'sessions', sessionId)
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data() as TrainingSession
            updateSessionCache(data)
            callback(data)
        } else {
            callback(null)
        }
    })
}

// ------------------------------------------------------------------
// 準備中のセッションを開始する（この瞬間からプレイヤー選択可能＆悪化開始）
// ------------------------------------------------------------------
export async function startTrainingSession(sessionId: string): Promise<void> {
    const now = Date.now()
    const updates = {
        status: 'active' as const,
        isActive: true,
        sessionStartMs: now,
        pausedAtMs: null,
        totalPausedDurationMs: 0,
    }

    if (USE_MOCK || !db) {
        const meta = mockSessionStore.get(sessionId)
        if (meta) {
            const updated = { ...meta, ...updates }
            mockSessionStore.set(sessionId, updated)
            updateSessionCache(updated)
            notifyMockSessionListeners(sessionId)
        }
        mockStore.forEach((p, id) => {
            if (p.session_id === sessionId) {
                p.reception_time_ms = now
                notifyMockListeners(id)
            }
        })
        setActiveSession(sessionId)
        return
    }

    await updateDoc(doc(db, 'sessions', sessionId), updates)
    const updatedSession = await fetchTrainingSession(sessionId)
    if (updatedSession) updateSessionCache(updatedSession)

    const q = query(collection(db, 'patients'), where('session_id', '==', sessionId))
    const snap = await getDocs(q)
    for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = writeBatch(db)
        snap.docs.slice(i, i + 450).forEach(d => {
            batch.update(d.ref, { reception_time_ms: now })
        })
        await batch.commit()
    }
    setActiveSession(sessionId)
}

// ------------------------------------------------------------------
// 進行中のセッションを一時停止する
// ------------------------------------------------------------------
export async function pauseTrainingSession(sessionId: string): Promise<void> {
    const now = Date.now()
    const updates = {
        status: 'paused' as const,
        isActive: true,
        pausedAtMs: now,
    }

    if (USE_MOCK || !db) {
        const meta = mockSessionStore.get(sessionId)
        if (meta) {
            const updated = { ...meta, ...updates }
            mockSessionStore.set(sessionId, updated)
            updateSessionCache(updated)
            notifyMockSessionListeners(sessionId)
        }
        return
    }

    await updateDoc(doc(db, 'sessions', sessionId), updates)
    const updatedSession = await fetchTrainingSession(sessionId)
    if (updatedSession) updateSessionCache(updatedSession)
}

// ------------------------------------------------------------------
// 一時停止中のセッションを再開する（停止していた時間分だけ各種開始時刻をスライド）
// ------------------------------------------------------------------
export async function resumeTrainingSession(sessionId: string): Promise<void> {
    const now = Date.now()
    const currentSession = await fetchTrainingSession(sessionId)
    if (!currentSession) return

    const deltaMs = currentSession.pausedAtMs ? Math.max(0, now - currentSession.pausedAtMs) : 0
    const nextSessionStartMs = currentSession.sessionStartMs ? currentSession.sessionStartMs + deltaMs : now
    const nextTotalPaused = (currentSession.totalPausedDurationMs || 0) + deltaMs

    const sessionUpdates = {
        status: 'active' as const,
        isActive: true,
        pausedAtMs: null,
        sessionStartMs: nextSessionStartMs,
        totalPausedDurationMs: nextTotalPaused,
    }

    const slidePatientTiming = (p: Patient) => {
        const pUpdates: Partial<Patient> = {}
        if (p.reception_time_ms && p.reception_time_ms > 0) {
            pUpdates.reception_time_ms = p.reception_time_ms + deltaMs
        }
        if (p.timer_started_at != null) {
            pUpdates.timer_started_at = p.timer_started_at + deltaMs
        }
        if (p.active_treatments && p.active_treatments.length > 0) {
            pUpdates.active_treatments = p.active_treatments.map(at => ({
                ...at,
                started_at: at.started_at + deltaMs,
            }))
        }
        return pUpdates
    }

    if (USE_MOCK || !db) {
        const meta = mockSessionStore.get(sessionId)
        if (meta) {
            const updated = { ...meta, ...sessionUpdates }
            mockSessionStore.set(sessionId, updated)
            updateSessionCache(updated)
            notifyMockSessionListeners(sessionId)
        }
        mockStore.forEach((p, id) => {
            if (p.session_id === sessionId) {
                Object.assign(p, slidePatientTiming(p))
                notifyMockListeners(id)
            }
        })
        return
    }

    await updateDoc(doc(db, 'sessions', sessionId), sessionUpdates)
    const updatedSession = await fetchTrainingSession(sessionId)
    if (updatedSession) updateSessionCache(updatedSession)

    if (deltaMs > 0) {
        const q = query(collection(db, 'patients'), where('session_id', '==', sessionId))
        const snap = await getDocs(q)
        for (let i = 0; i < snap.docs.length; i += 450) {
            const batch = writeBatch(db)
            snap.docs.slice(i, i + 450).forEach(d => {
                const pData = d.data() as Patient
                const pUpdates = slidePatientTiming(pData)
                if (Object.keys(pUpdates).length > 0) {
                    batch.update(d.ref, pUpdates as Record<string, unknown>)
                }
            })
            await batch.commit()
        }
    }
}

// ------------------------------------------------------------------
// セッションを終了する
// ------------------------------------------------------------------
export async function endTrainingSession(sessionId: string): Promise<void> {
    const updates = { isActive: false, status: 'ended' as const, pausedAtMs: null }
    if (USE_MOCK || !db) {
        const meta = mockSessionStore.get(sessionId)
        if (meta) {
            const updated = { ...meta, ...updates }
            mockSessionStore.set(sessionId, updated)
            updateSessionCache(updated)
            notifyMockSessionListeners(sessionId)
        }
        if (activeSessionId === sessionId) {
            activeSessionId = null
            localStorage.removeItem(STORAGE_KEY_SESSION)
        }
        return
    }
    const docRef = doc(db, 'sessions', sessionId)
    await updateDoc(docRef, updates)
    const updatedSession = await fetchTrainingSession(sessionId)
    if (updatedSession) updateSessionCache(updatedSession)
    if (activeSessionId === sessionId) {
        activeSessionId = null
        localStorage.removeItem(STORAGE_KEY_SESSION)
    }
}

// ------------------------------------------------------------------
// 指定セッションと紐づく患者データを一括削除する（マスター患者は保護）
// ------------------------------------------------------------------
export async function deleteSessionWithPatients(sessionId: string): Promise<{ deletedPatients: number }> {
    if (USE_MOCK || !db) {
        let deletedPatients = 0
        mockStore.forEach((p, id) => {
            if (p.session_id === sessionId) {
                mockStore.delete(id)
                deletedPatients++
            }
        })
        mockSessionStore.delete(sessionId)
        if (activeSessionId === sessionId) {
            activeSessionId = null
            localStorage.removeItem(STORAGE_KEY_SESSION)
        }
        return { deletedPatients }
    }

    const q = query(collection(db, 'patients'), where('session_id', '==', sessionId))
    const snap = await getDocs(q)
    const docs = snap.docs
    // FirestoreのwriteBatchは最大500件まで
    for (let i = 0; i < docs.length; i += 450) {
        const batch = writeBatch(db)
        docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
        await batch.commit()
    }
    await deleteDoc(doc(db, 'sessions', sessionId))
    if (activeSessionId === sessionId) {
        activeSessionId = null
        localStorage.removeItem(STORAGE_KEY_SESSION)
    }
    return { deletedPatients: docs.length }
}

// ------------------------------------------------------------------
// 紐づけ先セッションが存在しない古い患者データ（孤立データ）を削除する
// ------------------------------------------------------------------
export async function deleteOrphanedSessionPatients(validSessionIds: Set<string>): Promise<number> {
    if (USE_MOCK || !db) {
        let count = 0
        mockStore.forEach((p, id) => {
            if (p.session_id && !validSessionIds.has(p.session_id)) {
                mockStore.delete(id)
                count++
            }
        })
        return count
    }

    const snap = await getDocs(collection(db, 'patients'))
    const orphanRefs = snap.docs
        .filter((d) => {
            const data = d.data() as Patient
            return Boolean(data.session_id) && !validSessionIds.has(data.session_id!)
        })
        .map((d) => d.ref)

    for (let i = 0; i < orphanRefs.length; i += 450) {
        const batch = writeBatch(db)
        orphanRefs.slice(i, i + 450).forEach((ref) => batch.delete(ref))
        await batch.commit()
    }
    return orphanRefs.length
}

// モックかどうかを外部に公開
export { USE_MOCK }
