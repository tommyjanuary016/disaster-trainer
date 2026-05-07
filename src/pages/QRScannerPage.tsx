import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatient, activeSessionId, fetchTrainingSession, fetchActiveSessions, setActiveSession } from '../lib/firestore'
import { Patient, TrainingSession } from '../types/patient'
import QRConfirmModal from '../components/QRConfirmModal'

const QRScannerPage: React.FC = () => {
    const navigate = useNavigate()
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

    useEffect(() => {
        if (activeSessionId) {
            fetchTrainingSession(activeSessionId).then(session => {
                if (session) setSessionTitle(session.title)
            }).catch(e => console.error(e))
        } else {
            // セッション未選択ならセッション一覧を取得してモーダルを表示
            openSessionModal()
        }
    }, [])

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
        if (showModal) return // モーダル表示中はスキャナーを起動しない

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
    }, [showModal])

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

    const handleConfirm = () => {
        if (pendingPatientId) {
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

            <div className="manual-entry">
                <form onSubmit={handleManualSubmit} className="manual-entry__form">
                    <div className="form-group">
                        <label>患者ID（開発用手入力）</label>
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
                    <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => navigate('/training/actor')}
                        style={{ marginTop: '0.5rem' }}
                    >
                        模擬患者モード
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            className="button button--secondary"
                            onClick={() => navigate('/training/radiology')}
                            style={{ flex: 1, backgroundColor: '#e2e8f0' }}
                        >
                            放射線科
                        </button>
                        <button
                            type="button"
                            className="button button--secondary"
                            onClick={() => navigate('/training/lab')}
                            style={{ flex: 1, backgroundColor: '#e2e8f0' }}
                        >
                            検査科
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default QRScannerPage
