import React from 'react'
import { BrowserRouter as Router, useNavigate, useLocation } from 'react-router-dom'
import { TransitionRoutes } from './components/TransitionRoutes'
import { GlobalNavigation } from './components/GlobalNavigation'

const Header: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const isTop = location.pathname === '/'

    return (
        <header className="app-header">
            {!isTop && (
                <button
                    onClick={() => navigate(-1)}
                    className="app-header__back"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    戻る
                </button>
            )}
            <h1>DISASTER LOGIC</h1>
        </header>
    )
}

const App: React.FC = () => {
    return (
        <Router>
            <div className="app-container">
                <Header />
                <div className="app-main">
                    <TransitionRoutes />
                </div>
                <GlobalNavigation />
            </div>
        </Router>
    )
}

export default App
