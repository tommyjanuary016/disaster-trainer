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

const Header: React.FC = () => {
    return (
        <header className="app-header">
            <h1 style={{ width: '100%', textAlign: 'center', margin: 0 }}>DISASTER LOGIC</h1>
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
