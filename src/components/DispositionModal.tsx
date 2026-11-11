import React, { useState } from 'react'
import { Patient, PatientDisposition, PatientDispositionDestination, VitalSignStruct } from '../types/patient'
import { computeCurrentPatientVitals, formatVitals } from '../hooks/useDeterioration'
import { updatePatientDisposition } from '../lib/firestore'
import { soundEngine } from '../lib/soundEngine'

interface DispositionOption {
    id: PatientDispositionDestination
    label: string
    subLabel: string
    icon: string
    color: string
    recommendedFor?: string
}

const DISPOSITION_OPTIONS: DispositionOption[] = [
    {
        id: 'discharge',
        label: '帰宅',
        subLabel: '軽症・処置終了・退場口へ',
        icon: '🏠',
        color: '#10b981',
        recommendedFor: '緑',
    },
    {
        id: 'ward',
        label: '一般病棟',
        subLabel: '入院治療・経過観察',
        icon: '🛏️',
        color: '#3b82f6',
        recommendedFor: '黄',
    },
    {
        id: 'or',
        label: '手術室',
        subLabel: '緊急開腹・開胸・止血術',
        icon: '🏥',
        color: '#f97316',
        recommendedFor: '赤',
    },
    {
        id: 'icu_hcu',
        label: '集中治療室 (ICU/HCU)',
        subLabel: '重症管理・人工呼吸器等',
        icon: '🩺',
        color: '#8b5cf6',
        recommendedFor: '赤',
    },
    {
        id: 'angio',
        label: 'カテ室 / 血管造影室',
        subLabel: 'TAE・IVR・緊急カテーテル',
        icon: '🔬',
        color: '#ec4899',
        recommendedFor: '赤',
    },
    {
        id: 'transfer',
        label: '他院転送',
        subLabel: '後方病院・高次救命センター搬送',
        icon: '🚑',
        color: '#06b6d4',
    },
    {
        id: 'morgue',
        label: '霊安室',
        subLabel: '不処置・死亡確認 (黒)',
        icon: '🕊️',
        color: '#64748b',
        recommendedFor: '黒',
    },
]

interface DispositionModalProps {
    patient: Patient
    onClose: () => void
    mode?: 'actor' | 'staff'
    onSuccess?: (disposition: PatientDisposition) => void
}

export const DispositionModal: React.FC<DispositionModalProps> = ({
    patient,
    onClose,
    mode = 'actor',
    onSuccess,
}) => {
    // デフォルトで患者のトリアージカラーに応じた行き先を選択
    const defaultOption = DISPOSITION_OPTIONS.find(opt => opt.recommendedFor === patient.triage_color) || DISPOSITION_OPTIONS[0]
    const [selectedDestination, setSelectedDestination] = useState<PatientDispositionDestination>(defaultOption.id)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 現在時刻時点での最新バイタルとCPA状態を計算
    const currentStatus = computeCurrentPatientVitals(patient, Date.now())

    const handleConfirm = async () => {
        if (isSubmitting) return
        setIsSubmitting(true)

        try {
            const selectedOpt = DISPOSITION_OPTIONS.find(opt => opt.id === selectedDestination)
            const destinationLabel = selectedOpt?.label || '未設定'
            const now = Date.now()

            const dispositionData: PatientDisposition = {
                destination: selectedDestination,
                destination_label: destinationLabel,
                completed_at_ms: now,
                final_vitals: currentStatus.vitalsStruct || undefined,
                final_vitals_text: currentStatus.vitalsText,
                is_cpa_at_disposition: currentStatus.isCpa,
                is_stabilized: currentStatus.isStabilized,
                disposition_by: mode,
            }

            // 効果音再生
            try {
                if (currentStatus.isCpa) {
                    soundEngine.playTimerExpired()
                } else {
                    soundEngine.playSuccess()
                }
            } catch {
                // サウンドエラーは無視
            }

            await updatePatientDisposition(patient.id, dispositionData)

            if (onSuccess) {
                onSuccess(dispositionData)
            }
            onClose()
        } catch (err) {
            console.error('Disposition update failed:', err)
            alert('搬出登録に失敗しました。もう一度お試しください。')
            setIsSubmitting(false)
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
                backdropFilter: 'blur(4px)',
            }}
            onClick={e => {
                if (e.target === e.currentTarget && !isSubmitting) onClose()
            }}
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '520px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* ヘッダー */}
                <div
                    style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: mode === 'actor' ? '#f0fdf4' : '#eff6ff',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{mode === 'actor' ? '🏁' : '🚑'}</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 'bold' }}>
                                {mode === 'actor' ? '目的地・終了地点への到着報告' : '患者搬出（行き先決定・終了）'}
                            </h3>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                {mode === 'actor'
                                    ? '案内された目的地に到着したら行き先を選択して確定してください'
                                    : '行き先を決定し、患者の初療・訓練フェーズを完了します'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.3rem',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: '0.2rem 0.5rem',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 患者サマリー ＆ 現在バイタルプレビュー */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b' }}>
                            {patient.name} 様 ({patient.age}歳・{patient.gender === 'M' ? '男性' : '女性'})
                        </div>
                        <span
                            style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                backgroundColor:
                                    patient.triage_color === '赤' ? '#ef4444' :
                                    patient.triage_color === '黄' ? '#eab308' :
                                    patient.triage_color === '緑' ? '#10b981' : '#1e293b'
                            }}
                        >
                            トリアージ: {patient.triage_color}
                        </span>
                    </div>

                    {/* CPA警告 or 安定化通知 */}
                    {currentStatus.isCpa ? (
                        <div
                            style={{
                                padding: '0.6rem 0.8rem',
                                backgroundColor: '#fee2e2',
                                border: '1px solid #f87171',
                                borderRadius: '8px',
                                color: '#991b1b',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <span>🚨</span>
                            <span>警告: 患者は悪化進行により <strong>CPA（心肺停止状態）</strong> に到達しています。</span>
                        </div>
                    ) : currentStatus.isStabilized ? (
                        <div
                            style={{
                                padding: '0.5rem 0.8rem',
                                backgroundColor: '#dcfce7',
                                border: '1px solid #86efac',
                                borderRadius: '8px',
                                color: '#166534',
                                fontSize: '0.82rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <span>🛡️</span>
                            <span>必須処置完了によりバイタル安定化済みで搬出されます。</span>
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            現在のバイタル状況で搬出記録されます。
                        </div>
                    )}
                </div>

                {/* 行き先選択肢 */}
                <div style={{ padding: '1rem 1.5rem', flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.6rem' }}>
                        行き先（搬出・到着先）を選択:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                        {DISPOSITION_OPTIONS.map(opt => {
                            const isSelected = selectedDestination === opt.id
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setSelectedDestination(opt.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: '10px',
                                        border: isSelected ? `2px solid ${opt.color}` : '1px solid #cbd5e1',
                                        backgroundColor: isSelected ? `${opt.color}10` : '#ffffff',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <span style={{ fontSize: '1.4rem' }}>{opt.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isSelected ? opt.color : '#1e293b' }}>
                                            {opt.label}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {opt.subLabel}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <span style={{ color: opt.color, fontWeight: 'bold', fontSize: '1rem' }}>✓</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* フッターアクション */}
                <div
                    style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                        backgroundColor: '#f8fafc',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                        }}
                    >
                        キャンセル
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        style={{
                            padding: '0.6rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: currentStatus.isCpa ? '#ef4444' : '#2563eb',
                            color: '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        {isSubmitting ? (
                            '保存中...'
                        ) : (
                            <>
                                <span>確定して終了する</span>
                                <span>➔</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
