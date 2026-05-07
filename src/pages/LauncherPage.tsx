import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchActiveSessions, setActiveSession } from '../lib/firestore'
import { TrainingSession } from '../types/patient'

const LauncherPage: React.FC = () => {
    const navigate = useNavigate()
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [passwordInput, setPasswordInput] = useState('')
    const [passwordError, setPasswordError] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // セッション選択用ステート
    const [showSessionModal, setShowSessionModal] = useState(false)
    const [activeSessions, setActiveSessions] = useState<TrainingSession[]>([])
    const [isLoadingSessions, setIsLoadingSessions] = useState(false)

    // 管理画面選択モーダル用ステート
    const [showAdminActionModal, setShowAdminActionModal] = useState(false)

    const handleAdminClick = () => {
        setPasswordInput('')
        setPasswordError(false)
        setShowPassword(false)
        setShowPasswordModal(true)
    }

    const handleTrainingStartClick = async () => {
        setIsLoadingSessions(true)
        setShowSessionModal(true)
        try {
            const sessions = await fetchActiveSessions()
            setActiveSessions(sessions)
        } catch (e) {
            console.error(e)
            alert('セッション一覧の取得に失敗しました。')
        } finally {
            setIsLoadingSessions(false)
        }
    }

    const handleSelectSession = (sessionId: string) => {
        setActiveSession(sessionId)
        setShowSessionModal(false)
        navigate('/training')
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordInput === 'komonji') {
            setShowPasswordModal(false)
            // パスワード成功後、管理メニューモーダルを表示
            setIsLoadingSessions(true)
            setShowAdminActionModal(true)
            try {
                const sessions = await fetchActiveSessions()
                setActiveSessions(sessions)
            } catch (e) {
                console.error(e)
                alert('セッション一覧の取得に失敗しました。')
            } finally {
                setIsLoadingSessions(false)
            }
        } else {
            setPasswordError(true)
            setPasswordInput('')
        }
    }

    const handleModalClose = () => {
        setShowPasswordModal(false)
        setPasswordInput('')
        setPasswordError(false)
    }

    return (
        <div className="launcher-page">
            {/* パスワードモーダル */}
            {showPasswordModal && (
                <div className="launcher-modal-overlay" onClick={handleModalClose}>
                    <div
                        className="launcher-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="launcher-modal__icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2 className="launcher-modal__title">管理者認証</h2>
                        <p className="launcher-modal__subtitle">
                            パスワードを入力してください<br/>
                            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>ヒント:このアプリを作った病院の名前</span>
                        </p>
                        <form onSubmit={handlePasswordSubmit} className="launcher-modal__form">
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordInput}
                                    onChange={(e) => {
                                        setPasswordInput(e.target.value)
                                        setPasswordError(false)
                                    }}
                                    placeholder="パスワード"
                                    className={`launcher-modal__input ${passwordError ? 'launcher-modal__input--error' : ''}`}
                                    autoFocus
                                    style={{ width: '100%' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', padding: '0.2rem' }}
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>
                            {passwordError && (
                                <p className="launcher-modal__error" style={{ marginTop: '0.5rem' }}>パスワードが正しくありません</p>
                            )}
                            <button
                                type="submit"
                                className="launcher-modal__btn launcher-modal__btn--primary"
                                disabled={!passwordInput}
                            >
                                管理画面へ進む
                            </button>
                            <button
                                type="button"
                                className="launcher-modal__btn launcher-modal__btn--secondary"
                                onClick={handleModalClose}
                            >
                                キャンセル
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* セッション選択モーダル */}
            {showSessionModal && (
                <div className="launcher-modal-overlay" onClick={() => setShowSessionModal(false)}>
                    <div className="launcher-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h2 className="launcher-modal__title">訓練セッション選択</h2>
                        <p className="launcher-modal__subtitle" style={{marginBottom: '1rem'}}>参加するセッションを選んでください</p>
                        
                        {isLoadingSessions ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--gray-500)' }}>読み込み中...</div>
                        ) : activeSessions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--status-red)' }}>
                                現在アクティブなセッションはありません。<br/>管理画面から新しく開始してください。
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                                {activeSessions.map(session => (
                                    <button 
                                        key={session.id} 
                                        onClick={() => handleSelectSession(session.id)}
                                        className="button button--secondary"
                                        style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', width: '100%' }}
                                    >
                                        <span style={{ fontWeight: 'bold' }}>{session.title || '無題のセッション'}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>ID: {session.id}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            className="launcher-modal__btn launcher-modal__btn--secondary"
                            onClick={() => setShowSessionModal(false)}
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            )}

            {/* 管理メニュー選択モーダル */}
            {showAdminActionModal && (
                <div className="launcher-modal-overlay" onClick={() => setShowAdminActionModal(false)}>
                    <div className="launcher-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <h2 className="launcher-modal__title" style={{ marginBottom: '1.5rem' }}>管理メニュー選択</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <button 
                                onClick={() => { setActiveSession(null); navigate('/admin', { state: { action: 'new_session' }}) }}
                                className="button button--primary"
                                style={{ width: '100%', padding: '0.75rem' }}
                            >
                                新規セッション開始
                            </button>
                            <button 
                                onClick={() => { setActiveSession(null); navigate('/admin', { state: { action: 'master' }}) }}
                                className="button button--secondary"
                                style={{ width: '100%', padding: '0.75rem', borderColor: '#8b5cf6', color: '#6d28d9' }}
                            >
                                患者CSV一括インポート／マスター編集
                            </button>
                        </div>

                        {isLoadingSessions ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--gray-500)' }}>読み込み中...</div>
                        ) : activeSessions.length > 0 ? (
                            <>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>アクティブなセッションを管理</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                                    {activeSessions.map(session => (
                                        <button 
                                            key={session.id} 
                                            onClick={() => { setActiveSession(session.id); navigate('/admin', { state: { action: 'manage' }}) }}
                                            className="button button--secondary"
                                            style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', width: '100%', padding: '0.5rem 1rem' }}
                                        >
                                            <span style={{ fontWeight: 'bold' }}>{session.title || '無題のセッション'}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>ID: {session.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : null}

                        <button
                            type="button"
                            className="launcher-modal__btn launcher-modal__btn--secondary"
                            onClick={() => setShowAdminActionModal(false)}
                            style={{ marginTop: 'auto' }}
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            )}

            {/* メインコンテンツ */}
            <div className="launcher-content">
                {/* ロゴ・アイコンエリア */}
                <div className="launcher-hero">
                    <div className="launcher-hero__icon-wrapper" style={{ width: '240px', height: '240px' }}>
                        <img
                            src="/icon-192.png"
                            alt="DISASTER LOGIC"
                            className="launcher-hero__icon"
                            style={{ width: '100%', height: '100%' }}
                            onError={(e) => {
                                const target = e.currentTarget
                                target.style.display = 'none'
                            }}
                        />
                    </div>
                    <h1 className="launcher-hero__title">DISASTER LOGIC</h1>
                    <p className="launcher-hero__subtitle">災害医療訓練システム</p>
                </div>

                {/* ボタンエリア */}
                <div className="launcher-buttons">
                    <button
                        className="launcher-btn launcher-btn--training"
                        onClick={handleTrainingStartClick}
                        id="btn-training-start"
                    >
                        <span className="launcher-btn__icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                <path d="M10 8l6 4-6 4V8z" fill="currentColor"/>
                            </svg>
                        </span>
                        <span className="launcher-btn__label">訓練スタート</span>
                        <span className="launcher-btn__arrow">→</span>
                    </button>

                    <button
                        className="launcher-btn launcher-btn--admin"
                        onClick={handleAdminClick}
                        id="btn-admin-access"
                    >
                        <span className="launcher-btn__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </span>
                        <span className="launcher-btn__label">管理画面</span>
                        <span className="launcher-btn__arrow">→</span>
                    </button>
                </div>

                <p className="launcher-version">DISASTER LOGIC v2.0</p>
            </div>
        </div>
    )
}

export default LauncherPage
