import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export const GlobalNavigation: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const path = location.pathname

    // ランチャー（/）
    const isLauncher = path === '/'
    // 役割選択（/role-select）
    const isRoleSelect = path === '/role-select'

    // アプリトップボタン（ランチャー以外で表示）
    const showAppTop = !isLauncher
    // 役割選択ボタン（ランチャー・役割選択画面以外で表示）
    const showRoleSelect = !isLauncher && !isRoleSelect

    // /training/treatment-scan/:id の子画面なら患者ステータスへ戻るボタンを出す
    const isInsideTreatment = path.startsWith('/training/treatment-scan/')
    const pathParts = path.split('/')
    const patientId = pathParts.length > 3 ? pathParts[3] : null

    if (!showAppTop && !showRoleSelect && !isInsideTreatment) return null

    return (
        <div className="global-navigation">
            <div className="global-navigation__nav-buttons">
                {showAppTop && (
                    <button className="nav-button nav-button--home" onClick={() => navigate('/')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12L12 3L21 12M5 10V21H9V14H15V21H19V10" />
                        </svg>
                        <span>トップ</span>
                    </button>
                )}

                {showRoleSelect && (
                    <button className="nav-button nav-button--training" onClick={() => navigate('/role-select')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span>役割選択</span>
                    </button>
                )}

                {isInsideTreatment && patientId && (
                    <button className="nav-button nav-button--patient" onClick={() => navigate(`/training/patient/${patientId}`)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>患者ステータス</span>
                    </button>
                )}
            </div>
        </div>
    )
}
