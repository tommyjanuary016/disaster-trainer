import React, { useEffect, useState, useMemo } from 'react'
import ReactDOM from 'react-dom'
import {
    createPatient,
    createTrainingSession,
    setActiveSession,
    activeSessionId,
    endTrainingSession,
    startTrainingSession,
    pauseTrainingSession,
    resumeTrainingSession,
    subscribeToAllPatients,
    subscribeToTrainingSession,
    SessionConfig,
    seedPatientsToFirestore,
    fetchManageableSessions,
    fetchCustomPatients,
    fetchAllPatients,
    deleteAllCustomPatients,
    deleteSessionWithPatients,
    deleteOrphanedSessionPatients,
} from '../lib/firestore'
import { Patient, TrainingSession } from '../types/patient'
import { mockPatients } from '../data/mockData'
import PatientForm from '../components/PatientForm'
import { DataCleanupModal } from '../components/DataCleanupModal'
import { useNavigate, useLocation } from 'react-router-dom'
import { parseCSV, mapCSVToPatients, exportCSV, exportMasterCSV } from '../lib/csv'
import DashboardTab from '../components/DashboardTab'
import { SessionPatientSheetTab } from '../components/SessionPatientSheetTab'
import { exportToGoogleSheets } from '../lib/sheetsExport'
import { PROCEDURE_NAMES } from './TreatmentScanPage'
import { generateInlineQrSvg } from '../lib/inlineQr'

