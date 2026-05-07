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
        <div className="global-navigation">
            {showAppTop && (
                <button className="nav-button nav-button--home" onClick={() => navigate('/')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12L12 3L21 12M5 10V21H9V14H15V21H19V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>アプリトップ</span>
                </button>
            )}

            {showTrainingTop && (
                <button className="nav-button nav-button--training" onClick={() => navigate('/training')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M10 8l6 4-6 4V8z" fill="currentColor"/>
                    </svg>
                    <span>訓練トップ</span>
                </button>
            )}

            {isInsidePatient && patientId && (
                <button className="nav-button nav-button--patient" onClick={() => navigate(`/training/patient/${patientId}`)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>患者ステータス</span>
                </button>
            )}
        </div>
    )
}
