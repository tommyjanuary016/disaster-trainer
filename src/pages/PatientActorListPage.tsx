import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeToAllPatients, activeSessionId } from '../lib/firestore'
import { Patient } from '../types/patient'

const PatientActorListPage: React.FC = () => {
    const navigate = useNavigate()
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // セッション内の患者のみ取得する
        const unsubscribe = subscribeToAllPatients((data) => {
            // トリアージカラー順（赤→黄→緑→黒）でソート
            const order: Record<string, number> = { '赤': 1, '黄': 2, '緑': 3, '黒': 4 }
            data.sort((a, b) => (order[a.triage_color] || 9) - (order[b.triage_color] || 9))
            setPatients(data)
            setLoading(false)
        }, true) // sessionIdOnly = true

        return () => unsubscribe()
    }, [])

    const triageColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
        '赤': { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', label: '重症（赤）' },
        '黄': { bg: '#fefce8', border: '#fde047', text: '#854d0e', label: '中等症（黄）' },
        '緑': { bg: '#f0fdf4', border: '#86efac', text: '#166534', label: '軽症（緑）' },
        '黒': { bg: '#f4f4f5', border: '#a1a1aa', text: '#27272a', label: '搬送不能（黒）' },
    }

    return (
        <div className="actor-list-page">
            <header className="actor-page__header" style={{ marginBottom: '0.5rem' }}>
                <button className="actor-page__back" onClick={() => navigate('/training')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    訓練トップへ戻る
                </button>
                <h2 className="actor-title" style={{ margin: 0, paddingLeft: '1rem' }}>担当患者を選択</h2>
            </header>

            {/* 使い方の案内 */}
            <div style={{
                margin: '0 1rem 1rem',
                padding: '0.8rem 1rem',
                backgroundColor: '#eff6ff',
                borderRadius: '10px',
                border: '1px solid #93c5fd',
                fontSize: '0.85rem',
                color: '#1d4ed8',
                lineHeight: '1.6',
            }}>
                📋 スタッフから指示された<strong>患者名（または番号）</strong>と照合して、あなたの担当患者をタップしてください
            </div>

            <div className="page__content" style={{ padding: '0 1rem' }}>
                {!activeSessionId ? (
                    <div className="error-message" style={{ textAlign: 'center', marginTop: '2rem' }}>
                        アクティブな訓練セッションがありません。<br/>
                        管理画面からセッションを開始してください。
                    </div>
                ) : loading ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>読み込み中...</div>
                ) : patients.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>患者が見つかりません。</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                        {patients.map((patient, index) => {
                            const tc = triageColors[patient.triage_color] || triageColors['緑']
                            return (
                                <button
                                    key={patient.id}
                                    onClick={() => navigate(`/training/actor/${patient.id}`)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem',
                                        backgroundColor: tc.bg,
                                        border: `2px solid ${tc.border}`,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        width: '100%',
                                    }}
                                >
                                    {/* 番号バッジ */}
                                    <div style={{
                                        minWidth: '48px', height: '48px',
                                        borderRadius: '50%',
                                        backgroundColor: tc.border,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: tc.text }}>
                                            {index + 1}
                                        </span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: tc.text }}>
                                            {patient.name} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>様役</span>
                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', backgroundColor: tc.border, padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#000' }}>
                                                {tc.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.2rem' }}>
                                            番号: {index + 1}番 | {patient.age}歳 {patient.gender === 'M' ? '男性' : '女性'}
                                        </div>
                                        {patient.findings?.background && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                                                {patient.findings.background.slice(0, 50)}...
                                            </div>
                                        )}
                                    </div>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 18L15 12L9 6" stroke={tc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PatientActorListPage

