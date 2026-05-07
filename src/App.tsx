import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { TransitionRoutes } from './components/TransitionRoutes'
import { GlobalNavigation } from './components/GlobalNavigation'

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
