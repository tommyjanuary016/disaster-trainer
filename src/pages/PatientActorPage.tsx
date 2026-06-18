import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatient } from '../hooks/usePatient'
import { useDeterioration } from '../hooks/useDeterioration'
import PulseAnimation from '../components/actor/PulseAnimation'
import BreathingAnimation from '../components/actor/BreathingAnimation'

// 痛みの強度に応じた素人向け説明を生成する
const generateLaymanGuide = (patient: any): string[] => {
    const guides: string[] = []
    const findings = patient?.findings

    // acting_instructionsがあれば最優先で追加
    if (patient?.acting_instructions) {
        guides.push(`⭐ 【演技の特別指示】${patient.acting_instructions}`)
    }
    
    // 受傷機転から状況説明
    if (findings?.background) {
        guides.push(`🚌 【あなたの状況】${findings.background.slice(0, 80)}`)
    }

    // 頭部所見 → 素人向け
    if (findings?.head_and_neck && !findings.head_and_neck.includes('明らかな外傷性変化なし')) {
        guides.push('🤕 頭や顔が強く打たれています。顔をしかめて痛そうにしてください。頭や顔を触られたら「痛い！」と反応してください。')
    }

    // 胸部所見
    if (findings?.chest && !findings.chest.includes('明らかな外傷性変化なし')) {
        guides.push('😮‍💨 胸が痛くて息がしにくい状態です。呼吸のたびに顔をゆがめ、浅くゆっくり息をしてください。胸を触られたら「痛い！」と言ってください。')
    }

    // 腹部・骨盤所見
    if (findings?.abdomen_and_pelvis && !findings.abdomen_and_pelvis.includes('明らかな外傷性変化なし')) {
        guides.push('😣 お腹や腰の周りが痛い状態です。お腹を押されたら「痛い！」「そこが一番痛い！」と言ってください。できるだけ動きたくない様子を演じてください。')
    }

    // 四肢所見
    if (findings?.limbs && !findings.limbs.includes('明らかな外傷性変化なし')) {
        guides.push('🦵 足（または手）が強く打たれています。その足（手）をできるだけ動かさないようにし、触られたら「痛い！」と言ってください。')
    }

    if (guides.length === 0) {
        guides.push('痛みは少なく、比較的落ち着いた様子で座っていてください。質問には普通に答えてください。')
    }

    return guides
}

const PatientActorPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const patientId = parseInt(id || '0', 10)
    const { patient } = usePatient(patientId)
    const { currentVitalsText, currentVitalsStruct } = useDeterioration(patient)
    const [activeAnimation, setActiveAnimation] = useState<'pulse' | 'breathing' | null>(null)
    const [activeTab, setActiveTab] = useState<'easy' | 'detail'>('easy')

    // リアルタイムアクションログ（演技者向け）
    const [actionLog, setActionLog] = useState<{ time: string; message: string; icon: string }[]>([])
    const [flashNotice, setFlashNotice] = useState<string | null>(null)
    const prevStatus = useRef<string | null>(null)
    const prevTests = useRef<boolean | undefined>(undefined)
    const prevStabilization = useRef<boolean | undefined>(undefined)
    const prevTreatments = useRef<string[]>([])

    useEffect(() => {
        if (!patient) return

        const now = () => {
            const d = new Date()
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
        }
        const addLog = (message: string, icon: string) => {
            setActionLog(prev => [{ time: now(), message, icon }, ...prev].slice(0, 15))
            setFlashNotice(message)
            setTimeout(() => setFlashNotice(null), 4000)
        }

        // ステータス変化の検知
        if (prevStatus.current !== null && prevStatus.current !== patient.status) {
            const messages: Record<string, { msg: string; icon: string }> = {
                '処置中': { msg: '処置が開始されました。秘計を仿び続けてください。', icon: '💉' },
                'アセスメント完了': { msg: '初期評価が完了しました。', icon: '✅' },
                '処置完了': { msg: '必要な処置が全て完了しました。', icon: '🏆' },
                '悪化': { msg: '悪化しています！バイタルが変化しています。', icon: '🚨' },
                '急変': { msg: '急変です！不動の演技をしてください。', icon: '🚨' },
            }
            const m = messages[patient.status]
            if (m) addLog(m.msg, m.icon)
        }
        prevStatus.current = patient.status

        // 検査完了変化
        if (prevTests.current === false && patient.tests_completed === true) {
            addLog('検査（画像・採血）が完了しました。', '🧪')
        }
        prevTests.current = patient.tests_completed

        // 安定化処置完了
        if (prevStabilization.current === false && patient.stabilization_completed === true) {
            addLog('安定化処置が完了しました。', '💊')
        }
        prevStabilization.current = patient.stabilization_completed

        // 処置追加検知
        const currentTreatments = patient.completed_treatments || []
        const prev = prevTreatments.current
        const newOnes = currentTreatments.filter(t => !prev.includes(t))
        if (newOnes.length > 0) {
            newOnes.forEach(t => addLog(`処置「${t}」が完了しました。`, '🎡'))
        }
        prevTreatments.current = currentTreatments

    }, [patient?.status, patient?.tests_completed, patient?.stabilization_completed, patient?.completed_treatments])

    if (!patient) {
        return (
            <div className="actor-page-error">
                <h2>患者が見つかりません</h2>
                <button onClick={() => navigate('/training/actor')}>一覧へ戻る</button>
            </div>
        )
    }

    const parseVitals = (text: string) => {
        let hr = 80
        let rr = 15
        if (!text) return { hr, rr }
        const hrMatch = text.match(/HR[\s:：]*(\d+)/i)
        if (hrMatch && hrMatch[1]) hr = parseInt(hrMatch[1], 10)
        const rMatch = text.match(/(?<![A-Z])(?:R|RR)[\s:：]*(\d+)/i) ||
                       text.match(/(?:^|\n|・| )(?:R|RR)[\s:：]*(\d+)/i)
        if (rMatch && (rMatch[1] || rMatch[2])) rr = parseInt(rMatch[1] || rMatch[2], 10)
        return { hr, rr }
    }

    let hr = currentVitalsStruct?.hr ?? 80
    let rr = currentVitalsStruct?.rr ?? 15
    if (!currentVitalsStruct) {
        const parsed = parseVitals(currentVitalsText || patient.vitals_initial || patient.vitals_triage || '')
        hr = parsed.hr
        rr = parsed.rr
    }

    const laymanGuides = generateLaymanGuide(patient)

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

            {/* フラッシュ通知バナー */}
            {flashNotice && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    backgroundColor: '#1d4ed8', color: 'white',
                    padding: '1rem 1.5rem', fontSize: '1rem', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'slideDown 0.3s ease',
                }}>
                    <span style={{ fontSize: '1.4rem' }}>🔔</span>
                    {flashNotice}
                </div>
            )}

            <div className="actor-page__content">
                <div className="actor-patient-info">
                    <div className="actor-patient-info__demo">
                        {patient.age}歳 {patient.gender === 'M' ? '男性' : '女性'}
                    </div>
                </div>

                {/* アクションログ（リアルタイム通知履歴） */}
                {actionLog.length > 0 && (
                    <div style={{ margin: '0.5rem 0 0.5rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                        <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem', color: '#1d4ed8' }}>📳 リアルタイム通知</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '130px', overflowY: 'auto' }}>
                            {actionLog.map((log, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: i === 0 ? '#1e3a8a' : 'var(--gray-600)', fontWeight: i === 0 ? 'bold' : 'normal' }}>
                                    <span style={{ opacity: 0.6, flexShrink: 0 }}>{log.time}</span>
                                    <span>{log.icon} {log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* QRコードカード */}
                <div className="card card--elevated" style={{ textAlign: 'center', margin: '1rem 0' }}>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--gray-700)' }}>あなたの患者QRコード</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
                        👩‍⚕️ 医療スタッフが「スキャンします」と言ったらこの画面を見せてください
                    </p>
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`patient:${patient.id}`)}`}
                        alt="患者QR"
                        style={{ width: '160px', height: '160px', margin: '0 auto', display: 'block' }}
                    />
                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '0.05em' }}>
                        ID: {patient.base_patient_id || patient.id}
                    </div>
                </div>

                {/* タブ切り替え */}
                <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0 0.5rem' }}>
                    <button
                        onClick={() => setActiveTab('easy')}
                        style={{
                            flex: 1, padding: '0.7rem',
                            borderRadius: '8px', border: '2px solid',
                            borderColor: activeTab === 'easy' ? '#f97316' : 'var(--gray-200)',
                            backgroundColor: activeTab === 'easy' ? '#fff7ed' : 'white',
                            color: activeTab === 'easy' ? '#ea580c' : 'var(--gray-600)',
                            fontWeight: activeTab === 'easy' ? 'bold' : 'normal',
                            cursor: 'pointer', fontSize: '0.9rem',
                        }}
                    >
                        📋 かんたんガイド
                    </button>
                    <button
                        onClick={() => setActiveTab('detail')}
                        style={{
                            flex: 1, padding: '0.7rem',
                            borderRadius: '8px', border: '2px solid',
                            borderColor: activeTab === 'detail' ? 'var(--primary)' : 'var(--gray-200)',
                            backgroundColor: activeTab === 'detail' ? '#eff6ff' : 'white',
                            color: activeTab === 'detail' ? 'var(--primary)' : 'var(--gray-600)',
                            fontWeight: activeTab === 'detail' ? 'bold' : 'normal',
                            cursor: 'pointer', fontSize: '0.9rem',
                        }}
                    >
                        🩺 詳細（医療者向け）
                    </button>
                </div>

                {/* かんたんガイドタブ */}
                {activeTab === 'easy' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {/* やること手順カード */}
                        <div style={{
                            backgroundColor: '#fff7ed',
                            border: '2px solid #fb923c',
                            borderRadius: '12px',
                            padding: '1rem',
                        }}>
                            <h3 style={{ margin: '0 0 0.8rem 0', color: '#c2410c', fontSize: '1rem' }}>
                                📌 やること（手順）
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {[
                                    { step: '1', text: '病着（ゼッケン）を着て、このアプリを開いた状態で待機してください' },
                                    { step: '2', text: '医療スタッフが近づいてきたら「どこが痛いですか？」などと聞かれます。あなたの役の状況に合わせて答えてください（下の「演技のポイント」を参考に）' },
                                    { step: '3', text: '「スキャンします」と言われたら、このQRコード画面をかざしてください' },
                                    { step: '4', text: '「脈をみます」「呼吸をみます」と言われたら下のボタンを押してスタッフに端末を見せてください' },
                                ].map(({ step, text }) => (
                                    <div key={step} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                                        <span style={{
                                            minWidth: '28px', height: '28px', borderRadius: '50%',
                                            backgroundColor: '#f97316', color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0,
                                        }}>{step}</span>
                                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#431407' }}>{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 演技のポイント */}
                        <div style={{
                            backgroundColor: '#fef9f0',
                            border: '1px solid #fde68a',
                            borderRadius: '12px',
                            padding: '1rem',
                        }}>
                            <h3 style={{ margin: '0 0 0.8rem 0', color: '#92400e', fontSize: '1rem' }}>
                                🎭 演技のポイント
                            </h3>
                            {laymanGuides.map((guide, i) => (
                                <div key={i} style={{
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    padding: '0.8rem',
                                    marginBottom: i < laymanGuides.length - 1 ? '0.5rem' : 0,
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6',
                                    color: '#1c1917',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                }}>
                                    {guide}
                                </div>
                            ))}
                        </div>

                        {/* 答え方のヒント */}
                        <div style={{
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '12px',
                            padding: '1rem',
                        }}>
                            <h3 style={{ margin: '0 0 0.8rem 0', color: '#166534', fontSize: '1rem' }}>
                                💬 よく聞かれる質問と答え方
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                                <div>
                                    <strong>「アレルギーはありますか？」</strong><br/>
                                    <span style={{ color: '#166534' }}>→ 「{patient.findings.ample?.match(/アレルギー[：:]\s*(.+)/)?.[1] || 'ありません'}」</span>
                                </div>
                                <div>
                                    <strong>「飲んでいるお薬はありますか？」</strong><br/>
                                    <span style={{ color: '#166534' }}>→ 「{patient.findings.ample?.match(/内服薬[：:]\s*(.+)/)?.[1] || 'ありません'}」</span>
                                </div>
                                <div>
                                    <strong>「いつ怪我をしましたか？」「何があったんですか？」</strong><br/>
                                    <span style={{ color: '#166534' }}>→ 「{patient.findings.background?.slice(0, 60) || '交通事故に遭いました'}」</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 詳細（医療者向け）タブ */}
                {activeTab === 'detail' && (
                    <div className="actor-instruction">
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
                )}

                {/* 脈・呼吸ボタン (常時表示) */}
                <div className="actor-actions" style={{ marginTop: '1.5rem' }}>
                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
                        「脈をみます」「呼吸をみます」と言われたらタップ
                    </p>
                    <button
                        className="actor-button actor-button--pulse"
                        onClick={() => setActiveAnimation('pulse')}
                    >
                        <div className="button-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <span>💓 脈（心拍）を見せる</span>
                    </button>
                    <button
                        className="actor-button actor-button--breathing"
                        onClick={() => setActiveAnimation('breathing')}
                    >
                        <div className="button-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
                        </div>
                        <span>🌬️ 呼吸を見せる</span>
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
