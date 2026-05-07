import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatient } from '../hooks/usePatient'
import { useDeterioration } from '../hooks/useDeterioration'
import PulseAnimation from '../components/actor/PulseAnimation'
import BreathingAnimation from '../components/actor/BreathingAnimation'

const PatientActorPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const patientId = parseInt(id || '0', 10)
    const { patient } = usePatient(patientId)
    const { currentVitalsText } = useDeterioration(patient)
    const [activeAnimation, setActiveAnimation] = useState<'pulse' | 'breathing' | null>(null)

    if (!patient) {
        return (
            <div className="actor-page-error">
                <h2>患者が見つかりません</h2>
                <button onClick={() => navigate('/actor')}>一覧へ戻る</button>
            </div>
        )
    }

    // バイタルテキストからHR(心拍数)とRR(呼吸数)を抽出するヘルパー関数
    const parseVitals = (text: string) => {
        let hr = 80 // デフォルト値
        let rr = 15 // デフォルト値
        
        if (!text) return { hr, rr }

        // HRの抽出 (例: "HR:120", "HR：120", "HR 120" などに対応)
        const hrMatch = text.match(/HR[\s:：]*(\d+)/i)
        if (hrMatch && hrMatch[1]) {
            hr = parseInt(hrMatch[1], 10)
        }

        // R/RRの抽出 (例: "R:30", "RR：30" などに対応、HRの'R'を拾わないよう否定戻り読みを使用)
        const rMatch = text.match(/(?<![A-Z])(?:R|RR)[\s:：]*(\d+)/i) || 
                       text.match(/(?:^|\n|・| )(?:R|RR)[\s:：]*(\d+)/i)

        if (rMatch && (rMatch[1] || rMatch[2])) {
            rr = parseInt(rMatch[1] || rMatch[2], 10)
        }

        return { hr, rr }
    }

    const { hr, rr } = parseVitals(currentVitalsText || patient.vitals_initial || patient.vitals_triage || '')

    return (
        <div className="actor-page">
            <header className="actor-page__header">
                <button className="actor-page__back" onClick={() => navigate('/training/actor')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    患者一覧へ戻る
                </button>
                <h2>模擬患者モード</h2>
            </header>

            <div className="actor-page__content">
                <div className="actor-patient-info">

                    <div className="actor-patient-info__demo">
                        {patient.age}歳 {patient.gender === 'M' ? '男性' : '女性'}
                    </div>
                </div>

                <div className="card card--elevated" style={{ textAlign: 'center', margin: '1rem 0' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--gray-700)' }}>あなたの患者QRコード</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>診察役がスキャンするときはこの画面を見せてください</p>
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`patient:${patient.id}`)}`} 
                        alt="患者QR" 
                        style={{ width: '160px', height: '160px', margin: '0 auto', display: 'block' }} 
                    />
                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '0.05em' }}>
                        ID: {patient.base_patient_id || patient.id}
                    </div>
                </div>

                <div className="actor-instruction">
                    <h3 className="section-title">演技指導</h3>
                    <div className="instruction-card">
                        <h4>状況・受傷機転</h4>
                        <p>{patient.findings.background || '特記事項なし'}</p>
                        
                        <h4>バイタルサイン・全身所見</h4>
                        <p className="instruction-vitals" style={{ whiteSpace: 'pre-line' }}>{currentVitalsText || patient.vitals_initial}</p>
                        
                        <div style={{ padding: '0.8rem', backgroundColor: 'var(--gray-50)', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid var(--gray-200)' }}>
                            <p><strong>頭頚部:</strong> {patient.findings.head_and_neck || '特記事項なし'}</p>
                            <p><strong>胸部:</strong> {patient.findings.chest || '特記事項なし'}</p>
                            <p><strong>腹部・骨盤:</strong> {patient.findings.abdomen_and_pelvis || '特記事項なし'}</p>
                            <p><strong>四肢:</strong> {patient.findings.limbs || '特記事項なし'}</p>
                            <p><strong>FAST:</strong> {patient.findings.fast || '特記事項なし'}</p>
                        </div>

                        <h4>既往歴 (AMPLE)</h4>
                        <p style={{ whiteSpace: 'pre-wrap', backgroundColor: 'var(--gray-50)', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--gray-200)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            {patient.findings.ample || '特記事項なし'}
                        </p>

                        
                        <h4>演技のポイント</h4>
                        <p className="instruction-highlight">
                            {patient.acting_instructions || '特になし'}
                            <br/><br/>
                            診察役が「脈をみます」「呼吸をみます」と言ったら、下のボタンをタップして端末を診察役に見せ（聞かせ）てください。
                        </p>
                    </div>
                </div>

                <div className="actor-actions">
                    <button 
                        className="actor-button actor-button--pulse"
                        onClick={() => setActiveAnimation('pulse')}
                    >
                        <div className="button-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <span>心拍を提示する</span>
                    </button>
                    <button 
                        className="actor-button actor-button--breathing"
                        onClick={() => setActiveAnimation('breathing')}
                    >
                        <div className="button-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
                        </div>
                        <span>呼吸を提示する</span>
                    </button>
                </div>
            </div>

            {/* アニメーション用オーバーレイ */}
            {activeAnimation === 'pulse' && (
                <PulseAnimation 
                    bpm={hr}
                    onClose={() => setActiveAnimation(null)} 
                />
            )}
            
            {activeAnimation === 'breathing' && (
                <BreathingAnimation 
                    cpm={rr}
                    onClose={() => setActiveAnimation(null)} 
                />
            )}
        </div>
    )
}

export default PatientActorPage
