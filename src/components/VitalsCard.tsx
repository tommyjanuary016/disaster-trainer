import React from 'react'
import { VitalSignStruct } from '../types/patient'

interface VitalsCardProps {
    vitals: string           // フリーテキスト（下位互換用フォールバック）
    vitalsStruct?: VitalSignStruct  // 構造化データ（優先表示）
    title: string
    isBlurred?: boolean
}

/** 異常値の閾値判定（簡易ハイライト用） */
const isAbnormal = (key: keyof VitalSignStruct, val: number): boolean => {
    switch (key) {
        case 'sbp':  return val < 90 || val > 170
        case 'hr':   return val < 50 || val > 120
        case 'rr':   return val < 10 || val > 25
        case 'spo2': return val < 94
        case 'gcs_e': return val < 4
        case 'gcs_v': return val < 5
        case 'gcs_m': return val < 6
        default:     return false
    }
}

const VitalsGrid: React.FC<{ s: VitalSignStruct }> = ({ s }) => {
    const hasGCS = s.gcs_e !== undefined || s.gcs_v !== undefined || s.gcs_m !== undefined
    const gcsTotal = (s.gcs_e ?? 4) + (s.gcs_v ?? 5) + (s.gcs_m ?? 6)
    const isGcsAbnormal = hasGCS && (
        (s.gcs_e !== undefined && s.gcs_e < 4) ||
        (s.gcs_v !== undefined && s.gcs_v < 5) ||
        (s.gcs_m !== undefined && s.gcs_m < 6)
    )

    return (
        <div className="vitals-grid">
            {/* 血圧は SBP/DBP を1セルにまとめる */}
            <div className="vitals-grid__cell">
                <div className="vitals-grid__label">血圧</div>
                <div className={`vitals-grid__value ${isAbnormal('sbp', s.sbp) ? 'vitals-grid__value--danger' : ''}`}>
                     {s.sbp}<span className="vitals-grid__sep">/</span>{s.dbp}
                </div>
                <div className="vitals-grid__unit">mmHg</div>
            </div>

            <div className="vitals-grid__cell">
                <div className="vitals-grid__label">HR</div>
                <div className={`vitals-grid__value ${isAbnormal('hr', s.hr) ? 'vitals-grid__value--danger' : ''}`}>
                    {s.hr}
                </div>
                <div className="vitals-grid__unit">bpm</div>
            </div>

            <div className="vitals-grid__cell">
                <div className="vitals-grid__label">RR</div>
                <div className={`vitals-grid__value ${isAbnormal('rr', s.rr) ? 'vitals-grid__value--danger' : ''}`}>
                    {s.rr}
                </div>
                <div className="vitals-grid__unit">/min</div>
            </div>

            <div className="vitals-grid__cell">
                <div className="vitals-grid__label">SpO2</div>
                <div className={`vitals-grid__value ${isAbnormal('spo2', s.spo2) ? 'vitals-grid__value--danger' : ''}`}>
                    {s.spo2}
                </div>
                <div className="vitals-grid__unit">%</div>
            </div>

            <div className="vitals-grid__cell">
                <div className="vitals-grid__label">Temp</div>
                <div className="vitals-grid__value">{s.temp}</div>
                <div className="vitals-grid__unit">℃</div>
            </div>

            {hasGCS && (
                <div className="vitals-grid__cell">
                    <div className="vitals-grid__label">GCS</div>
                    <div className={`vitals-grid__value ${isGcsAbnormal ? 'vitals-grid__value--danger' : ''}`} style={{ whiteSpace: 'nowrap' }}>
                        E{s.gcs_e ?? 4}V{s.gcs_v ?? 5}M{s.gcs_m ?? 6}
                        <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginLeft: '0.2rem', fontWeight: 'normal' }}>
                            ({gcsTotal})
                        </span>
                    </div>
                    <div className="vitals-grid__unit">意識</div>
                </div>
            )}
        </div>
    )
}

const VitalsCard: React.FC<VitalsCardProps> = ({ vitals, vitalsStruct, title, isBlurred = false }) => {
    return (
        <div className={`vitals-card ${isBlurred ? 'vitals-card--blurred' : ''}`}>
            <h3 className="vitals-card__title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px', verticalAlign: 'middle'}}>
                    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {title}
            </h3>
            {isBlurred ? (
                <div className="vitals-card__blur-message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15V17M12 7V13M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    所見観察を完了して詳細を表示
                </div>
            ) : vitalsStruct ? (
                /* 構造化データがあればグリッド表示 */
                <VitalsGrid s={vitalsStruct} />
            ) : (
                /* フォールバック：従来のフリーテキスト表示 */
                <pre className="vitals-card__content">{vitals}</pre>
            )}
        </div>
    )
}

export default VitalsCard