const AdminPage: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([])
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
    const [isFormVisible, setIsFormVisible] = useState(false)
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
    const [selectionMode, setSelectionMode] = useState<'ratio' | 'scenario_all' | 'manual'>('ratio')
    const [customAndFirestorePool, setCustomAndFirestorePool] = useState<Patient[]>([])
    const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
        title: '',
        totalPatients: 20,
        redRatio: 20,
        yellowRatio: 40,
        greenRatio: 40,
        blackRatio: 0,
        sortBySeverity: true,
        useBasePatients: true,
        examLockTimeMinutes: 1,
        treatmentLockTimeMinutes: 5,
        isTestMode: false,
        selectedScenarios: [],
        useExactScenarioMatch: false,
        selectedPatientIds: [],
        startImmediately: false,
    })
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'patients' | 'dashboard' | 'sheet' | 'settings'>(() => activeSessionId ? 'dashboard' : 'patients')
    const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('gas_webhook_url') || '')
    const [isExporting, setIsExporting] = useState(false)
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(activeSessionId)
    // 訓練終了後や準備中セッションの表示用ID
    const [displaySessionId, setDisplaySessionId] = useState<string | null>(activeSessionId)
    const [currentSessionTitle, setCurrentSessionTitle] = useState<string | null>(null)
    const [currentSessionMeta, setCurrentSessionMeta] = useState<TrainingSession | null>(null)
    const [sessionEnded, setSessionEnded] = useState(false) // 訓練終了状態フラグ
    const [showShareModal, setShowShareModal] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)
    const [showMasterAll, setShowMasterAll] = useState(false)
    const [activeSessionsList, setActiveSessionsList] = useState<TrainingSession[]>([])
    const [adminView, setAdminView] = useState<'home' | 'master' | 'session'>('home')
    const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false)
    const [allPatientsForCleanup, setAllPatientsForCleanup] = useState<Patient[]>([])
    const location = useLocation()

    const loadActiveSessions = async () => {
        try {
            const sessions = await fetchManageableSessions()
            setActiveSessionsList(sessions)
        } catch (e) {
            console.error('Failed to fetch sessions', e)
        }
    }

    const openSessionModal = async () => {
        setIsSessionModalOpen(true)
        try {
            const [customs, allMaster] = await Promise.all([
                fetchCustomPatients(),
                fetchAllPatients(false),
            ])
            const mockIds = new Set(mockPatients.map(p => p.id))
            const firestoreOnly = allMaster.filter(p => !p.session_id && !mockIds.has(p.id))
            const map = new Map<number, Patient>()
            customs.forEach(p => map.set(p.id, p))
            firestoreOnly.forEach(p => { if (!map.has(p.id)) map.set(p.id, p) })
            setCustomAndFirestorePool(Array.from(map.values()))
        } catch (e) {
            console.error('Failed to load patient pool for modal', e)
        }
    }

    // モーダル内で個別選択・シナリオ候補に使う患者プール
    const modalCandidatePool = useMemo(() => {
        const base = sessionConfig.useBasePatients ? mockPatients : []
        const seen = new Set(base.map(p => p.id))
        const combined = [...base, ...customAndFirestorePool.filter(p => !seen.has(p.id))]
        if (sessionConfig.selectedScenarios && sessionConfig.selectedScenarios.length > 0) {
            return combined.filter(p => sessionConfig.selectedScenarios!.includes(p.scenario_tag || '基本'))
        }
        return combined
    }, [sessionConfig.useBasePatients, sessionConfig.selectedScenarios, customAndFirestorePool])

    useEffect(() => {
        loadActiveSessions()
    }, [])

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search)
        const tabParam = queryParams.get('tab')
        if (tabParam === 'patients' || tabParam === 'dashboard' || tabParam === 'sheet' || tabParam === 'settings') {
            setActiveTab(tabParam)
        }
        if (queryParams.get('new_session') === '1') {
            openSessionModal()
        }
        if (queryParams.get('auth') === '1' || sessionStorage.getItem('admin_authenticated') === 'true') {
            sessionStorage.setItem('admin_authenticated', 'true')
            setIsAuthenticated(true)
        }
        if (queryParams.get('master_auth') === '1' || sessionStorage.getItem('admin_master_authenticated') === 'true') {
            sessionStorage.setItem('admin_master_authenticated', 'true')
            setIsMasterAuthenticated(true)
        }
        if (queryParams.get('create_patient') === '1') {
            setEditingPatient({
                id: 26,
                scenario_tag: '基本',
                name: '新規 症例患者',
                age: 45,
                gender: 'M',
                triage_color: '赤',
                vitals_triage: 'GCS:E3V4M5\n・BP:85/50\n・HR:125\n・R:32\n・SPO2:91%',
                vitals_initial: 'GCS:E3V4M5\n・BP:85/50\n・HR:125\n・R:32\n・SPO2:91%',
                vitals_post: 'GCS:E4V5M6\n・BP:110/68\n・HR:88\n・R:20\n・SPO2:98%',
                findings: {
                    head_and_neck: '意識清明、頸静脈怒張あり',
                    chest: '右呼吸音減弱、右胸部鼓音、打撲痕あり',
                    abdomen_and_pelvis: '明らかな圧痛なし',
                    limbs: '明らかな骨折なし、冷感あり',
                    fast: '陰性',
                    ample: '既往歴: なし、アレルギー: なし',
                    background: 'バス事故にて座席に強く胸部を打撲'
                },
                diagnosis: '右緊張性気胸・外傷性ショック',
                acting_instructions: '息苦しそうに肩で浅く速い呼吸をする。右胸を押されたら強い痛みを訴える。',
                required_treatments: [
                    { treatment_id: 'needle_decompression', treatment_name: '胸腔穿刺 (緊急脱気)', lock_timer_minutes: 2 },
                    { treatment_id: 'chest_tube', treatment_name: '胸腔ドレーン挿入', lock_timer_minutes: 5 }
                ],
                status: '初期状態',
                assessment_completed: false,
                timer_started_at: null,
                timer_duration_ms: null,
                applied_treatment_id: null
            } as unknown as Patient)
            setIsFormVisible(true)
        } else if (queryParams.get('edit_patient') === '1') {
            const p1 = patients.find(p => p.id === 1) || {
                id: 1,
                name: 'アカシ シンイチ',
                age: 65,
                gender: 'M',
                triage_color: '赤',
                diagnosis: '骨盤骨折',
                required_treatments: [
                    { treatment_id: 'iv_fluid', treatment_name: '外液急速投与 (2L負荷)', lock_timer_minutes: 3 },
                    { treatment_id: 'blood_transfusion', treatment_name: '緊急輸血 (RBC4/FFP4)', lock_timer_minutes: 5 },
                    { treatment_id: 'pelvic_binder', treatment_name: 'サムスリング装着 (骨盤固定)', lock_timer_minutes: 2 }
                ],
                findings: {
                    head_and_neck: '顔面に打撲痕あり',
                    chest: '明らかな外傷性変化なし',
                    abdomen_and_pelvis: '下腹部右側に打撲痕、骨盤動揺あり',
                    limbs: '右下肢短縮あり',
                    fast: '骨盤腔にecho free spaceあり',
                    ample: '高血圧のみ',
                    background: 'バス転落による骨盤強打'
                }
            } as unknown as Patient
            setEditingPatient(p1)
            setIsFormVisible(true)
        }

        if (location.state && (location.state as any).action) {
            const action = (location.state as any).action
            if (action === 'new_session') {
                openSessionModal()
            } else if (action === 'master') {
                setShowMasterAll(true)
                setDisplaySessionId(null)
            }
        }
    }, [location.state, location.search])

    useEffect(() => {
        if (showMasterAll) {
            const unsub = subscribeToAllPatients((data) => {
                setPatients(data)
            }, false)
            return () => unsub()
        } else if (displaySessionId) {
            const unsub = subscribeToAllPatients((data) => {
                setPatients(data)
            }, true, displaySessionId)
            return () => unsub()
        } else {
            const unsub = subscribeToAllPatients((data) => {
                setPatients(data)
            }, false)
            return () => unsub()
        }
    }, [displaySessionId, showMasterAll])

    useEffect(() => {
        if (displaySessionId) {
            const unsub = subscribeToTrainingSession(displaySessionId, session => {
                setCurrentSessionMeta(session)
                if (session) {
                    setCurrentSessionTitle(session.title)
                    const st = session.status || (session.isActive ? 'active' : 'ended')
                    setSessionEnded(st === 'ended')
                    if (st === 'active' || st === 'paused') {
                        setCurrentSessionId(session.id)
                    } else if (st === 'preparing' || st === 'ended') {
                        setCurrentSessionId(null)
                    }
                }
            })
            return () => unsub()
        } else {
            setCurrentSessionMeta(null)
            setCurrentSessionTitle(null)
        }
    }, [displaySessionId])

    const shareUrl = currentSessionId ? `${window.location.origin}/?session_id=${currentSessionId}` : ''
    const qrUrl = shareUrl ? generateInlineQrSvg(shareUrl, 240) : ''

    const handleCopyLink = () => {
        if (!shareUrl) return
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 2000)
        }).catch(err => {
            console.error('コピー失敗:', err)
        })
    }

    // 全経路パスワード保護ステート（トップ認証または管理画面認証を共有）
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem('admin_authenticated') === 'true'
    })
    const [authInput, setAuthInput] = useState('')
    const [authError, setAuthError] = useState(false)
    const [showAdminAuthPassword, setShowAdminAuthPassword] = useState(false)

    // 上位マスターパスワード認証ステート（komonji@tommy）
    const [isMasterAuthenticated, setIsMasterAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem('admin_master_authenticated') === 'true'
    })
    const [showMasterAuthModal, setShowMasterAuthModal] = useState(false)
    const [masterAuthInput, setMasterAuthInput] = useState('')
    const [masterAuthError, setMasterAuthError] = useState(false)
    const [showMasterAuthPassword, setShowMasterAuthPassword] = useState(false)
    const [pendingMasterAction, setPendingMasterAction] = useState<(() => void) | null>(null)

    // 患者検索 & フィルター用ステート
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedScenarioFilter, setSelectedScenarioFilter] = useState<string>('ALL')
    const [selectedTriageFilter, setSelectedTriageFilter] = useState<string>('ALL')

    const handleAdminAuthSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (authInput === 'komonji') {
            sessionStorage.setItem('admin_authenticated', 'true')
            setIsAuthenticated(true)
            setAuthError(false)
        } else {
            setAuthError(true)
            setAuthInput('')
        }
    }

    // 上位パスワード保護アクション実行時のラッパー関数
    const requireMasterAuth = (action: () => void) => {
        if (isMasterAuthenticated) {
            action()
        } else {
            setPendingMasterAction(() => action)
            setMasterAuthInput('')
            setMasterAuthError(false)
            setShowMasterAuthModal(true)
        }
    }

    const handleMasterAuthSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (masterAuthInput === 'komonji@tommy') {
            sessionStorage.setItem('admin_master_authenticated', 'true')
            setIsMasterAuthenticated(true)
            setMasterAuthError(false)
            setShowMasterAuthModal(false)
            if (pendingMasterAction) {
                pendingMasterAction()
                setPendingMasterAction(null)
            }
        } else {
            setMasterAuthError(true)
            setMasterAuthInput('')
        }
    }

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        requireMasterAuth(() => {
            const reader = new FileReader()
            reader.onload = async (event) => {
                const text = event.target?.result as string
                if (text) {
                    try {
                        const rows = parseCSV(text)
                        const newPatients = mapCSVToPatients(rows)
                        if (newPatients.length > 0) {
                            if (window.confirm(`${newPatients.length}件の患者データをインポートしますか？\n(既存の同IDデータは上書きされます)`)) {
                                document.body.style.cursor = 'wait'
                                await seedPatientsToFirestore(newPatients)
                                document.body.style.cursor = 'default'
                                alert('CSVインポートが完了しました。')
                            }
                        } else {
                            alert('有効なデータが見つかりませんでした。ヘッダー行を確認してください。')
                        }
                    } catch (err) {
                        console.error('CSV Parsing error:', err)
                        alert('CSVの解析中にエラーが発生しました。')
                    }
                }
            }
            reader.readAsText(file)
        })
        e.target.value = ''
    }

    const handleDeleteAllCustom = async () => {
        requireMasterAuth(async () => {
            if (window.confirm('追加された全てのカスタム患者データを削除しますか？\n(※アプリ内蔵の基本データは削除されません)')) {
                document.body.style.cursor = 'wait'
                await deleteAllCustomPatients()
                document.body.style.cursor = 'default'
                alert('カスタム患者を全件削除しました。')
            }
        })
    }

    const handleAddClick = () => {
        requireMasterAuth(() => {
            // セッション複製用の巨大ID(タイムスタンプ)を除外し、マスター患者としてのIDを採番
            const regularIds = patients.map(p => p.id).filter(id => id < 1000000000)
            const maxId = regularIds.length > 0 ? Math.max(...regularIds) : 25
            const nextId = maxId + 1

            setEditingPatient({
                id: nextId,
                scenario_tag: '基本',
                name: '',
                age: 30,
                gender: 'M',
                triage_color: '緑',
                vitals_triage: '',
                vitals_initial: '',
                vitals_post: '',
                findings: { head_and_neck: '', chest: '', abdomen_and_pelvis: '', limbs: '', fast: '', ample: '', background: '' },
                diagnosis: '',
                acting_instructions: '',
                required_treatments: [],
                status: '初期状態',
                assessment_completed: false,
                timer_started_at: null,
                timer_duration_ms: null,
                applied_treatment_id: null
            } as unknown as Patient)
            setIsFormVisible(true)
        })
    }

    const handleEditClick = (patient: Patient) => {
        requireMasterAuth(() => {
            setEditingPatient(patient)
            setIsFormVisible(true)
        })
    }

    const handleDeleteSinglePatient = (patient: Patient) => {
        requireMasterAuth(async () => {
            if (window.confirm(`患者「No.${patient.id} ${patient.name}」を削除しますか？`)) {
                document.body.style.cursor = 'wait'
                const { deletePatient } = await import('../lib/firestore')
                await deletePatient(patient.id)
                document.body.style.cursor = 'default'
                alert('削除しました。')
            }
        })
    }

    const handleDuplicatePatient = (patient: Patient) => {
        requireMasterAuth(async () => {
            const regularIds = patients.map(p => p.id).filter(id => id < 1000000000)
            const maxId = regularIds.length > 0 ? Math.max(...regularIds) : 25
            const nextId = maxId + 1
            const newPatient: Patient = {
                ...JSON.parse(JSON.stringify(patient)),
                id: nextId,
                name: `${patient.name} (複製)`
            }
            document.body.style.cursor = 'wait'
            await createPatient(newPatient)
            document.body.style.cursor = 'default'
            alert(`患者「No.${patient.id}」を「No.${nextId} ${newPatient.name}」として複製しました。`)
        })
    }

    const handleFormSubmit = async (patient: Patient) => {
        await createPatient(patient)
        setIsFormVisible(false)
    }

    const handleFormCancel = () => {
        setIsFormVisible(false)
        setEditingPatient(null)
    }

    const handleCreateSession = async () => {
        if (selectionMode === 'manual') {
            if (!sessionConfig.selectedPatientIds || sessionConfig.selectedPatientIds.length === 0) {
                alert('個別選択モードでは、使用する患者を1名以上選択してください。')
                return
            }
        } else if (selectionMode === 'ratio') {
            const totalRatio = sessionConfig.redRatio + sessionConfig.yellowRatio + sessionConfig.greenRatio + sessionConfig.blackRatio
            if (totalRatio !== 100) {
                alert('重症度の割合の合計は100%にしてください')
                return
            }
        }

        const isStartingNow = sessionConfig.startImmediately === true
        const confirmMsg = isStartingNow
            ? '新しい訓練セッションを作成し、今すぐ訓練を開始しますか？'
            : '新しい訓練セッションを「事前準備（未開始）」として作成しますか？\n（※後から管理画面の「訓練を開始する」を押すまでプレイヤーには表示されません）'

        if (window.confirm(confirmMsg)) {
            document.body.style.cursor = 'wait'
            const payload: SessionConfig = {
                ...sessionConfig,
                useExactScenarioMatch: selectionMode === 'scenario_all',
                selectedPatientIds: selectionMode === 'manual' ? sessionConfig.selectedPatientIds : undefined,
                startImmediately: isStartingNow,
            }
            const newSessionId = await createTrainingSession(payload)
            await loadActiveSessions()
            setDisplaySessionId(newSessionId)
            setShowMasterAll(false)
            setSessionEnded(false)
            setAdminView('session')
            document.body.style.cursor = 'default'
            setIsSessionModalOpen(false)

            if (isStartingNow) {
                setCurrentSessionId(newSessionId)
                setActiveTab('dashboard')
                setShowShareModal(true)
                alert('新しいセッションを作成して開始しました。プレイヤーを招待できます。')
            } else {
                setCurrentSessionId(null)
                setActiveTab('sheet') // 事前準備直後は患者一覧表・指導書印刷を表示
                alert('訓練セッションを「準備中」として事前作成しました。\n患者一覧表の確認・印刷を行い、訓練本番に「▶️ 訓練を開始する」を押してください。')
            }
        }
    }

    const handleStartPreparedSession = async (sessionId: string) => {
        if (!window.confirm('この訓練セッションを開始しますか？\n（この瞬間からプレイヤーが選択できるようになり、タイマーと悪化判定が動き始めます）')) return
        document.body.style.cursor = 'wait'
        try {
            await startTrainingSession(sessionId)
            await loadActiveSessions()
            setCurrentSessionId(sessionId)
            setDisplaySessionId(sessionId)
            setSessionEnded(false)
            setAdminView('session')
            setActiveTab('dashboard')
            setShowShareModal(true)
        } finally {
            document.body.style.cursor = 'default'
        }
    }

    const handlePauseSession = async (sessionId: string) => {
        await pauseTrainingSession(sessionId)
        await loadActiveSessions()
    }

    const handleResumeSession = async (sessionId: string) => {
        await resumeTrainingSession(sessionId)
        await loadActiveSessions()
    }

    const handleClearSession = async () => {
        if (window.confirm('訓練を終了しますか？\n（訓練のダッシュボードと結果表示へ遷移します）')) {
            const targetId = currentSessionId || displaySessionId || activeSessionId
            if (targetId) {
                await endTrainingSession(targetId)
            }
            setActiveSession(null)
            setCurrentSessionId(null)
            setSessionEnded(true)
            await loadActiveSessions()
            setActiveTab('dashboard') // 訓練終了時にダッシュボード結果画面へ遷移
        }
    }

    const handleReturnToMaster = () => {
        // 管理画面トップに戻る
        setAdminView('home')
        setDisplaySessionId(null)
        setCurrentSessionId(null)
        setCurrentSessionMeta(null)
        setSessionEnded(false)
        setCurrentSessionTitle(null)
        loadActiveSessions()
    }

    const handleOpenCleanupModal = () => {
        // 全患者を一時取得してモーダルを開く
        const unsub = subscribeToAllPatients((all) => {
            setAllPatientsForCleanup(all)
            setIsCleanupModalOpen(true)
            unsub()
        }, true)
    }

    const handleExportCSV = () => {
        if (patients.length === 0) {
            alert('エクスポートするデータがありません。')
            return
        }
        const csvContent = exportCSV(patients)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `training_log_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // 抽出可能なシナリオタグ一覧
    const availableScenarios = Array.from(new Set(patients.map(p => p.scenario_tag || '基本')))

    // 患者フィルター処理
    const filteredPatients = patients.filter(p => {
        // キーワード検索（ID, 氏名, 診断名）
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            const matchId = String(p.id).includes(q)
            const matchName = p.name ? p.name.toLowerCase().includes(q) : false
            const matchDiag = p.diagnosis ? p.diagnosis.toLowerCase().includes(q) : false
            if (!matchId && !matchName && !matchDiag) return false
        }
        // シナリオタグフィルター
        if (selectedScenarioFilter !== 'ALL') {
            const tag = p.scenario_tag || '基本'
            if (tag !== selectedScenarioFilter) return false
        }
        // トリアージ区分フィルター
        if (selectedTriageFilter !== 'ALL') {
            if (p.triage_color !== selectedTriageFilter) return false
        }
        return true
    })

    const handleExportMasterCSV = () => {
        if (patients.length === 0) {
            alert('エクスポートするデータがありません。')
            return
        }
        const csvContent = exportMasterCSV(patients)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `patient_master_template_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (!isAuthenticated) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem'
            }}>
                <div style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: '16px',
                    padding: '2rem',
                    maxWidth: '380px',
                    width: '100%',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" strokeLinecap="round"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--gray-900)' }}>管理者認証が必要</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
                        管理画面にアクセスするにはパスワードを入力してください。<br/>
                        <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', fontWeight: 600 }}>ヒント：作成病院名</span>
                    </p>
                    <form onSubmit={handleAdminAuthSubmit}>
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <input
                                type={showAdminAuthPassword ? "text" : "password"}
                                placeholder="パスワードを入力"
                                value={authInput}
                                onChange={(e) => { setAuthInput(e.target.value); setAuthError(false); }}
                                className="input"
                                style={{ marginBottom: 0, textAlign: 'center', fontSize: '1.1rem', letterSpacing: showAdminAuthPassword ? 'normal' : '0.2em', paddingRight: '2.5rem' }}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowAdminAuthPassword(!showAdminAuthPassword)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                                title={showAdminAuthPassword ? "非表示" : "表示"}
                            >
                                {showAdminAuthPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
                        {authError && (
                            <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                ❌ パスワードが違います
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                className="button button--secondary"
                                onClick={() => navigate('/')}
                                style={{ flex: 1 }}
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                className="button button--primary"
                                style={{ flex: 1 }}
                            >
                                認証する
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="page admin-page">
            <header className="admin-header no-print" style={{flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', padding: '1rem', width: '100%'}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/')} className="button button--secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        アプリトップ
                    </button>
                    {adminView !== 'home' && (
                        <button
                            onClick={() => {
                                handleReturnToMaster()
                                setActiveTab('patients')
                            }}
                            className="button button--secondary"
                            style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', backgroundColor: '#f1f5f9', color: 'var(--gray-800)' }}
                        >
                            🏠 管理画面トップに戻る
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/qr-generator?tab=procedure')}
                        className="button button--secondary"
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                    >
                        🖨️ 手技・物品QR印刷
                    </button>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'}}>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', margin: 0, whiteSpace: 'nowrap' }}>管理画面 (Admin)</h1>
                        {displaySessionId && currentSessionMeta ? (
                            (() => {
                                const st = currentSessionMeta.status || (currentSessionMeta.isActive ? 'active' : 'ended')
                                return (
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap'}}>
                                        {st === 'preparing' && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.25rem 0.75rem', borderRadius: '999px',
                                                backgroundColor: '#dbeafe', border: '1px solid #60a5fa',
                                                fontSize: '0.82rem', fontWeight: '700', color: '#1e40af', whiteSpace: 'nowrap',
                                            }}>
                                                📝 準備中（プレイヤー非公開）
                                            </span>
                                        )}
                                        {st === 'active' && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.25rem 0.75rem', borderRadius: '999px',
                                                backgroundColor: 'rgba(5, 150, 105, 0.12)', border: '1px solid rgba(5, 150, 105, 0.4)',
                                                fontSize: '0.82rem', fontWeight: '600', color: '#065f46', whiteSpace: 'nowrap',
                                            }}>
                                                <span style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', animation: 'pulse-beat 1.5s ease-in-out infinite', flexShrink: 0}} />
                                                訓練中
                                            </span>
                                        )}
                                        {st === 'paused' && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.25rem 0.75rem', borderRadius: '999px',
                                                backgroundColor: '#fef3c7', border: '1px solid #f59e0b',
                                                fontSize: '0.82rem', fontWeight: '700', color: '#92400e', whiteSpace: 'nowrap',
                                            }}>
                                                ⏸️ 一時停止中
                                            </span>
                                        )}
                                        {st === 'ended' && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.25rem 0.75rem', borderRadius: '999px',
                                                backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)',
                                                fontSize: '0.82rem', fontWeight: '600', color: '#1d4ed8', whiteSpace: 'nowrap',
                                            }}>
                                                訓練終了
                                            </span>
                                        )}
                                        <span style={{fontSize: '0.9rem', fontWeight: '700', color: 'var(--gray-800)', whiteSpace: 'nowrap'}}>
                                            {currentSessionTitle || '（タイトルなし）'}
                                        </span>
                                        <span style={{fontSize: '0.72rem', color: 'var(--gray-400)', fontFamily: 'monospace', whiteSpace: 'nowrap'}}>
                                            ID: {displaySessionId.replace('session_', '')}
                                        </span>
                                        {(st === 'active' || st === 'paused') && (
                                            <button
                                                onClick={() => setShowShareModal(true)}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                    padding: '0.25rem 0.65rem', borderRadius: '999px',
                                                    fontSize: '0.78rem', fontWeight: '600', color: '#1d4ed8',
                                                    background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)',
                                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                                }}
                                            >
                                                📱 プレイヤーを招待
                                            </button>
                                        )}
                                    </div>
                                )
                            })()
                        ) : (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                 <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--gray-700)', whiteSpace: 'nowrap' }}>
                                     {showMasterAll ? '全登録患者（マスター・過去ログ全件）' : '表示セッション:'}
                                 </span>
                                 {activeSessionsList.length > 0 && !showMasterAll ? (
                                     <select
                                         value={displaySessionId || ''}
                                         onChange={(e) => {
                                             const val = e.target.value
                                             if (val === 'ALL_MASTER') {
                                                 setShowMasterAll(true)
                                                 setDisplaySessionId(null)
                                             } else {
                                                 setShowMasterAll(false)
                                                 setDisplaySessionId(val || null)
                                                 const target = activeSessionsList.find(s => s.id === val)
                                                 const st = target ? (target.status || (target.isActive ? 'active' : 'ended')) : null
                                                 setCurrentSessionId((st === 'active' || st === 'paused') ? val : null)
                                             }
                                         }}
                                         style={{
                                             padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--gray-300)',
                                             fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: '#fff',
                                         }}
                                     >
                                         <option value="">-- セッションを選択 --</option>
                                         {activeSessionsList.map(s => {
                                             const st = s.status || (s.isActive ? 'active' : 'ended')
                                             const stTag = st === 'preparing' ? '[準備中]' : st === 'paused' ? '[一時停止]' : st === 'active' ? '[訓練中]' : '[終了]'
                                             return (
                                                 <option key={s.id} value={s.id}>
                                                     {stTag} {s.title || '無題セッション'} ({s.id.replace('session_', '')})
                                                 </option>
                                             )
                                         })}
                                         <option value="ALL_MASTER">🌐 過去ログ・マスター全件表示</option>
                                     </select>
                                 ) : showMasterAll ? (
                                     <button
                                         onClick={() => { setShowMasterAll(false); loadActiveSessions(); }}
                                         style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', background: 'var(--gray-200)', border: 'none', cursor: 'pointer' }}
                                     >
                                         ← セッション別表示に戻る
                                     </button>
                                 ) : (
                                     <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>セッション未選択（マスターモード）</span>
                                 )}
                             </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => navigate('/role-select')} className="app-header__back" style={{position: 'static', transform: 'none', background: 'var(--gray-100)'}}>
                            訓練トップ
                        </button>
                        <button onClick={() => navigate('/')} className="app-header__back" style={{position: 'static', transform: 'none', background: 'var(--gray-100)'}}>
                            アプリトップ
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {displaySessionId && currentSessionMeta && (() => {
                        const st = currentSessionMeta.status || (currentSessionMeta.isActive ? 'active' : 'ended')
                        if (st === 'preparing') {
                            return (
                                <>
                                    <button
                                        onClick={() => handleStartPreparedSession(displaySessionId)}
                                        className="button button--primary"
                                        style={{ width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.88rem', backgroundColor: '#10b981', borderColor: '#10b981' }}
                                    >
                                        ▶️ 訓練を開始する（プレイヤーに公開）
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('sheet')}
                                        className="button button--secondary"
                                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#2563eb', color: '#1d4ed8' }}
                                    >
                                        🖨️ 患者一覧・指導表を印刷
                                    </button>
                                </>
                            )
                        }
                        if (st === 'active') {
                            return (
                                <>
                                    <button
                                        onClick={() => handlePauseSession(displaySessionId)}
                                        className="button button--secondary"
                                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#f59e0b', color: '#92400e', backgroundColor: '#fef3c7' }}
                                    >
                                        ⏸️ 一時停止
                                    </button>
                                    <button
                                        onClick={handleClearSession}
                                        className="button button--secondary"
                                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#ef4444', color: '#b91c1c' }}
                                    >
                                        訓練終了
                                    </button>
                                </>
                            )
                        }
                        if (st === 'paused') {
                            return (
                                <>
                                    <button
                                        onClick={() => handleResumeSession(displaySessionId)}
                                        className="button button--primary"
                                        style={{ width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.88rem', backgroundColor: '#10b981', borderColor: '#10b981' }}
                                    >
                                        ▶️ 訓練を再開する
                                    </button>
                                    <button
                                        onClick={handleClearSession}
                                        className="button button--secondary"
                                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#ef4444', color: '#b91c1c' }}
                                    >
                                        訓練終了
                                    </button>
                                </>
                            )
                        }
                        if (st === 'ended') {
                            return (
                                <button
                                    onClick={handleReturnToMaster}
                                    className="button button--secondary"
                                    style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                >
                                    管理画面トップに戻る
                                </button>
                            )
                        }
                        return null
                    })()}
                    {!displaySessionId && (
                        <button
                            onClick={handleDeleteAllCustom}
                            className="button button--secondary"
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--status-red)', borderColor: 'var(--status-red)' }}
                        >
                            カスタム患者全リセット
                        </button>
                    )}
                </div>
            </header>

            <main className="page__content">
                {isSessionModalOpen && ReactDOM.createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.65)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            zIndex: 99999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                            overflowY: 'auto'
                        }}
                        onClick={() => setIsSessionModalOpen(false)}
                    >
                        <div
                            className="card card--elevated"
                            style={{
                                maxWidth: '560px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                margin: 'auto',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                                background: '#ffffff',
                                borderRadius: '16px',
                                padding: '1.5rem'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 className="card__title" style={{ margin: 0 }}>新規訓練セッション設定</h3>
                                <button
                                    onClick={() => setIsSessionModalOpen(false)}
                                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--gray-500)' }}
                                >
                                    &times;
                                </button>
                            </div>

                            <div className="form-grid">
                                <div className="form-group" style={{gridColumn: 'span 2'}}>
                                    <label className="form-label">訓練タイトル</label>
                                    <input type="text" placeholder="例: 2026年度 災害時BCP訓練" value={sessionConfig.title} onChange={e => setSessionConfig({...sessionConfig, title: e.target.value})} className="input" />
                                </div>

                                <div className="form-group" style={{gridColumn: 'span 2'}}>
                                    <label className="form-label">開始タイミング</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                                        <label style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem 0.75rem',
                                            borderRadius: '8px', cursor: 'pointer',
                                            border: !sessionConfig.startImmediately ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                            backgroundColor: !sessionConfig.startImmediately ? '#eff6ff' : '#ffffff',
                                        }}>
                                            <input
                                                type="radio"
                                                name="startImmediately"
                                                checked={!sessionConfig.startImmediately}
                                                onChange={() => setSessionConfig({ ...sessionConfig, startImmediately: false })}
                                                style={{ marginTop: '0.2rem' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.86rem', color: '#1e3a8a' }}>📝 事前準備として作成（おすすめ）</div>
                                                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.15rem' }}>
                                                    指導表の印刷や事前準備を先に済ませ、本番当日に管理画面から開始します（開始までプレイヤーには非表示）。
                                                </div>
                                            </div>
                                        </label>
                                        <label style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem 0.75rem',
                                            borderRadius: '8px', cursor: 'pointer',
                                            border: sessionConfig.startImmediately ? '2px solid #10b981' : '1px solid #cbd5e1',
                                            backgroundColor: sessionConfig.startImmediately ? '#ecfdf5' : '#ffffff',
                                        }}>
                                            <input
                                                type="radio"
                                                name="startImmediately"
                                                checked={sessionConfig.startImmediately === true}
                                                onChange={() => setSessionConfig({ ...sessionConfig, startImmediately: true })}
                                                style={{ marginTop: '0.2rem' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.86rem', color: '#065f46' }}>🚀 作成してすぐ訓練開始</div>
                                                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.15rem' }}>
                                                    作成した瞬間からプレイヤーが参加でき、タイマーと悪化判定が動き出します。
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">身体診察・評価デフォルト拘束時間 (分)</label>
                                    <input type="number" min="0" step="0.5" value={sessionConfig.examLockTimeMinutes} onChange={e => setSessionConfig({...sessionConfig, examLockTimeMinutes: parseFloat(e.target.value) || 0})} className="input" />
                                    <span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>頭頸部・胸部・腹骨盤・四肢・FAST・問診に適用（標準1分）</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">治療処置デフォルト拘束時間 (分)</label>
                                    <input type="number" min="0" step="0.5" value={sessionConfig.treatmentLockTimeMinutes} onChange={e => setSessionConfig({...sessionConfig, treatmentLockTimeMinutes: parseFloat(e.target.value) || 0})} className="input" />
                                    <span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>点滴や外科処置などに適用</span>
                                </div>

                                {/* 手技別個別時間設定アコーディオン */}
                                <div className="form-group" style={{gridColumn: 'span 2', marginTop: '0.25rem'}}>
                                    <details style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <summary style={{ fontWeight: 'bold', fontSize: '0.88rem', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            ⚙️ 手技別の個別拘束時間をカスタマイズする（任意）
                                        </summary>
                                        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                                            指定した手技のみ個別の拘束時間（分）が適用されます。空欄または未設定の手技は上記の一律デフォルト時間が適用されます。
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                            {Object.entries(PROCEDURE_NAMES as Record<string, string>).map(([id, name]) => (
                                                <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.5"
                                                            placeholder={`${['head_and_neck','chest','abdomen_and_pelvis','limbs','fast','ample','background'].includes(id) ? sessionConfig.examLockTimeMinutes : sessionConfig.treatmentLockTimeMinutes}分`}
                                                            value={sessionConfig.customProcedureLockTimes?.[id] ?? ''}
                                                            onChange={e => {
                                                                const val = e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0)
                                                                const updated = { ...(sessionConfig.customProcedureLockTimes || {}) }
                                                                if (val === undefined) {
                                                                    delete updated[id]
                                                                } else {
                                                                    updated[id] = val
                                                                }
                                                                setSessionConfig({ ...sessionConfig, customProcedureLockTimes: updated })
                                                            }}
                                                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '70px' }}
                                                        />
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>分</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">基礎患者（25名）の使用</label>
                                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.4rem 0'}}>
                                        <input
                                            type="checkbox"
                                            checked={sessionConfig.useBasePatients}
                                            onChange={e => setSessionConfig({...sessionConfig, useBasePatients: e.target.checked})}
                                            style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                        />
                                        <span style={{fontSize: '0.85rem', color: 'var(--gray-700)'}}>内蔵基礎患者25名を含める</span>
                                    </label>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">動作確認モード（検証用）</label>
                                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.4rem 0', background: 'var(--gray-50)', borderRadius: '4px'}}>
                                        <input
                                            type="checkbox"
                                            checked={sessionConfig.isTestMode || false}
                                            onChange={e => setSessionConfig({...sessionConfig, isTestMode: e.target.checked})}
                                            style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                        />
                                        <span style={{fontSize: '0.85rem', color: 'var(--gray-700)'}}>全拘束時間を5秒に短縮</span>
                                    </label>
                                </div>

                                <div className="form-group" style={{gridColumn: 'span 2'}}>
                                    <label className="form-label">対象シナリオ (空欄で全て)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem', background: 'var(--gray-50)', borderRadius: '4px' }}>
                                        {availableScenarios.map(tag => (
                                            <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={sessionConfig.selectedScenarios?.includes(tag) || false}
                                                    onChange={e => {
                                                        const current = sessionConfig.selectedScenarios || []
                                                        if (e.target.checked) {
                                                            setSessionConfig({...sessionConfig, selectedScenarios: [...current, tag]})
                                                        } else {
                                                            setSessionConfig({...sessionConfig, selectedScenarios: current.filter(t => t !== tag)})
                                                        }
                                                    }}
                                                />
                                                {tag}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group" style={{gridColumn: 'span 2'}}>
                                    <label className="form-label">使用する患者の選び方</label>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {[
                                            { id: 'ratio' as const, label: '🎲 割合で自動抽出' },
                                            { id: 'scenario_all' as const, label: '📦 対象シナリオ全員を使用' },
                                            { id: 'manual' as const, label: '✅ 患者を個別にチェック選択' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setSelectionMode(opt.id)}
                                                style={{
                                                    flex: 1, minWidth: '140px', padding: '0.5rem 0.6rem',
                                                    borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer',
                                                    border: selectionMode === opt.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                                    backgroundColor: selectionMode === opt.id ? '#eff6ff' : '#ffffff',
                                                    color: selectionMode === opt.id ? '#1d4ed8' : '#334155',
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {selectionMode === 'manual' ? (
                                <div style={{ marginTop: '0.5rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a' }}>
                                            選択中: {(sessionConfig.selectedPatientIds || []).length} / {modalCandidatePool.length} 名
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSessionConfig({ ...sessionConfig, selectedPatientIds: modalCandidatePool.map(p => p.id) })}
                                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                                            >
                                                すべて選択
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSessionConfig({ ...sessionConfig, selectedPatientIds: [] })}
                                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                                            >
                                                選択解除
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        {modalCandidatePool.map(p => {
                                            const checked = (sessionConfig.selectedPatientIds || []).includes(p.id)
                                            return (
                                                <label
                                                    key={p.id}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem',
                                                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
                                                        backgroundColor: checked ? '#eff6ff' : '#ffffff',
                                                        border: checked ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={e => {
                                                            const cur = sessionConfig.selectedPatientIds || []
                                                            const next = e.target.checked
                                                                ? [...cur, p.id]
                                                                : cur.filter(id => id !== p.id)
                                                            setSessionConfig({ ...sessionConfig, selectedPatientIds: next })
                                                        }}
                                                    />
                                                    <span style={{
                                                        padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff',
                                                        backgroundColor: p.triage_color === '赤' ? '#dc2626' : p.triage_color === '黄' ? '#d97706' : p.triage_color === '緑' ? '#059669' : '#334155',
                                                    }}>
                                                        {p.triage_color}
                                                    </span>
                                                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>No.{p.id} {p.name}</span>
                                                    <span style={{ color: '#475569' }}>({p.age}歳)</span>
                                                    <span style={{ color: '#1d4ed8', marginLeft: 'auto', fontSize: '0.75rem' }}>{p.diagnosis}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : selectionMode === 'ratio' ? (
                                <div>
                                    <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">対象患者数</label>
                                            <input type="number" min="1" value={sessionConfig.totalPatients} onChange={e => setSessionConfig({...sessionConfig, totalPatients: parseInt(e.target.value) || 10})} className="input" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">搬入順 (トリアージ優先)</label>
                                            <select value={sessionConfig.sortBySeverity ? 'yes' : 'no'} onChange={e => setSessionConfig({...sessionConfig, sortBySeverity: e.target.value === 'yes'})} className="input">
                                                <option value="yes">重症度順（優先度高い順）</option>
                                                <option value="no">完全ランダム</option>
                                            </select>
                                        </div>
                                    </div>
                                    <h4 style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>重症度割合 (合計100%)</h4>
                                    <div style={{ display: 'flex', height: '16px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem', backgroundColor: '#e5e7eb', gap: '1px' }}>
                                        <div style={{ width: `${sessionConfig.redRatio}%`, backgroundColor: '#dc2626', transition: 'width 0.3s', minWidth: sessionConfig.redRatio > 0 ? '2px' : '0' }} title={`赤: ${sessionConfig.redRatio}%`} />
                                        <div style={{ width: `${sessionConfig.yellowRatio}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s', minWidth: sessionConfig.yellowRatio > 0 ? '2px' : '0' }} title={`黄: ${sessionConfig.yellowRatio}%`} />
                                        <div style={{ width: `${sessionConfig.greenRatio}%`, backgroundColor: '#059669', transition: 'width 0.3s', minWidth: sessionConfig.greenRatio > 0 ? '2px' : '0' }} title={`緑: ${sessionConfig.greenRatio}%`} />
                                        <div style={{ width: `${sessionConfig.blackRatio}%`, backgroundColor: '#1e293b', transition: 'width 0.3s', minWidth: sessionConfig.blackRatio > 0 ? '2px' : '0' }} title={`黒: ${sessionConfig.blackRatio}%`} />
                                    </div>
                                    <div className="form-grid form-grid--2col" style={{marginBottom: '1rem'}}>
                                        <div className="form-group">
                                            <label className="form-label" style={{color: 'var(--status-red)'}}>赤 (%)</label>
                                            <input type="number" min="0" value={sessionConfig.redRatio} onChange={e => setSessionConfig({...sessionConfig, redRatio: parseInt(e.target.value) || 0})} className="input" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{color: '#d97706'}}>黄 (%)</label>
                                            <input type="number" min="0" value={sessionConfig.yellowRatio} onChange={e => setSessionConfig({...sessionConfig, yellowRatio: parseInt(e.target.value) || 0})} className="input" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{color: 'var(--status-green)'}}>緑 (%)</label>
                                            <input type="number" min="0" value={sessionConfig.greenRatio} onChange={e => setSessionConfig({...sessionConfig, greenRatio: parseInt(e.target.value) || 0})} className="input" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{color: 'var(--status-black)'}}>黒 (%)</label>
                                            <input type="number" min="0" value={sessionConfig.blackRatio} onChange={e => setSessionConfig({...sessionConfig, blackRatio: parseInt(e.target.value) || 0})} className="input" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '0.65rem 0.8rem', backgroundColor: '#eff6ff', borderRadius: '8px', fontSize: '0.82rem', color: '#1e40af', marginTop: '0.5rem' }}>
                                    📦 選択した条件（現在 {modalCandidatePool.length} 名）の患者を全員使用してセッションを作成します。
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button onClick={handleCreateSession} className="button button--primary" style={{ flex: 1 }}>
                                    {sessionConfig.startImmediately ? '🚀 作成してすぐ開始' : '📝 事前準備として作成'}
                                </button>
                                <button onClick={() => setIsSessionModalOpen(false)} className="button button--secondary" style={{ flex: 1 }}>キャンセル</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
                {isFormVisible ? (
                    <PatientForm
                        initialPatient={editingPatient}
                        onSubmit={handleFormSubmit}
                        onCancel={handleFormCancel}
                    />
                ) : adminView === 'home' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                        {/* 準備中セッション一覧 */}
                        {activeSessionsList.filter(s => s.status === 'preparing').map(prep => (
                            <div
                                key={prep.id}
                                style={{
                                    padding: '1.25rem',
                                    borderRadius: '12px',
                                    border: '2px solid #3b82f6',
                                    backgroundColor: '#eff6ff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '0.75rem',
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1d4ed8' }}>📝 準備中（未開始・プレイヤー非公開）</div>
                                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.1rem', color: '#1e3a8a' }}>
                                        {prep.title || '準備中のセッション'}
                                    </h3>
                                    <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                                        患者数: {prep.totalPatients}名
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                    <button
                                        className="button button--primary"
                                        style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                                        onClick={() => handleStartPreparedSession(prep.id)}
                                    >
                                        ▶️ 訓練を開始する（本番スタート）
                                    </button>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button
                                            className="button button--secondary"
                                            style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem 0.5rem', backgroundColor: '#ffffff' }}
                                            onClick={() => {
                                                setCurrentSessionId(null)
                                                setDisplaySessionId(prep.id)
                                                setCurrentSessionTitle(prep.title)
                                                setSessionEnded(false)
                                                setAdminView('session')
                                                setActiveTab('sheet')
                                            }}
                                        >
                                            🖨️ 指導表・印刷
                                        </button>
                                        <button
                                            className="button button--secondary"
                                            style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem 0.5rem', backgroundColor: '#ffffff' }}
                                            onClick={() => {
                                                setCurrentSessionId(null)
                                                setDisplaySessionId(prep.id)
                                                setCurrentSessionTitle(prep.title)
                                                setSessionEnded(false)
                                                setAdminView('session')
                                                setActiveTab('dashboard')
                                            }}
                                        >
                                            運用画面 →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* 進行中・一時停止中セッション一覧 */}
                        {activeSessionsList.filter(s => {
                            const st = s.status || (s.isActive ? 'active' : 'ended')
                            return st === 'active' || st === 'paused'
                        }).map(active => {
                            const isPausedCard = active.status === 'paused'
                            return (
                                <div
                                    key={active.id}
                                    style={{
                                        padding: '1.25rem',
                                        borderRadius: '12px',
                                        border: `2px solid ${isPausedCard ? '#f59e0b' : '#10b981'}`,
                                        backgroundColor: isPausedCard ? '#fffbeb' : '#ecfdf5',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '0.75rem',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isPausedCard ? '#92400e' : '#065f46' }}>
                                            {isPausedCard ? '⏸️ 一時停止中の訓練セッション' : '🟢 進行中の訓練セッション'}
                                        </div>
                                        <h3 style={{ margin: '0.25rem 0', fontSize: '1.1rem', color: isPausedCard ? '#78350f' : '#064e3b' }}>
                                            {active.title || '進行中のセッション'}
                                        </h3>
                                        <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                                            患者数: {active.totalPatients}名
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                        <button
                                            className="button button--primary"
                                            style={{ backgroundColor: isPausedCard ? '#d97706' : '#059669' }}
                                            onClick={() => {
                                                setActiveSession(active.id)
                                                setCurrentSessionId(active.id)
                                                setDisplaySessionId(active.id)
                                                setCurrentSessionTitle(active.title)
                                                setSessionEnded(false)
                                                setAdminView('session')
                                                setActiveTab('dashboard')
                                            }}
                                        >
                                            セッション運用画面を開く →
                                        </button>
                                        <button
                                            className="button button--secondary"
                                            style={{ fontSize: '0.8rem', padding: '0.45rem', backgroundColor: '#ffffff' }}
                                            onClick={() => {
                                                setActiveSession(active.id)
                                                setCurrentSessionId(active.id)
                                                setDisplaySessionId(active.id)
                                                setCurrentSessionTitle(active.title)
                                                setSessionEnded(false)
                                                setAdminView('session')
                                                setActiveTab('sheet')
                                            }}
                                        >
                                            🖨️ 患者一覧表・指導シートを見る
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        <div style={{
                            padding: '1.25rem',
                            borderRadius: '12px',
                            border: '1px solid var(--gray-200)',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#2563eb' }}>🚀 新規訓練</div>
                                <h3 style={{ margin: '0.25rem 0', fontSize: '1.05rem' }}>新しい訓練セッションを作成・準備</h3>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                                    使用する患者・トリアージ比率・拘束時間を設定し、事前準備または即座に訓練を開始します。
                                </p>
                            </div>
                            <button
                                className="button button--primary"
                                onClick={openSessionModal}
                            >
                                ＋ 新規訓練を作成する
                            </button>
                        </div>

                        <div style={{
                            padding: '1.25rem',
                            borderRadius: '12px',
                            border: '1px solid var(--gray-200)',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7c3aed' }}>📋 患者マスター</div>
                                <h3 style={{ margin: '0.25rem 0', fontSize: '1.05rem' }}>患者マスターを管理する</h3>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                                    シナリオ別の患者テンプレート登録・編集・CSV入出力を行います。
                                </p>
                            </div>
                            <button
                                className="button button--secondary"
                                onClick={() => {
                                    setDisplaySessionId(null)
                                    setCurrentSessionId(null)
                                    setAdminView('master')
                                    setActiveTab('patients')
                                }}
                            >
                                患者マスターを開く →
                            </button>
                        </div>

                        <div style={{
                            padding: '1.25rem',
                            borderRadius: '12px',
                            border: '1px solid var(--gray-200)',
                            backgroundColor: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#dc2626' }}>🧹 データ整理</div>
                                <h3 style={{ margin: '0.25rem 0', fontSize: '1.05rem' }}>過去データの整理（アーカイブ削除）</h3>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                                    終了済みの古いセッションや孤立した患者データをまとめて削除します。
                                </p>
                            </div>
                            <button
                                className="button button--secondary"
                                style={{ color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                                onClick={handleOpenCleanupModal}
                            >
                                過去データを整理する
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--gray-200)', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setActiveTab('patients')}
                                style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'patients' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'patients' ? 'bold' : 'normal', color: activeTab === 'patients' ? 'var(--primary)' : 'var(--gray-600)' }}
                            >
                                患者データ一覧
                            </button>
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'dashboard' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal', color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--gray-600)' }}
                            >
                                🛰️ 災害対策本部 (Command Center)
                            </button>
                            <button
                                onClick={() => setActiveTab('sheet')}
                                style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'sheet' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'sheet' ? 'bold' : 'normal', color: activeTab === 'sheet' ? 'var(--primary)' : 'var(--gray-600)' }}
                            >
                                🖨️ 患者一覧表・指導書印刷
                            </button>
                        </div>

                        {activeTab === 'dashboard' ? (
                            <DashboardTab patients={patients} sessionId={displaySessionId} isSessionEndedParent={sessionEnded} />
                        ) : activeTab === 'sheet' ? (
                            <SessionPatientSheetTab patients={patients} session={currentSessionMeta} sessionTitle={currentSessionTitle} />
                        ) : activeTab === 'settings' ? (
                            <div className="card card--elevated">
                                <h3 className="card__title">Google Sheets 連携 (GAS Webhook)</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
                                    Google Apps Script の Web アプリURLを設定することで、現在の患者データをスプレッドシートへエクスポートできます。
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Webhook URL</label>
                                    <input 
                                        type="url" 
                                        className="input" 
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        value={webhookUrl}
                                        onChange={(e) => {
                                            setWebhookUrl(e.target.value)
                                            localStorage.setItem('gas_webhook_url', e.target.value)
                                        }}
                                    />
                                </div>
                                <button 
                                    className="button button--primary" 
                                    onClick={async () => {
                                        if (!webhookUrl) {
                                            alert('Webhook URLを入力してください。')
                                            return
                                        }
                                        setIsExporting(true)
                                        document.body.style.cursor = 'wait'
                                        const success = await exportToGoogleSheets(webhookUrl, patients)
                                        document.body.style.cursor = 'default'
                                        setIsExporting(false)
                                        if (success) {
                                            alert('Google Sheets へのデータ送信が完了しました。')
                                        } else {
                                            alert('データ送信に失敗しました。URLやネットワーク環境を確認してください。')
                                        }
                                    }}
                                    disabled={isExporting}
                                    style={{ width: 'auto', padding: '0.5rem 1.5rem', opacity: isExporting ? 0.7 : 1, marginBottom: '2rem' }}
                                >
                                    {isExporting ? '送信中...' : 'データを今すぐエクスポートする'}
                                </button>

                                <div className="gas-setup-guide" style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                                    <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                        Google Apps Script (GAS) の設定方法
                                    </h4>
                                    <ol style={{ fontSize: '0.85rem', color: 'var(--gray-700)', paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                                        <li>送信先のスプレッドシートを開き、「拡張機能」→「Apps Script」をクリックします。</li>
                                        <li>以下のボタンでコードをコピーし、エディタに貼り付けて保存します。</li>
                                        <li>「デプロイ」→「新しいデプロイ」を選択し、種類を「ウェブアプリ」にします。</li>
                                        <li>アクセスできるユーザーを「全員」にしてデプロイし、発行されたURLを上の入力欄に貼り付けます。</li>
                                    </ol>
                                    <button 
                                        className="button button--secondary"
                                        style={{ fontSize: '0.8rem', width: 'auto', padding: '0.4rem 0.8rem', marginTop: '1rem' }}
                                        onClick={() => {
                                            const gasCode = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  // ヘッダーがなければ作成
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["タイムスタンプ", "患者ID", "名前", "トリアージ", "診断名", "ステータス", "実施処置", "完了済み処置"]);
  }
  
  // 各患者データを追記
  data.patients.forEach(function(p) {
    sheet.appendRow([
      data.timestamp,
      p.id,
      p.name,
      p.triageColor,
      p.diagnosis,
      p.status,
      p.appliedTreatment,
      p.completedTreatments
    ]);
  });
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}`;
                                            navigator.clipboard.writeText(gasCode);
                                            alert('GASコードをクリップボードにコピーしました。');
                                        }}
                                    >
                                        GAS用スクリプトをコピー
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <h2 style={{fontSize: '1.1rem', fontWeight: '700', margin: 0}}>患者マスター管理</h2>
                                        <p style={{fontSize: '0.8rem', color: 'var(--gray-500)', margin: '0.2rem 0 0'}}>
                                            全 {filteredPatients.length} / {patients.length} 件表示中
                                        </p>
                                    </div>
                                    {!currentSessionId && (
                                        <button onClick={handleAddClick} className="button button--primary" style={{width: 'auto', padding: '0.5rem 1rem'}}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '4px'}}>
                                                <path d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            新規患者を追加
                                        </button>
                                    )}
                                </div>

                                {/* 検索 & フィルターコントロール */}
                                <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--gray-200)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        {/* フリーワード検索 */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--gray-600)' }}>🔍 検索 (ID・氏名・診断名)</label>
                                            <input
                                                type="text"
                                                placeholder="例: 10, 山田, 骨折"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="input"
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                            />
                                        </div>

                                        {/* シナリオタグフィルター */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--gray-600)' }}>🏷️ シナリオタグ</label>
                                            <select
                                                value={selectedScenarioFilter}
                                                onChange={(e) => setSelectedScenarioFilter(e.target.value)}
                                                className="input"
                                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                            >
                                                <option value="ALL">すべてのシナリオ (患者 {patients.length}名)</option>
                                                {availableScenarios.map(scen => (
                                                    <option key={scen} value={scen}>
                                                        {scen} ({patients.filter(p => (p.scenario_tag || '基本') === scen).length}件)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* トリアージ区分タブボタン */}
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--gray-600)', marginRight: '0.4rem' }}>トリアージ区分:</span>
                                        {[
                                            { key: 'ALL', label: 'すべて', color: 'var(--gray-700)', bg: '#f1f5f9' },
                                            { key: '赤', label: '🔴 赤', color: '#b91c1c', bg: '#fef2f2' },
                                            { key: '黄', label: '🟡 黄', color: '#854d0e', bg: '#fefce8' },
                                            { key: '緑', label: '🟢 緑', color: '#166534', bg: '#f0fdf4' },
                                            { key: '黒', label: '⚫ 黒', color: '#27272a', bg: '#f4f4f5' }
                                        ].map(tab => (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setSelectedTriageFilter(tab.key)}
                                                style={{
                                                    padding: '0.25rem 0.6rem',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 'bold',
                                                    borderRadius: '6px',
                                                    border: selectedTriageFilter === tab.key ? `2px solid ${tab.color}` : '1px solid var(--gray-300)',
                                                    backgroundColor: selectedTriageFilter === tab.key ? tab.bg : '#ffffff',
                                                    color: tab.color,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                        {(searchQuery || selectedScenarioFilter !== 'ALL' || selectedTriageFilter !== 'ALL') && (
                                            <button
                                                type="button"
                                                onClick={() => { setSearchQuery(''); setSelectedScenarioFilter('ALL'); setSelectedTriageFilter('ALL'); }}
                                                style={{ fontSize: '0.75rem', color: 'var(--gray-500)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: 'auto' }}
                                            >
                                                フィルター解除
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="patient-list">
                                    {filteredPatients.length === 0 ? (
                                        <p style={{textAlign: 'center', color: 'var(--gray-500)', padding: '2rem'}}>条件に一致する患者データが見つかりません。</p>
                                    ) : (
                                        filteredPatients.map((p, index) => (
                                            <div key={p.id} className="patient-list-item" style={{ '--index': index } as React.CSSProperties}>
                                                <div className="patient-list-item__header">
                                                    <div>
                                                        <div className="patient-list-item__name">
                                                            No.{p.id} {p.name}
                                                            <span style={{fontSize: '0.75rem', background: 'var(--gray-200)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px'}}>{p.scenario_tag || '基本'}</span>
                                                        </div>
                                                        <div className="patient-list-item__meta">{p.age}歳 {p.gender === 'M' ? '男性' : '女性'}</div>
                                                    </div>
                                                    <span className={`triage-badge triage-badge--sm triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'}`}>
                                                        {p.triage_color}
                                                    </span>
                                                </div>
                                                <div className="info-row" style={{padding: '0.25rem 0'}}>
                                                    <span className="info-row__label">診断</span>
                                                    <span className="info-row__value">{p.diagnosis}</span>
                                                </div>
                                                <div className="info-row" style={{padding: '0.25rem 0'}}>
                                                    <span className="info-row__label">必要処置</span>
                                                    <span className="info-row__value">
                                                        {p.required_treatments?.map(rt => rt.treatment_name).join(', ') || 'なし'}
                                                    </span>
                                                </div>
                                                <div className="actions" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: 'var(--border)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="button button--secondary"
                                                        onClick={() => handleDuplicatePatient(p)}
                                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                        title="複製して新しい患者データを作成"
                                                    >
                                                        📋 複製
                                                    </button>
                                                    <button
                                                        className="button button--secondary"
                                                        onClick={() => handleEditClick(p)}
                                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                    >
                                                        ✏️ 編集
                                                    </button>
                                                    <button
                                                        className="button button--secondary"
                                                        onClick={() => handleDeleteSinglePatient(p)}
                                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                                    >
                                                        🗑️ 削除
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </main>

            {/* 上位マスターパスワード認証モーダル (komonji@tommy) */}
            {showMasterAuthModal && ReactDOM.createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem'
                    }}
                    onClick={() => setShowMasterAuthModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--white)',
                            borderRadius: '16px',
                            padding: '2rem',
                            maxWidth: '380px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                            textAlign: 'center'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            color: '#6d28d9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--gray-900)' }}>上位管理者認証が必要</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                            患者マスターの変更・作成・削除を行うには上位パスワードを入力してください。<br/>
                            <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', fontWeight: 600 }}>ヒント：作成病院名 + @ + 作成者</span>
                        </p>
                        <form onSubmit={handleMasterAuthSubmit}>
                            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                <input
                                    type={showMasterAuthPassword ? "text" : "password"}
                                    placeholder="上位パスワードを入力"
                                    value={masterAuthInput}
                                    onChange={(e) => { setMasterAuthInput(e.target.value); setMasterAuthError(false); }}
                                    className="input"
                                    style={{ marginBottom: 0, textAlign: 'center', fontSize: '1rem', paddingRight: '2.5rem' }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowMasterAuthPassword(!showMasterAuthPassword)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                                    title={showMasterAuthPassword ? "非表示" : "表示"}
                                >
                                    {showMasterAuthPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>
                            {masterAuthError && (
                                <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                    ❌ 上位パスワードが違います
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="button button--secondary"
                                    onClick={() => setShowMasterAuthModal(false)}
                                    style={{ flex: 1 }}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="button button--primary"
                                    style={{ flex: 1, backgroundColor: '#6d28d9', borderColor: '#6d28d9' }}
                                >
                                    認証実行
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* QRコード共有モーダル */}
            {showShareModal && currentSessionId && ReactDOM.createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem'
                    }}
                    onClick={() => setShowShareModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--white)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            maxWidth: '380px',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                            position: 'relative'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>📱 プレイヤーを招待</h3>
                            <button
                                onClick={() => setShowShareModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--gray-500)' }}
                            >
                                &times;
                            </button>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '1.25rem', textAlign: 'center', lineHeight: '1.4' }}>
                            セッション:&nbsp;<strong style={{ color: 'var(--primary)' }}>{currentSessionTitle || '（タイトルなし）'}</strong><br />
                            以下のQRコードまたはリンクから誰でも訓練に参加できます。
                        </p>
                        <div style={{
                            padding: '0.75rem',
                            background: '#F8FAFC',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            marginBottom: '1.25rem'
                        }}>
                            <img
                                src={qrUrl}
                                alt="参加用QRコード"
                                style={{ display: 'block', width: '200px', height: '200px', borderRadius: '8px' }}
                            />
                        </div>
                        <button
                            className="button button--primary"
                            onClick={handleCopyLink}
                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                        >
                            {copySuccess ? '✅ 参加URLをコピーしました！' : '📋 参加URLをコピー'}
                        </button>
                    </div>
                </div>,
                document.body
            )}
            {isCleanupModalOpen && (
                <DataCleanupModal
                    sessions={activeSessionsList}
                    allPatients={allPatientsForCleanup}
                    onClose={() => setIsCleanupModalOpen(false)}
                    onDeleteSessions={async (ids) => {
                        for (const id of ids) {
                            await deleteSessionWithPatients(id)
                        }
                        await loadActiveSessions()
                        setAllPatientsForCleanup(prev => prev.filter(p => !p.session_id || !ids.includes(p.session_id)))
                        alert(`${ids.length} 件のセッションと紐づく患者データを削除しました。`)
                    }}
                    onDeleteOrphans={async () => {
                        const validIds = new Set(activeSessionsList.map(s => s.id))
                        const deletedCount = await deleteOrphanedSessionPatients(validIds)
                        setAllPatientsForCleanup(prev => prev.filter(p => !p.session_id || validIds.has(p.session_id)))
                        alert(`${deletedCount} 件の孤立患者データを削除しました。`)
                    }}
                    onExportSessionsCSV={(ids) => {
                        const targetPatients = allPatientsForCleanup.filter(p => p.session_id && ids.includes(p.session_id))
                        if (targetPatients.length === 0) {
                            alert('選択されたセッションに紐づく患者データがありません。')
                            return
                        }
                        exportCSV(targetPatients)
                    }}
                />
            )}
        </div>
    )
}

export default AdminPage
