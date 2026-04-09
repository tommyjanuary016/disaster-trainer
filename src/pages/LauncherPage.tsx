import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LauncherPage: React.FC = () => {
    const navigate = useNavigate()
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [passwordInput, setPasswordInput] = useState('')
    const [passwordError, setPasswordError] = useState(false)

    const handleAdminClick = () => {
        setPasswordInput('')
        setPasswordError(false)
        setShowPasswordModal(true)
    }

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordInput === 'komonji') {
            setShowPasswordModal(false)
            navigate('/admin')
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
                        <p className="launcher-modal__subtitle">パスワードを入力してください</p>
                        <form onSubmit={handlePasswordSubmit} className="launcher-modal__form">
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => {
                                    setPasswordInput(e.target.value)
                                    setPasswordError(false)
                                }}
                                placeholder="パスワード"
                                className={`launcher-modal__input ${passwordError ? 'launcher-modal__input--error' : ''}`}
                                autoFocus
                            />
                            {passwordError && (
                                <p className="launcher-modal__error">パスワードが正しくありません</p>
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

            {/* メインコンテンツ */}
            <div className="launcher-content">
                {/* ロゴ・アイコンエリア */}
                <div className="launcher-hero">
                    <div className="launcher-hero__icon-wrapper">
                        <img
                            src="/icon-192.png"
                            alt="DISASTER LOGIC"
                            className="launcher-hero__icon"
                            onError={(e) => {
                                // アイコン読み込み失敗時のフォールバック
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
                        onClick={() => navigate('/training')}
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
