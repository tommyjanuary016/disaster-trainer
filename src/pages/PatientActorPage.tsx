import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatient } from '../hooks/usePatient'
import { useDeterioration } from '../hooks/useDeterioration'
import { resolveActorGuidance } from '../lib/actorGuidance'
import PulseAnimation from '../components/actor/PulseAnimation'
import BreathingAnimation from '../components/actor/BreathingAnimation'
import { ActorQRModal } from '../components/actor/ActorQRModal'
import { DispositionModal } from '../components/DispositionModal'
import { useWakeLock } from '../hooks/useWakeLock'
import { soundEngine } from '../lib/soundEngine'
import { generateInlineQrSvg } from '../lib/inlineQr'

const getAgeGroup = (age: number) => {
    if (age < 6) return '乳幼児'
    if (age < 15) return '小児'
    return `${Math.floor(age / 10) * 10}代`
}

const PatientActorPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const patientId = parseInt(id || '0', 10)
    const { patient } = usePatient(patientId)
    const { currentVitalsText, currentVitalsStruct } = useDeterioration(patient)

    // 2階層管理: 'public' = スタッフ提示・QR画面（デフォルト） / 'private' = 模擬患者専用の演技＆状態確認画面
    const [viewLayer, setViewLayer] = useState<'public' | 'private'>('public')
    const [activeAnimation, setActiveAnimation] = useState<'pulse' | 'breathing' | null>(null)
    const [showActorQRModal, setShowActorQRModal] = useState<boolean>(() => {
        const params = new URLSearchParams(window.location.search)
        return params.get('modal') === '1'
    })
    const [showDispositionModal, setShowDispositionModal] = useState(false)

    // 模擬患者としてQRコードを提示して待機中、画面がスリープしないよう自動維持
    useWakeLock(true)

    // リアルタイムアクションログ（演技者向け・第2階層に表示）
    const [actionLog, setActionLog] = useState<{ time: string; message: string; icon: string }[]>([])
    const [flashNotice, setFlashNotice] = useState<string | null>(null)
    const prevStatus = useRef<string | null>(null)
    const prevTests = useRef<boolean | undefined>(undefined)
    const prevTreatments = useRef<string[]>([])

    useEffect(() => {
        if (!patient) return

        const now = () => {
            const d = new Date()
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
        }
        const addLog = (message: string, icon: string, isCritical: boolean = false) => {
            setActionLog(prev => [{ time: now(), message, icon }, ...prev].slice(0, 15))
            setFlashNotice(message)
            if (isCritical) {
                soundEngine.playCriticalAlert()
            } else {
                soundEngine.playVitalMonitorBeep()
            }
            setTimeout(() => setFlashNotice(null), 4000)
        }

        // ステータス変化の検知
        if (prevStatus.current !== null && prevStatus.current !== patient.status) {
            const messages: Record<string, { msg: string; icon: string; critical?: boolean }> = {
                '処置中': { msg: '処置が開始されました。演技を続けてください。', icon: '💉' },
                '悪化': { msg: '容体が変化しました！下の状態と演技指示を確認してください。', icon: '🚨', critical: true },
                '急変': { msg: '急変しました！動かず目を閉じてください。', icon: '🚨', critical: true },
            }
            const m = messages[patient.status]
            if (m) addLog(m.msg, m.icon, !!m.critical)
        }
        prevStatus.current = patient.status

        // 検査完了変化
        if (prevTests.current === false && patient.tests_completed === true) {
            addLog('検査（画像・採血）が完了しました。', '🧪')
        }
        prevTests.current = patient.tests_completed

        // 処置追加検知
        const currentTreatments = patient.completed_treatments || []
        const prev = prevTreatments.current
        const newOnes = currentTreatments.filter(t => !prev.includes(t))
        if (newOnes.length > 0) {
            newOnes.forEach(t => addLog(`処置（${t}）が完了しました。`, '🎡'))
        }
        prevTreatments.current = currentTreatments
    }, [patient?.status, patient?.tests_completed, patient?.completed_treatments])

    if (!patient) {
        return (
            <div className="actor-page-error">
                <h2>患者が見つかりません</h2>
                <button onClick={() => navigate('/training/actor')}>一覧へ戻る</button>
            </div>
        )
    }

    const guidance = resolveActorGuidance(patient, currentVitalsStruct, currentVitalsText)

    const parseHrRr = (text: string) => {
        let hr = 80
        let rr = 15
        if (!text) return { hr, rr }
        const hrMatch = text.match(/HR[\s:：]*(\d+)/i)
        if (hrMatch && hrMatch[1]) hr = parseInt(hrMatch[1], 10)
        const rMatch = text.match(/(?:^|\n|・| )(?:R|RR)[\s:：]*(\d+)/i)
        if (rMatch && rMatch[1]) rr = parseInt(rMatch[1], 10)
        return { hr, rr }
    }

    const parsedFallback = parseHrRr(currentVitalsText || patient.vitals_initial || patient.vitals_triage || '')
    const hr = currentVitalsStruct?.hr ?? parsedFallback.hr
    const rr = currentVitalsStruct?.rr ?? parsedFallback.rr

    /** 脈・呼吸・処置QRボタン群（第1階層・第2階層どちらからでも同じように飛べる共通パーツ） */
    const renderStaffActionButtons = (compact: boolean = false) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="actor-actions" style={{ marginTop: 0 }}>
                <button
                    type="button"
                    className="actor-button actor-button--pulse"
                    onClick={() => setActiveAnimation('pulse')}
                    style={compact ? { padding: '0.7rem 0.5rem' } : undefined}
                >
                    <div className="button-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <span>💓 脈（心拍）を見せる</span>
                </button>
                <button
                    type="button"
                    className="actor-button actor-button--breathing"
                    onClick={() => setActiveAnimation('breathing')}
                    style={compact ? { padding: '0.7rem 0.5rem' } : undefined}
                >
                    <div className="button-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>
                    </div>
                    <span>🌬️ 呼吸を見せる</span>
                </button>
            </div>

            <button
                type="button"
                onClick={() => setShowActorQRModal(true)}
                style={{
                    width: '100%',
                    padding: compact ? '0.75rem' : '0.9rem',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: compact ? '0.92rem' : '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    cursor: 'pointer',
                }}
            >
                <span style={{ fontSize: '1.15rem' }}>📱</span>
                <span>処置・手技・物品のQRを提示する</span>
            </button>
        </div>
    )

    return (
        <div className="actor-page">
            <header className="actor-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {viewLayer === 'private' ? (
                    <button className="actor-page__back" onClick={() => setViewLayer('public')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        患者QR画面に戻る
                    </button>
                ) : (
                    <button className="actor-page__back" onClick={() => navigate('/training/actor')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        模擬患者選択
                    </button>
                )}
                <h2 style={{ fontSize: '1rem', margin: 0 }}>
                    {viewLayer === 'public' ? '模擬患者モード（提示用）' : '模擬患者専用（演技＆状態）'}
                </h2>
                <div style={{ width: '60px' }} />
            </header>

            {/* フラッシュ通知バナー（第2階層にいるときのみ詳細文言、第1階層ではネタバレ防止で簡易通知） */}
            {flashNotice && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    backgroundColor: '#1d4ed8', color: 'white',
                    padding: '0.9rem 1.25rem', fontSize: '0.95rem', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                    <span style={{ fontSize: '1.3rem' }}>🔔</span>
                    <span>
                        {viewLayer === 'private'
                            ? flashNotice
                            : '状態・処置に変化がありました（演技確認画面を開いて確認してください）'}
                    </span>
                </div>
            )}

            <div className="actor-page__content">
                {/* 患者基本識別表示（ネタバレなし） */}
                <div className="actor-patient-info">
                    <div className="actor-patient-info__demo" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                        推定 {getAgeGroup(patient.age)} {patient.gender === 'M' ? '男性' : '女性'}{' '}
                        <span style={{ fontSize: '0.9rem', color: 'var(--gray-500)', fontWeight: 'normal' }}>
                            (患者ID: {patient.base_patient_id || patient.id})
                        </span>
                    </div>
                </div>

                {/* =========================================================
                    第1階層：医療スタッフに提示する画面（QRコード・外見・脈・呼吸）
                    ※演技指示や背景、バイタル詳細などネタバレ情報はここに出さない
                   ========================================================= */}
                {viewLayer === 'public' ? (
                    <>
                        {/* QRコードカード */}
                        <div className="card card--elevated" style={{ textAlign: 'center', margin: '0.75rem 0 1rem' }}>
                            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.35rem', color: 'var(--gray-700)' }}>
                                患者QRコード（医療スタッフ提示用）
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: '0.85rem' }}>
                                👩‍⚕️ 医療スタッフが「スキャンします」と言ったらこの画面を見せてください
                            </p>
                            <img
                                src={generateInlineQrSvg(`patient:${patient.id}`, 170)}
                                alt="患者QR"
                                style={{ width: '170px', height: '170px', margin: '0 auto', display: 'block' }}
                            />
                            <div style={{ marginTop: '0.5rem', fontWeight: 'bold', fontSize: '1.15rem', letterSpacing: '0.05em' }}>
                                ID: {patient.base_patient_id || patient.id}
                            </div>

                            {/* 外見上の明らかな異常所見（視診所見のみ） */}
                            {guidance.visibleFindings.length > 0 && (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem 1rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    textAlign: 'left',
                                }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.35rem' }}>
                                        外見上の明らかな異常所見
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.6' }}>
                                        {guidance.visibleFindings.map((f, i) => (
                                            <li key={i}>{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* 第2階層（模擬患者専用・演技＆状態確認）へ入るボタン */}
                        <button
                            type="button"
                            onClick={() => setViewLayer('private')}
                            style={{
                                width: '100%',
                                padding: '1rem 1.1rem',
                                marginBottom: '1rem',
                                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '14px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                boxShadow: '0 6px 16px rgba(234, 88, 12, 0.28)',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>🎭</span>
                                    <span>演技のしかた・今の自分の状態を見る</span>
                                </div>
                                <div style={{ fontSize: '0.76rem', opacity: 0.92, marginTop: '0.2rem' }}>
                                    ※模擬患者さん専用画面（目・声・動きの指示や今の血圧・脈拍が見られます）
                                </div>
                            </div>
                            <span style={{ fontSize: '1.3rem', fontWeight: 'bold', flexShrink: 0 }}>→</span>
                        </button>

                        {/* スタッフ提示ボタン（脈・呼吸・処置QR） */}
                        {!patient.disposition && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--gray-500)', margin: '0 0 0.5rem' }}>
                                    「脈をみます」「呼吸をみます」「処置QRを見せて」と言われたらタップ
                                </p>
                                {renderStaffActionButtons(false)}
                            </div>
                        )}
                    </>
                ) : (
                    /* =========================================================
                        第2階層：模擬患者専用画面（演技指示・今の状態確認）
                        ※ここから直接「脈」「呼吸」「処置QR」「患者QRへ戻る」へ飛べる
                       ========================================================= */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        {/* 上部ナビ＆クイックアクションバー */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            border: '2px solid #cbd5e1',
                            borderRadius: '14px',
                            padding: '0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>
                                    🔒 模擬患者専用画面（スタッフには見せない）
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewLayer('public')}
                                    style={{
                                        padding: '0.45rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1px solid #94a3b8',
                                        backgroundColor: '#ffffff',
                                        color: '#1e293b',
                                        fontWeight: 'bold',
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                    }}
                                >
                                    ← 患者QR画面に戻る
                                </button>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                スタッフに頼まれたらここからそのまま脈・呼吸・処置QR画面へ飛べます：
                            </div>
                            {renderStaffActionButtons(true)}
                        </div>

                        {/* 無言・完全無反応の強調バナー（必要なときのみ自動表示） */}
                        {guidance.isSpeechBlocked && (
                            <div style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                padding: '0.9rem 1rem',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>🤫</span>
                                <div>
                                    <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>【最重要ルール】</div>
                                    <div>{guidance.verbal.headline} — {guidance.verbal.detail}</div>
                                </div>
                            </div>
                        )}

                        {/* 🎯 あなたが今やる演技（目・声・動きの具体的ルール） */}
                        <div style={{
                            backgroundColor: '#fff7ed',
                            border: '2px solid #fb923c',
                            borderRadius: '14px',
                            padding: '1rem',
                        }}>
                            <h3 style={{ margin: '0 0 0.75rem', color: '#9a3412', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span>🎭</span>
                                <span>あなたの今の演技ルール（そのままやってください）</span>
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {/* 👁️ 目 */}
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderLeft: '5px solid #2563eb',
                                    borderRadius: '10px',
                                    padding: '0.75rem 0.9rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.2rem' }}>
                                        👁️ 目の開け方
                                    </div>
                                    <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.25rem' }}>
                                        {guidance.eye.headline}
                                    </div>
                                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.55' }}>
                                        {guidance.eye.detail}
                                    </div>
                                </div>

                                {/* 🗣️ 声・話し方 */}
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderLeft: '5px solid #dc2626',
                                    borderRadius: '10px',
                                    padding: '0.75rem 0.9rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#b91c1c', marginBottom: '0.2rem' }}>
                                        🗣️ 声・話し方
                                    </div>
                                    <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.25rem' }}>
                                        {guidance.verbal.headline}
                                    </div>
                                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.55' }}>
                                        {guidance.verbal.detail}
                                    </div>
                                </div>

                                {/* 💪 体の動き */}
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    borderLeft: '5px solid #059669',
                                    borderRadius: '10px',
                                    padding: '0.75rem 0.9rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#047857', marginBottom: '0.2rem' }}>
                                        💪 体の動かし方・触られたときの反応
                                    </div>
                                    <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.25rem' }}>
                                        {guidance.motor.headline}
                                    </div>
                                    <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.55' }}>
                                        {guidance.motor.detail}
                                    </div>
                                </div>

                                {/* 特別演技指示 */}
                                {guidance.specialInstruction && (
                                    <div style={{
                                        backgroundColor: '#fef3c7',
                                        border: '1px solid #f59e0b',
                                        borderRadius: '10px',
                                        padding: '0.75rem 0.9rem',
                                        fontSize: '0.9rem',
                                        color: '#78350f',
                                        lineHeight: '1.55',
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>⭐ 特別な演技ポイント</div>
                                        <div>{guidance.specialInstruction}</div>
                                    </div>
                                )}

                                {/* 部位別の痛み反応・呼吸の様子 */}
                                {guidance.painGuides.length > 0 && (
                                    <div style={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: '10px',
                                        padding: '0.75rem 0.9rem',
                                        border: '1px solid #fed7aa',
                                    }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#c2410c', marginBottom: '0.35rem' }}>
                                            🩺 触られたとき・息づかいの演技
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem', color: '#1c1917', lineHeight: '1.55' }}>
                                            {guidance.painGuides.map((g, i) => (
                                                <div key={i}>{g}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 💬 質問されたときの答え方（V5のときのみ患者背景等を提示、V4は曖昧回答のみ、V1〜3は非表示） */}
                        {guidance.canAnswerQuestions && guidance.qaItems.length > 0 && (
                            <div style={{
                                backgroundColor: '#f0fdf4',
                                border: '2px solid #86efac',
                                borderRadius: '14px',
                                padding: '1rem',
                            }}>
                                <h3 style={{ margin: '0 0 0.75rem', color: '#166534', fontSize: '1rem' }}>
                                    💬 医療スタッフに質問されたときの答え方
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
                                    {guidance.qaItems.map((qa, i) => (
                                        <div key={i} style={{ backgroundColor: '#ffffff', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                            <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '0.15rem' }}>{qa.question}</div>
                                            <div style={{ color: '#15803d', fontWeight: '600' }}>→ {qa.answer}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!guidance.canAnswerQuestions && guidance.v4FallbackReply && (
                            <div style={{
                                backgroundColor: '#fffbeb',
                                border: '2px solid #fcd34d',
                                borderRadius: '14px',
                                padding: '0.9rem 1rem',
                                fontSize: '0.92rem',
                                color: '#92400e',
                                fontWeight: 'bold',
                                lineHeight: '1.55',
                            }}>
                                💬 何か質問されたら：<br />
                                {guidance.v4FallbackReply}
                            </div>
                        )}

                        {/* 📊 あなたの今の状態（リアルタイムバイタルサイン） */}
                        <div style={{
                            backgroundColor: '#eff6ff',
                            border: '2px solid #93c5fd',
                            borderRadius: '14px',
                            padding: '1rem',
                        }}>
                            <h3 style={{ margin: '0 0 0.35rem', color: '#1e40af', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span>📊</span>
                                <span>あなたの今の体の状態（現在の数値）</span>
                            </h3>
                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#3b82f6' }}>
                                ※時間経過や処置によって変化した最新のあなたの状態です（スタッフには見せないでください）
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.55rem' }}>
                                {guidance.vitalsCards.map((vc) => (
                                    <div key={vc.label} style={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: '10px',
                                        padding: '0.65rem 0.75rem',
                                        border: vc.isAbnormal ? '1.5px solid #fca5a5' : '1px solid #bfdbfe',
                                    }}>
                                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 'bold' }}>{vc.label}</div>
                                        <div style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '800',
                                            color: vc.isAbnormal ? '#dc2626' : '#0f172a',
                                            margin: '0.15rem 0',
                                        }}>
                                            {vc.value} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>{vc.unit}</span>
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: vc.isAbnormal ? '#b91c1c' : '#334155', lineHeight: '1.35' }}>
                                            {vc.statusText}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* アクションログ（リアルタイム通知履歴） */}
                        {actionLog.length > 0 && (
                            <div style={{ padding: '0.75rem', background: '#f1f5f9', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                                <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem', color: '#334155' }}>📳 あなたへの処置・通知履歴</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '130px', overflowY: 'auto' }}>
                                    {actionLog.map((log, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: i === 0 ? '#0f172a' : 'var(--gray-600)', fontWeight: i === 0 ? 'bold' : 'normal' }}>
                                            <span style={{ opacity: 0.6, flexShrink: 0 }}>{log.time}</span>
                                            <span>{log.icon} {log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 指導スタッフ・医療者向け参考情報（通常は折りたたみ） */}
                        <details style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            color: '#475569',
                        }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>
                                🩺 指導スタッフ用：医療設定データを開く（模擬患者役は普段見なくてOK）
                            </summary>
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div><strong>患者氏名・実年齢:</strong> {patient.name} 様（{patient.age}歳 {patient.gender === 'M' ? '男性' : '女性'}）</div>
                                <div><strong>診断名:</strong> {patient.diagnosis}</div>
                                <div><strong>計算GCS:</strong> E{guidance.gcs.e} V{guidance.gcs.v} M{guidance.gcs.m}</div>
                                <div><strong>頭頸部:</strong> {patient.findings.head_and_neck || '特記事項なし'}</div>
                                <div><strong>胸部:</strong> {patient.findings.chest || '特記事項なし'}</div>
                                <div><strong>腹部・骨盤:</strong> {patient.findings.abdomen_and_pelvis || '特記事項なし'}</div>
                                <div><strong>四肢:</strong> {patient.findings.limbs || '特記事項なし'}</div>
                                <div><strong>FAST:</strong> {patient.findings.fast || '特記事項なし'}</div>
                                <div><strong>AMPLE:</strong> {patient.findings.ample || '特記事項なし'}</div>
                                <div><strong>背景:</strong> {patient.findings.background || '特記事項なし'}</div>
                            </div>
                        </details>
                    </div>
                )}

                {/* 搬出・目的地到着済みバナー or 到着報告ボタン */}
                {patient.disposition ? (
                    <div
                        style={{
                            marginTop: '1.25rem',
                            padding: '1.25rem',
                            backgroundColor: '#ecfdf5',
                            border: '2px solid #10b981',
                            borderRadius: '16px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                        }}
                    >
                        <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>🎉</div>
                        <h3 style={{ margin: '0 0 0.4rem', color: '#065f46', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            訓練終了（目的地到着完了）
                        </h3>
                        <p style={{ margin: '0 0 0.8rem', color: '#047857', fontSize: '0.9rem' }}>
                            行き先: <strong>{patient.disposition.destination_label}</strong> に到着が記録されました。
                        </p>
                        <div
                            style={{
                                display: 'inline-block',
                                padding: '0.4rem 0.8rem',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #a7f3d0',
                                fontSize: '0.8rem',
                                color: '#065f46',
                            }}
                        >
                            到着時刻: {new Date(patient.disposition.completed_at_ms).toLocaleTimeString()}
                            {patient.disposition.is_cpa_at_disposition && (
                                <span style={{ color: '#dc2626', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                                    (※到着時CPA判定)
                                </span>
                            )}
                        </div>
                        <p style={{ margin: '0.8rem 0 0', fontSize: '0.8rem', color: '#059669' }}>
                            指示に従って待機または退場口へ移動してください。お疲れ様でした！
                        </p>
                    </div>
                ) : (
                    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--gray-300)' }}>
                        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--gray-500)', margin: '0 0 0.5rem' }}>
                            ※案内された病棟・手術室・退場口等に到着したら以下をタップ
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowDispositionModal(true)}
                            style={{
                                width: '100%',
                                padding: '0.85rem',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                                cursor: 'pointer',
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>🏁</span>
                            <span>目的地（病棟・手術室・退場口等）に到着した</span>
                        </button>
                    </div>
                )}
            </div>

            {/* 目的地到着・転帰確定モーダル */}
            {showDispositionModal && (
                <DispositionModal
                    patient={patient}
                    mode="actor"
                    onClose={() => setShowDispositionModal(false)}
                />
            )}

            {/* 処置・物品QR個別提示モーダル */}
            {showActorQRModal && (
                <ActorQRModal
                    onClose={() => setShowActorQRModal(false)}
                    patientName={patient.name}
                />
            )}

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
