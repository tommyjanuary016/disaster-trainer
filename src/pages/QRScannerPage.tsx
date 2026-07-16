import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatient, activeSessionId, fetchTrainingSession, fetchActiveSessions, setActiveSession, fetchAllPatients } from '../lib/firestore'
import { Patient, TrainingSession } from '../types/patient'
import QRConfirmModal from '../components/QRConfirmModal'

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
    // 連続トリアージモード
    const [continuousMode, setContinuousMode] = useState(false)
    const [continuousDoneCount, setContinuousDoneCount] = useState(0)
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

    useEffect(() => {
        if (showModal || activeTab !== 'qr') return // モーダル表示中や別のタブの場合はスキャナーを起動しない

        const scanner = new Html5QrcodeScanner(
            'reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        )

        scanner.render(
            (decodedText) => {
                handleScan(decodedText)
                scanner.clear()
            },
            () => {
                // スキャン中のエラーは無視
            }
        )

        return () => {
            scanner.clear().catch(e => console.error('Error clearing scanner', e))
        }
    }, [showModal, activeTab])

    const handleScan = async (text: string) => {
        const parsed = parseQRCode(text)

        if (!parsed || parsed.type !== 'patient') {
            setError('無効なQRコードです。患者QR（病着に貼付）を読み取ってください。')
            return
        }

        setError(null)
        // 患者情報を取得して確認モーダルを表示
        const patientId = parsed.id
        const patient = await fetchPatient(parseInt(patientId))
        
        if (!patient) {
            setError('該当する患者が見つかりません。')
            return
        }

        // アクティブなセッションがある場合、そのセッションに属しているかチェック
        if (activeSessionId && patient.session_id !== activeSessionId) {
            setError('この患者は現在のセッションに参加していません。')
            return
        }

        setPendingPatientId(patientId)
        setPendingPatient(patient)
        setShowModal(true)
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualId) {
            handleScan(`patient:${manualId}`)
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
            if (continuousMode) {
                // 連続モード：カルテへ遷移せず、モーダルを閉じてカメラを再起動
                setContinuousDoneCount(c => c + 1)
                setShowModal(false)
                setPendingPatientId(null)
                setPendingPatient(null)
            } else {
                navigate(`/training/patient/${pendingPatientId}`)
            }
        }
    }

    const handleCancel = () => {
        setShowModal(false)
        setPendingPatientId(null)
        setPendingPatient(null)
    }

    const getStatusColor = (status: Patient['status']) => {
        switch (status) {
            case '初期状態': return 'var(--gray-500)'
            case '処置中': return 'var(--primary)'
            case 'アセスメント完了': return 'var(--status-green)'
            case '処置完了': return '#2563eb' // blue-600
            default: return 'var(--gray-500)'
        }
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

            {/* 連続トリアージモード トグル */}
            <div style={{ margin: '0.75rem 1rem 0', padding: '0.6rem 1rem', background: continuousMode ? '#eff6ff' : 'var(--gray-50)', borderRadius: '10px', border: `2px solid ${continuousMode ? 'var(--primary)' : 'var(--gray-200)'}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', flex: 1, userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={continuousMode}
                        onChange={e => setContinuousMode(e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: continuousMode ? 'var(--primary)' : 'var(--gray-700)' }}>🔁 連続トリアージモード</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>ONにすると確認後にカメラが自動再起動します（大量患者対応）</div>
                    </div>
                </label>
                {continuousMode && continuousDoneCount > 0 && (
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        ✅ {continuousDoneCount}名完了
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
                <p className="scanner-hero__sub">患者の病着QRを読み取ってください</p>
            </div>

            <div className="qr-reader-wrapper">
                <div id="reader" className="qr-reader custom-qr-scanner"></div>
            </div>

            {error && <div className="error-message" style={{ margin: '0 1.25rem 1.25rem' }}>{error}</div>}

            <div className="divider">
                <span>OR</span>
            </div>

            {isTestMode ? (
                <div className="test-patients-grid" style={{ padding: '0 1.25rem 1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--gray-600)' }}>検証用: 患者カード（直接アクセス）</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>
                        {sessionPatients.slice(0, 12).map(p => (
                            <button
                                key={p.id}
                                className="button button--secondary"
                                style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
                                onClick={() => handleScan(`patient:${p.id}`)}
                            >
                                <span className={`triage-badge triage-badge--sm triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'}`}>
                                    {p.triage_color}
                                </span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.4rem' }}>ID: {String(p.base_patient_id || p.id).padStart(4, '0')}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{p.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="manual-entry">
                    <form onSubmit={handleManualSubmit} className="manual-entry__form">
                        <div className="form-group">
                            <label>患者IDを直接入力（口頭確認用）</label>
                            <input
                                type="number"
                                min="1"
                                value={manualId}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value)
                                    if (val < 1) {
                                        setManualId('')
                                    } else {
                                        setManualId(e.target.value)
                                    }
                                }}
                                placeholder="例: 101"
                                className="input"
                            />
                        </div>
                        <button type="submit" className="button button--primary" disabled={!manualId}>
                            ID検索
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
                                    width: '140px',
                                    background: 'var(--white)',
                                    border: '1px solid var(--gray-200)',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>患者 {p.id % 1000}</span>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: `var(--triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'})`
                                    }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.diagnosis || '診断未設定'}</span>
                                <span style={{ fontSize: '0.7rem', color: getStatusColor(p.status), fontWeight: 'bold', marginTop: 'auto', paddingTop: '0.25rem' }}>{p.status}</span>
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
                                患者をタップして詳細・処置画面へ進んでください
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
                                    {sessionPatients.map(p => (
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
                                                gap: '1rem',
                                                transition: 'all 0.2s ease',
                                                backgroundColor: 'white'
                                            }}
                                            onClick={() => navigate(`/training/patient/${p.id}`)}
                                        >
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                backgroundColor: `var(--triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'})`,
                                                flexShrink: 0
                                            }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                    患者 {p.id % 1000} <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 'normal' }}>(ID: {p.base_patient_id || p.id})</span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                                                    年齢/性別: {p.age}歳 {p.gender} | {p.diagnosis || '（診断未設定）'}
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '0.3rem 0.6rem',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                backgroundColor: `${getStatusColor(p.status)}20`,
                                                color: getStatusColor(p.status),
                                            }}>
                                                {p.status}
                                            </div>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9 18L15 12L9 6" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
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
