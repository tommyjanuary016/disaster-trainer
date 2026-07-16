import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { TransitionRoutes } from './components/TransitionRoutes'
import { GlobalNavigation } from './components/GlobalNavigation'
import { NotificationProvider } from './components/NotificationProvider'
import { setActiveSession } from './lib/firestore'

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
 * ダーク・インパクト系デザイン。
 */
const Header: React.FC = () => {
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

            {/* 右側：システムバージョン */}
            <div className="app-header__version">v2.0</div>
        </header>
    )
}

const App: React.FC = () => {
    return (
        <Router>
            <NotificationProvider>
                <div className="app-container">
                    <Header />
                    <div className="app-main">
                        <TransitionRoutes />
                    </div>
                    <GlobalNavigation />
                </div>
            </NotificationProvider>
        </Router>
    )
}

export default App
