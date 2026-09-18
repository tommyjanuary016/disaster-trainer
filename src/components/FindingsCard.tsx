import React, { useState, useEffect } from 'react'
import { PatientFindings, Patient } from '../types/patient'

interface FindingsCardProps {
    findings: PatientFindings
    completedTreatments: string[]
    consciousnessLevel?: string
    patient?: Patient | null
}

const FindingsCard: React.FC<FindingsCardProps> = ({ findings, completedTreatments, consciousnessLevel, patient }) => {
    // リアルタイム更新用（1秒ごとの再描画）
    const [, setTick] = useState(0)

    useEffect(() => {
        const isTimerActive = patient?.status === '処置中' && patient?.timer_started_at && patient?.timer_duration_ms
        if (!isTimerActive) return

        const timer = setInterval(() => {
            setTick(t => t + 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [patient?.status, patient?.timer_started_at, patient?.timer_duration_ms])

    const hasIntubation = completedTreatments.includes('intubation') || completedTreatments.includes('surgical_airway')
    const hasSedation = completedTreatments.includes('sedation')
    let isUnconscious = false
    if (consciousnessLevel) {
        const level = String(consciousnessLevel).toLowerCase()
        if (level.includes('3桁') || level.includes('200') || level.includes('300') || level.includes('100') || level.includes('20') || level.includes('30')) {
            isUnconscious = true
        }
    }
    const isAnamnesisBlocked = hasIntubation || hasSedation || isUnconscious
    const blockedReason = hasIntubation 
        ? '⚠️ 気管挿管中のため問診不可' 
        : hasSedation 
            ? '⚠️ 鎮静薬投与中のため問診不可' 
            : '⚠️ 意識障害（JCS 20以上/3桁等）のため問診不可'

    /** タイマーの進行度（0% 〜 100%）と残り時間を計算 */
    const getTimerProgress = (id: string): { inProgress: boolean; progressPct: number; remainingSec: number } => {
        if (!patient || patient.status !== '処置中' || patient.applied_treatment_id !== id) {
            return { inProgress: false, progressPct: 0, remainingSec: 0 }
        }
        if (!patient.timer_started_at || !patient.timer_duration_ms) {
            return { inProgress: false, progressPct: 0, remainingSec: 0 }
        }

        const now = Date.now()
        const elapsed = now - patient.timer_started_at
        const total = patient.timer_duration_ms
        const remaining = Math.max(0, total - elapsed)
        const pct = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)))

        return {
            inProgress: true,
            progressPct: pct,
            remainingSec: Math.ceil(remaining / 1000),
        }
    }

    /** 進行率に応じた段階的テキスト開示 */
    const getPartialRevealedText = (fullText: string, pct: number): string => {
        if (!fullText) return '所見なし'
        if (pct >= 95) return fullText

        // 改行または句点で分割
        const sentences = fullText.split(/(?<=[。\n])/).filter(Boolean)
        if (sentences.length > 1) {
            const countToKeep = Math.max(1, Math.floor((sentences.length * pct) / 100))
            const visible = sentences.slice(0, countToKeep).join('')
            return `${visible}\n ⏳（診察・評価中... ${pct}%）`
        }

        // 単一文章の場合は文字数割合で開示
        const keepLen = Math.max(2, Math.floor((fullText.length * pct) / 100))
        return `${fullText.slice(0, keepLen)} ... ⏳（診察・評価中... ${pct}%）`
    }

    const renderFinding = (id: string, label: string, value: string, isPre: boolean = false) => {
        const isAnamnesisItem = id === 'ample' || id === 'background'
        if (isAnamnesisItem && isAnamnesisBlocked) {
            return (
                <div className={`findings-card__item ${isPre ? 'findings-card__item--full' : ''}`} style={{ opacity: 0.75, backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="findings-card__label" style={{ color: 'var(--danger)' }}>{label} (問診不可)</span>
                    <p className="findings-card__value" style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                        {blockedReason}
                    </p>
                </div>
            )
        }

        const isRevealed = completedTreatments.includes(id)
        const { inProgress, progressPct, remainingSec } = getTimerProgress(id)

        if (inProgress) {
            const partialText = getPartialRevealedText(value, progressPct)
            const minutes = Math.floor(remainingSec / 60)
            const seconds = remainingSec % 60
            const timeStr = `${minutes}分${seconds.toString().padStart(2, '0')}秒`

            return (
                <div className={`findings-card__item ${isPre ? 'findings-card__item--full' : ''}`} style={{ border: '2px solid #3b82f6', background: 'rgba(59, 130, 246, 0.04)', borderRadius: '10px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span className="findings-card__label" style={{ color: '#1d4ed8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ display: 'inline-block', animation: 'spin 2s linear infinite' }}>🩺</span>
                            {label}（診察中）
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e40af', background: '#dbeafe', padding: '2px 8px', borderRadius: '12px' }}>
                            残り {timeStr} ({progressPct}%)
                        </span>
                    </div>

                    {/* プログレスバー */}
                    <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.6rem' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #2563eb)', transition: 'width 0.5s ease-out' }} />
                    </div>

                    <p className={`findings-card__value ${isPre ? 'findings-card__value--pre' : ''}`} style={{ color: '#1e293b', lineHeight: '1.6' }}>
                        {partialText}
                    </p>
                </div>
            )
        }

        return (
            <div className={`findings-card__item ${isPre ? 'findings-card__item--full' : ''} ${isRevealed ? 'findings-card__item--revealed' : ''}`}>
                <span className="findings-card__label">{label}</span>
                <p className={`findings-card__value ${isPre ? 'findings-card__value--pre' : ''} ${!isRevealed ? 'findings-card__value--locked' : ''}`}>
                    {isRevealed ? value : '未実施（検査を行ってください）'}
                </p>
            </div>
        )
    }

    // AMPLE5項目を組み立てる（分割データ優先、なければ旧ampleフィールドを表示）
    const hasAmpleSplit = findings.ample_a || findings.ample_m || findings.ample_p || findings.ample_l || findings.ample_e
    const ampleDisplayText = hasAmpleSplit
        ? [
            findings.ample_a ? `A（アレルギー）：${findings.ample_a}` : null,
            findings.ample_m ? `M（内服薬）：${findings.ample_m}` : null,
            findings.ample_p ? `P（既往歴・妊娠）：${findings.ample_p}` : null,
            findings.ample_l ? `L（最終飲食）：${findings.ample_l}` : null,
            findings.ample_e ? `E（受傷機転）：${findings.ample_e}` : null,
          ].filter(Boolean).join('\n')
        : (findings.ample || '')

    return (
        <div className="findings-card">
            <h3 className="findings-card__title">所見詳細</h3>
            <div className="findings-card__grid">
                {renderFinding('head_and_neck', '頭頸部', findings.head_and_neck)}
                {renderFinding('chest', '胸部', findings.chest)}
                {renderFinding('abdomen_and_pelvis', '腹部・骨盤', findings.abdomen_and_pelvis)}
                {renderFinding('limbs', '四肢', findings.limbs)}
                {renderFinding('fast', 'FAST', findings.fast)}
                {renderFinding('ample', 'AMPLE', ampleDisplayText, true)}
                {renderFinding('background', '患者背景', findings.background, true)}
            </div>
        </div>
    )
}

export default FindingsCard
