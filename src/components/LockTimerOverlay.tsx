// LockTimerOverlay - 処置タイマー中に全画面をロックするオーバーレイ
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { completeTreatment } from '../lib/firestore'

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
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
                    TREATMENT IN PROGRESS
                </div>
                <div className="lock-overlay__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto' }}>
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h2 className="lock-overlay__title">処置実行中</h2>
                <p className="lock-overlay__treatment">{treatmentName}</p>
                {remainingDisplay === '00:00' ? (
                    <div style={{ margin: '1rem 0' }}>
                        <p style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                            ✅ 処置・観察が完了しました！
                        </p>
                        {patientId && (
                            <button
                                onClick={() => {
                                    if (typeof patientId === 'number' || typeof patientId === 'string') {
                                        completeTreatment(Number(patientId), true).catch(e => console.error(e))
                                    }
                                    window.location.reload()
                                }}
                                className="button button--primary"
                                style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', backgroundColor: '#22c55e', borderColor: '#16a34a' }}
                            >
                                画面をリロードして結果を確認
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="lock-overlay__timer">{remainingDisplay}</div>
                )}
                <p className="lock-overlay__note">
                    対象の処置・観察が完了するまで<br />
                    デバイスの操作はロックされます
                </p>
                <div className="lock-overlay__progress">
                    <div className="lock-overlay__progress-bar" />
                </div>

                {/*