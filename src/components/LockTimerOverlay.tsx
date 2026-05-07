// LockTimerOverlay - 処置タイマー中に全画面をロックするオーバーレイ
import React from 'react'
import { useNavigate } from 'react-router-dom'

interface LockTimerOverlayProps {
    remainingDisplay: string // "MM:SS" 形式
    treatmentName: string    // 実施中の処置名
    patientId: string | number | null // 患者ID（遷移用）
}

const LockTimerOverlay: React.FC<LockTimerOverlayProps> = ({
    remainingDisplay,
    treatmentName,
    patientId,
}) => {
    const navigate = useNavigate()

    return (
        <div className="lock-overlay">
            <div className="lock-overlay__inner">
                <div className="lock-overlay__badge">
                    <span style={{width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor'}}></span>
                    TREATMENT IN PROGRESS
                </div>
                <div className="lock-overlay__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{margin: '0 auto'}}>
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h2 className="lock-overlay__title">処置実行中</h2>
                <p className="lock-overlay__treatment">{treatmentName}</p>
                <div className="lock-overlay__timer">{remainingDisplay}</div>
                <p className="lock-overlay__note">
                    対象の処置が完了するまで<br/>
                    デバイスの操作はロックされます
                </p>
                <div className="lock-overlay__progress">
                    <div className="lock-overlay__progress-bar" />
                </div>
                
                {/* 離脱用CTA（下部固定） */}
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
                    <button 
                        onClick={() => navigate('/training')} 
                        className="button button--secondary" 
                        style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                    >
                        訓練トップへ戻る
                    </button>
                    {patientId && (
                        <button 
                            onClick={() => navigate(`/training/patient/${patientId}`)} 
                            className="button button--secondary" 
                            style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                        >
                            患者ステータス画面へ戻る
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LockTimerOverlay
