import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export const GlobalNavigation: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()

    // トップ画面の場合は表示しない
    const isTop = location.pathname === '/'

    // 現在の画面が「患者トップ（ステータス画面）」かどうか。手技選択などの子画面なら患者トップに戻るボタンを出す。
    const isInsidePatient = location.pathname.startsWith('/treatment-scan/')
    // ※/treatment-scan/:id のURLからIDを抽出して戻るため
    const pathParts = location.pathname.split('/')
    // /treatment-scan/123 -> pathParts[2] is 123
    const patientId = pathParts.length > 2 ? pathParts[2] : null

    if (isTop) return null

    return (
        <div className="global-navigation">
            <button className="nav-button nav-button--home" onClick={() => navigate('/')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12L12 3L21 12M5 10V21H9V14H15V21H19V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>トップへ戻る</span>
            </button>

            {isInsidePatient && patientId && (
                <button className="nav-button nav-button--patient" onClick={() => navigate(`/patient/${patientId}`)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>患者ステータス</span>
                </button>
            )}
        </div>
    )
}
