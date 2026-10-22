import React, { useState } from 'react'
import { BrowserRouter as Router, useLocation } from 'react-router-dom'
import { TransitionRoutes } from './components/TransitionRoutes'
import { GlobalNavigation } from './components/GlobalNavigation'
import { NotificationProvider } from './components/NotificationProvider'
import { setActiveSession } from './lib/firestore'
import { APP_VERSION } from './version'
import { soundEngine } from './lib/soundEngine'

// URLのクエリパラメータからセッションIDを検出し、最優先で設定する
const params = new URLSearchParams(window.location.search)
const sessionIdParam = params.get('session_id') || params.get('sid')
if (sessionIdParam) {
    setActiveSession(sessionIdParam)
    // クエリパラメータを取り除いて /role-select へリダイレクト
    window.location.href = '/role-select'
}

/**
 * アプリのグローバルヘッダー。
 * ダーク・インパクト系デザイン ＋ マルチモーダル音響ミュート切替スイッチ搭載。
 */
const Header: React.FC = () => {
    const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.isMuted())

    const handleToggleSound = () => {
        const nextMuted = soundEngine.toggleMute()
        setIsMuted(nextMuted)
    }

    return (
        <header className="app-header">
            {/* 左側：パルスインジケーター */}
            <div className="app-header__status">
                <span className="app-header__status-dot" />
                <span className="app-header__status-text">LIVE</span>
            </div>

            {/* 中央：タイトル */}
            <div className="app-header__center">
                <span className="app-header__logo-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                </span>
                <h1 className="app-header__title">DISASTER LOGIC</h1>
            </div>

            {/* 右側：サウンドON/OFFスイッチ ＆ システムバージョン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'absolute', right: '0.85rem' }}>
                <button
                    type="button"
                    onClick={handleToggleSound}
                    title={isMuted ? '効果音・振動をONにする' : '効果音・振動をミュートする'}
                    style={{
                        background: isMuted ? 'rgba(148, 163, 184, 0.15)' : 'rgba(37, 99, 235, 0.12)',
                        border: `1px solid ${isMuted ? 'rgba(148, 163, 184, 0.35)' : 'rgba(37, 99, 235, 0.3)'}`,
                        color: isMuted ? 'var(--gray-500)' : 'var(--accent)',
                        borderRadius: '999px',
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <span>{isMuted ? '🔇' : '🔊'}</span>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '0.03em' }}>{isMuted ? 'MUTE' : 'SE/VIB'}</span>
                </button>
                <div className="app-header__version" style={{ position: 'static' }}>{APP_VERSION}</div>
            </div>
        </header>
    )
}

const AppLayout: React.FC = () => {
    const location = useLocation()
    // 管理画面（/admin）およびQR印刷（/qr-generator）はPC・大型モニターのワイド画面表示に対応する
    const isWideMode = location.pathname.startsWith('/admin') || location.pathname.startsWith('/qr-generator')

    return (
        <div className={`app-container ${isWideMode ? 'app-container--wide' : ''}`}>
            <Header />
            <div className="app-main">
                <TransitionRoutes />
            </div>
            <GlobalNavigation />
        </div>
    )
}

const App: React.FC = () => {
    return (
        <Router>
            <NotificationProvider>
                <AppLayout />
            </NotificationProvider>
        </Router>
    )
}

export default App

