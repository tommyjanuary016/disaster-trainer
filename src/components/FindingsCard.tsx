import React from 'react'
import { PatientFindings } from '../types/patient'

interface FindingsCardProps {
    findings: PatientFindings
    completedTreatments: string[]
}

const FindingsCard: React.FC<FindingsCardProps> = ({ findings, completedTreatments }) => {
    const renderFinding = (id: string, label: string, value: string, isPre: boolean = false) => {
        const isRevealed = completedTreatments.includes(id)
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
