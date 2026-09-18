// LockTimerOverlay - 処置タイマー中に全画面をロックするオーバーレイ
import React from 'react'
import { useNavigate } from 'react-router-dom'

interface LockTimerOverlayProps {
    remainingDisplay: string // "MM:SS" 形式
    treatmentName: string    // 実施中の処置名
    patientId: string | number | null // 患者ID（遷移用）
    patient?: any // 患者データ（段階的所見表示用）
}

const LockTimerOverlay: React.FC<LockTimerOverlayProps> = ({
    remainingDisplay,
    treatmentName,
    patientId,
    patient,
}) => {
    const navigate = useNavigate()

    React.useEffect(() => {
        // useTimer.ts の handleTimerEnd にて completeTreatment は実行されるため、
        // ここでの重複呼び出しは削除し、UIのロック解除のみを待つ
    }, [remainingDisplay, patientId])

    // タイマー進行度（0% 〜 100%）の計算
    const getProgressPct = (): number => {
        if (!patient || !patient.timer_started_at || !patient.timer_duration_ms) return 0
        const elapsed = Date.now() - patient.timer_started_at
        const total = patient.timer_duration_ms
        return Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)))
    }

    const pct = getProgressPct()
    const appliedId = patient?.applied_treatment_id

    // 該当する診察部位のフル所見テキストを取得
    const getFullFindingText = (): string => {
        if (!patient || !patient.findings || !appliedId) return ''
        const f = patient.findings
        switch (appliedId) {
            case 'head_and_neck': return f.head_and_neck || ''
            case 'chest': return f.chest || ''
            case 'abdomen_and_pelvis': return f.abdomen_and_pelvis || ''
            case 'limbs': return f.limbs || ''
            case 'fast': return f.fast || ''
            case 'ample':
                return f.ample || [
                    f.ample_a ? `A: ${f.ample_a}` : '',
                    f.ample_m ? `M: ${f.ample_m}` : '',
                    f.ample_p ? `P: ${f.ample_p}` : '',
                    f.ample_l ? `L: ${f.ample_l}` : '',
                    f.ample_e ? `E: ${f.ample_e}` : ''
                ].filter(Boolean).join('\n')
            case 'background': return f.background || ''
            default: return ''
        }
    }

    // 進行度に応じてテキストを開示
    const getRevealedText = (): string => {
        const fullText = getFullFindingText()
        if (!fullText) return '特記事項なし'
        if (pct >= 95 || remainingDisplay === '00:00') return fullText

        const sentences = fullText.split(/(?<=[。\n])/).filter(Boolean)
        if (sentences.length > 1) {
            const countToKeep = Math.max(1, Math.floor((sentences.length * pct) / 100))
            return sentences.slice(0, countToKeep).join('')
        }

        const keepLen = Math.max(2, Math.floor((fullText.length * pct) / 100))
        return `${fullText.slice(0, keepLen)}...`
    }

    const isExam = appliedId && ['head_and_neck', 'chest', 'abdomen_and_pelvis', 'limbs', 'fast', 'ample', 'background'].includes(appliedId)

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
                    </div>
                ) : (
                    <div className="lock-overlay__timer">{remainingDisplay}</div>
                )}

                {/* 診察手技の場合はカウントダウン画面上で所見を段階表示 */}
                {isExam && (
                    <div style={{
                        margin: '1rem 0',
                        padding: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        textAlign: 'left',
                        maxHeight: '160px',
                        overflowY: 'auto'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#93c5fd', fontWeight: 'bold', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>🩺 リアルタイム所見確認 ({pct}%)</span>
                            <span>{remainingDisplay === '00:00' ? '解禁完了' : '観察進行中...'}</span>
                        </div>
                        <p style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
                            {getRevealedText()}
                        </p>
                    </div>
                )}

                <p className="lock-overlay__note">
                    対象の処置・観察が完了するまで<br />
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
