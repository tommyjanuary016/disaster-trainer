import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRole, Role } from '../hooks/useRole'

export const GlobalNavigation: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const path = location.pathname
    const { role, setRole } = useRole()

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
        <div className="global-navigation" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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

            {/* ロール選択 */}
            <div className="role-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>役割:</span>
                <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as Role)}
                    style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--gray-300)',
                        backgroundColor: 'white'
                    }}
                >
                    <option value="未設定">未設定</option>
                    <option value="医師">医師</option>
                    <option value="看護師">看護師</option>
                    <option value="放射線技師">放射線技師</option>
                    <option value="臨床検査技師">臨床検査技師</option>
                    <option value="管理者">管理者</option>
                </select>
            </div>
        </div>

        {/* フローティングQRスキャンボタン：訓練画面内でまオプション */}
        {path.startsWith('/training') &&
         !path.startsWith('/training/scan') &&
         !path.startsWith('/training/actor') &&
         path !== '/training' && (
            <button
                onClick={() => navigate('/training/scan')}
                title="QRスキャンで患者を開く"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    zIndex: 1000,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    fontSize: '1.6rem',
                    lineHeight: 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
                📷
            </button>
        )}
    </>
    )
}
