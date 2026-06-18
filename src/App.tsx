import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { TransitionRoutes } from './components/TransitionRoutes'
import { GlobalNavigation } from './components/GlobalNavigation'
import { NotificationProvider } from './components/NotificationProvider'

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
