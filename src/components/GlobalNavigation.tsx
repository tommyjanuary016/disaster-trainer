import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export const GlobalNavigation: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const path = location.pathname

    // 管理画面（/admin）ではアプリトップのみ表示
    const isAdmin = path === '/admin'
    // ランチャー（/）では訓練トップのみ
    const isLauncher = path === '/'
    // 訓練トップ（/training）ではアプリトップのみ
    const isTrainingTop = path === '/training'

    // アプリトップボタン（ランチャーにいる場合は非表示）
    const showAppTop = !isLauncher
    // 訓練トップボタン（訓練トップ・管理画面・ランチャーにいる場合は非表示）
    const showTrainingTop = !isLauncher && !isAdmin && !isTrainingTop

    // /training/treatment-scan/:id の子画面なら患者トップに戻るボタンを出す
    const isInsidePatient = path.startsWith('/training/treatment-scan/')
    const pathParts = path.split('/')
    const patientId = pathParts.length > 3 ? pathParts[3] : null

    // どちらも非表示の場合は何も描画しない
    if (!showAppTop && !showTrainingTop && !isInsidePatient) return null

    return (
        <>
        <div className="global-navigation">
            {/* ナビゲーションボタン群 */}
            <div className="global-navigation__nav-buttons">
                {showAppTop && (
                    <button className="nav-button nav-button--home" onClick={() => navigate('/')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12L12 3L21 12M5 10V21H9V14H15V21H19V10" />
                        </svg>
                        <span>トップ</span>
                    </button>
                )}

                {showTrainingTop && (
                    <button className="nav-button nav-button--training" onClick={() => navigate('/role-select')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span>訓練トップ</span>
                    </button>
                )}

                {isInsidePatient && patientId && (
                    <button className="nav-button nav-button--patient" onClick={() => navigate(`/training/patient/${patientId}`)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>患者詳細</span>
                    </button>
                )}
            </div>
        </div>
        </>
    )
}
