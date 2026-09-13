import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatientFlexible, activeSessionId, fetchTrainingSession, fetchActiveSessions, setActiveSession, fetchAllPatients } from '../lib/firestore'
import { Patient, TrainingSession } from '../types/patient'
import QRConfirmModal from '../components/QRConfirmModal'
import { startRobustQRScanner } from '../lib/qrScannerHelper'

const QRScannerPage: React.FC = () => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'qr' | 'list'>('qr')
    const [manualId, setManualId] = useState('')
    const [error, setError] = useState<string | null>(null)
    // 確認モーダル用の状態
    const [pendingPatientId, setPendingPatientId] = useState<string | null>(null)
    const [pendingPatient, setPendingPatient] = useState<Patient | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [sessionTitle, setSessionTitle] = useState<string>('')
    // セッション選択モーダル
    const [showSessionModal, setShowSessionModal] = useState(false)
    const [activeSessions, setActiveSessions] = useState<TrainingSession[]>([])
    const [isLoadingSessions, setIsLoadingSessions] = useState(false)
    // 患者リスト用の状態
    const [sessionPatients, setSessionPatients] = useState<Patient[]>([])
    const [isLoadingPatients, setIsLoadingPatients] = useState(false)
    const [isTestMode, setIsTestMode] = useState(false)
    const [recentPatients, setRecentPatients] = useState<Patient[]>([])
    const STORAGE_KEY = 'recent_scanned_patients'

    useEffect(() => {
        if (activeSessionId) {
            fetchTrainingSession(activeSessionId).then(session => {
                if (session) {
                    setSessionTitle(session.title)
                    setIsTestMode(!!session.isTestMode)
                }
            }).catch(e => console.error(e))
            // セッションが変わったら患者リストをロード（検証用＆履歴用）
            loadPatients()
        } else {
            // セッション未選択ならセッション一覧を取得してモーダルを表示
            openSessionModal()
        }
    }, [activeSessionId])

    useEffect(() => {
        // 患者データがロードされたら履歴を復元
        if (sessionPatients.length > 0) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY)
                const ids: number[] = stored ? JSON.parse(stored) : []
                const mapped = ids.map(id => sessionPatients.find(p => p.id === id)).filter(Boolean) as Patient[]
                setRecentPatients(mapped)
            } catch (e) { console.error(e) }
        }
    }, [sessionPatients])

    const loadPatients = async () => {
        setIsLoadingPatients(true)
        try {
            const patients = await fetchAllPatients(true) // true: 現在のセッションの患者のみ
            setSessionPatients(patients)
        } catch (e) {
            console.error('Failed to fetch patients', e)
        } finally {
            setIsLoadingPatients(false)
        }
    }

    const openSessionModal = async () => {
        setIsLoadingSessions(true)
        setShowSessionModal(true)
        try {
            const sessions = await fetchActiveSessions()
            setActiveSessions(sessions)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoadingSessions(false)
        }
    }

    const handleSelectSession = (session: TrainingSession) => {
        setActiveSession(session.id)
        setSessionTitle(session.title)
        setShowSessionModal(false)
    }

    const [isCameraActive, setIsCameraActive] = useState(false)

    useEffect(() => {
        if (showModal || activeTab !== 'qr' || !isCameraActive) return

        const stopScanner = startRobustQRScanner('reader', (decodedText) => {
            handleScan(decodedText)
        }, (err) => {
            console.error('Camera init error:', err)
        })

        return () => {
            stopScanner()
        }
    }, [showModal, activeTab, isCameraActive])

    const handleScan = async (text: string) => {
        let rawId = text
        if (text.startsWith('patient:')) {
            rawId = text.slice(8)
        } else {
            const parsed = parseQRCode(text)
            if (parsed && parsed.type === 'patient') {
                rawId = parsed.id
            }
        }

        setError(null)
        // 柔軟な患者ID検索を実行（ID, base_patient_id, 番号いずれも対応）
        const patient = await fetchPatientFlexible(rawId)
        
        if (!patient) {
            setError(`該当する患者が見つかりません (入力・読み取り値: ${rawId})`)
            return
        }

        // アクティブなセッションがある場合、そのセッションに属しているかチェック
        if (activeSessionId && patient.session_id && patient.session_id !== activeSessionId) {
            setError('この患者は現在のセッションに参加していません。')
            return
        }

        setPendingPatientId(String(patient.id))
        setPendingPatient(patient)
        setShowModal(true)
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualId) {
            handleScan(manualId.trim())
        }
    }

    const addRecentPatient = (patient: Patient) => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            let ids: number[] = stored ? JSON.parse(stored) : []
            ids = [patient.id, ...ids.filter(id => id !== patient.id)].slice(0, 10)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
            
            // local state update
            setRecentPatients(prev => {
                const newRecent = [patient, ...prev.filter(p => p.id !== patient.id)].slice(0, 10)
                return newRecent
            })
        } catch (e) { console.error('Failed to save recent patient', e) }
    }

    const handleConfirm = () => {
        if (pendingPatientId && pendingPatient) {
            addRecentPatient(pendingPatient)
            navigate(`/training/patient/${pendingPatientId}`)
        }
    }

    const handleCancel = () => {
        setShowModal(false)
        setPendingPatientId(null)
        setPendingPatient(null)
    }

    return (
        <div className="page qr-scanner-page">
            {/* セッション選択モーダル */}
            {showSessionModal && (
                <div className="launcher-modal-overlay" onClick={() => {}}>
                    <div className="launcher-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h2 className="launcher-modal__title">訓練セッション選択</h2>
                        <p className="launcher-modal__subtitle" style={{ marginBottom: '1rem' }}>参加するセッションを選んでください</p>
                        {isLoadingSessions ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--gray-500)' }}>読み込み中...</div>
                        ) : activeSessions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--status-red)' }}>
                                現在アクティブなセッションはありません。<br />管理画面から新しく開始してください。
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                                {activeSessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => handleSelectSession(session)}
                                        className="button button--secondary"
                                        style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', width: '100%' }}
                                    >
                                        <span style={{ fontWeight: 'bold' }}>{session.title || '無題のセッション'}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>患者数: {session.totalPatients}名</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button type="button" className="launcher-modal__btn launcher-modal__btn--secondary" onClick={() => navigate('/')}>
                            アプリトップに戻る
                        </button>
                    </div>
                </div>
            )}

            {/* QR確認モーダル */}
            {showModal && pendingPatientId && (
                <QRConfirmModal
                    parsed={{ type: 'patient', id: pendingPatientId }}
                    patient={pendingPatient}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}

            <div style={{ padding: '1rem 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => navigate('/')} className="button button--secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    アプリトップへ戻る
                </button>
                {sessionTitle && (
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {sessionTitle}
                    </span>
                )}
            </div>

            <div className="admin-tabs" style={{ margin: '1rem 1rem 0.5rem', display: 'flex', gap: '0.5rem' }}>
                <button
                    className={`button ${activeTab === 'qr' ? 'button--primary' : 'button--secondary'}`}
                    style={{ flex: 1, padding: '0.8rem' }}
                    onClick={() => setActiveTab('qr')}
                >
                    QRスキャン
                </button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <button
                    onClick={() => setActiveTab('list')}
                    style={{ 
                        background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: '0.85rem', 
                        textDecoration: 'underline', cursor: 'pointer', padding: '0.5rem' 
                    }}
                >
                    QRコードが読み取れない場合はこちら（患者リストから選択）
                </button>
            </div>

            {activeTab === 'qr' ? (
                <>
                    <div className="scanner-hero">
                <div className="scanner-hero__icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4H10V10H4V4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 4H20V10H14V4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 14H10V20H4V14Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 14H17V17H14V14Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 17H20V20H17V17Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 20H17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 14V17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h2 className="scanner-hero__title">患者スキャン</h2>
                <p className="scanner-hero__sub">カメラ起動ボタンを押して病着QRを読み取ってください</p>
            </div>

            <div style={{ textAlign: 'center', margin: '0.75rem 1.25rem' }}>
                {!isCameraActive ? (
                    <button
                        type="button"
                        onClick={() => setIsCameraActive(true)}
                        className="button button--primary"
                        style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        📷 カメラを起動する
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsCameraActive(false)}
                        className="button button--secondary"
                        style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        ⏹️ カメラを停止する
                    </button>
                )}
            </div>

            {isCameraActive && (
                <div className="qr-reader-wrapper">
                    <div id="reader" className="qr-reader custom-qr-scanner"></div>
                </div>
            )}

            {error && <div className="error-message" style={{ margin: '0 1.25rem 1.25rem' }}>{error}</div>}

            <div className="divider">
                <span>OR</span>
            </div>

            {isTestMode ? (
                <div className="test-patients-grid" style={{ padding: '0 1.25rem 1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--gray-600)' }}>検証用: 患者カード（直接アクセス）</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                        {sessionPatients.map((p, idx) => {
                            const triageBg = p.triage_color === '赤' ? '#fef2f2' : p.triage_color === '黄' ? '#fefce8' : p.triage_color === '緑' ? '#f0fdf4' : '#f4f4f5'
                            const triageColor = p.triage_color === '赤' ? '#b91c1c' : p.triage_color === '黄' ? '#854d0e' : p.triage_color === '緑' ? '#166534' : '#27272a'
                            const triageBorder = p.triage_color === '赤' ? '#fca5a5' : p.triage_color === '黄' ? '#fde047' : p.triage_color === '緑' ? '#86efac' : '#a1a1aa'

                            return (
                                <button
                                    key={p.id}
                                    className="button button--secondary"
                                    style={{ padding: '0.6rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', position: 'relative' }}
                                    onClick={() => handleScan(String(p.id))}
                                >
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        padding: '0.1rem 0.4rem',
                                        borderRadius: '4px',
                                        marginBottom: '0.25rem',
                                        backgroundColor: triageBg,
                                        color: triageColor,
                                        border: `1px solid ${triageBorder}`
                                    }}>
                                        {p.triage_color || '未'}
                                    </span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--gray-900)' }}>No.{idx + 1} {p.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                                        {p.age}歳 {p.gender === 'M' ? '男性' : '女性'}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="manual-entry">
                    <form onSubmit={handleManualSubmit} className="manual-entry__form">
                        <div className="form-group">
                            <label>患者番号（1番, 2番…）を直接入力</label>
                            <input
                                type="text"
                                value={manualId}
                                onChange={(e) => setManualId(e.target.value)}
                                placeholder="例: 1 または 2"
                                className="input"
                            />
                        </div>
                        <button type="submit" className="button button--primary" disabled={!manualId.trim()}>
                            患者を検索
                        </button>
                    </form>
                </div>
            )}

            {/* 最近対応した患者履歴 */}
            {recentPatients.length > 0 && (
                <div style={{ margin: '1rem 1.25rem 2rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--gray-600)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        最近対応した患者
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {recentPatients.map(p => (
                            <div
                                key={p.id}
                                onClick={() => navigate(`/training/patient/${p.id}`)}
                                style={{
                                    flexShrink: 0,
                                    width: '120px',
                                    background: 'var(--white)',
                                    border: '1px solid var(--gray-200)',
                                    borderRadius: '8px',
                                    padding: '0.6rem 0.75rem',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)' }}>患者 ID: {p.id % 1000}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                                    {Math.floor(p.age / 10) * 10}代 {p.gender === 'M' ? '男性' : '女性'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </>
            ) : (
                <div style={{ padding: '0 1rem 1rem' }}>
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">セッション参加患者一覧</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                                患者をタップして詳細・アセスメント画面へ進んでください
                            </p>
                        </div>
                        <div className="card-body">
                            {!activeSessionId ? (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                                    <p style={{ color: 'var(--gray-600)', fontWeight: '600', marginBottom: '0.5rem' }}>セッションが選択されていません</p>
                                    <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>上のボタンからセッションを選んでください</p>
                                    <button
                                        className="button button--primary"
                                        style={{ width: 'auto', padding: '0.6rem 1.5rem' }}
                                        onClick={openSessionModal}
                                    >
                                        セッションを選択する
                                    </button>
                                </div>
                            ) : isLoadingPatients ? (
                                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--gray-500)' }}>読み込み中...</div>
                            ) : sessionPatients.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--gray-500)' }}>
                                    現在のセッションに患者がいません。
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {sessionPatients.map((p, idx) => (
                                        <div
                                            key={p.id}
                                            className="list-item"
                                            style={{
                                                padding: '1rem',
                                                border: '1px solid var(--gray-200)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '1rem',
                                                transition: 'all 0.2s ease',
                                                backgroundColor: 'white'
                                            }}
                                            onClick={() => navigate(`/training/patient/${p.id}`)}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--gray-900)' }}>
                                                    No.{idx + 1}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                                                    性別: {p.gender === 'M' ? '男性' : '女性'} | 年齢層: {Math.floor(p.age / 10) * 10}代
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
                                                詳細を開く →
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default QRScannerPage
