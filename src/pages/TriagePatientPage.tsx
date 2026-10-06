import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatient } from '../hooks/usePatient'
import { activeSessionId, fetchTrainingSession } from '../lib/firestore'
import LoadingScreen from '../components/LoadingScreen'
import PatientPictogram from '../components/PatientPictogram'
import VitalsCard from '../components/VitalsCard'

const STANDARD_TRIAGE_DURATION_SEC = 120 // 通常モード: 2分（120秒）
const TEST_TRIAGE_DURATION_SEC = 5       // 検証・テストモード: 5秒
const STORAGE_PREFIX = 'triage_timer_start_'

const TriagePatientPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const patientId = id ? parseInt(id) : null
    const { patient, loading, error } = usePatient(patientId)

    const [isTestMode, setIsTestMode] = useState(false)
    const durationSec = isTestMode ? TEST_TRIAGE_DURATION_SEC : STANDARD_TRIAGE_DURATION_SEC

    // セッションの検証モード（isTestMode）をチェック
    useEffect(() => {
        if (activeSessionId) {
            fetchTrainingSession(activeSessionId).then(session => {
                if (session?.isTestMode) {
                    setIsTestMode(true)
                }
            }).catch(e => console.error(e))
        }
    }, [activeSessionId])

    // タイマー管理
    const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
    const [secondsRemaining, setSecondsRemaining] = useState<number>(durationSec)
    const [isCompleted, setIsCompleted] = useState(false)

    // isTestMode が判明したときのタイマー初期値調整（未開始時）
    useEffect(() => {
        if (timerStartedAt === null) {
            setSecondsRemaining(durationSec)
        }
    }, [durationSec, timerStartedAt])

    // ローカルストレージからタイマー再開を試みる（リロード対策）
    useEffect(() => {
        if (!patientId) return
        const key = `${STORAGE_PREFIX}${patientId}`
        const savedStart = localStorage.getItem(key)
        if (savedStart) {
            const startMs = parseInt(savedStart, 10)
            const elapsed = Math.floor((Date.now() - startMs) / 1000)
            if (elapsed >= durationSec) {
                setTimerStartedAt(startMs)
                setSecondsRemaining(0)
                setIsCompleted(true)
            } else {
                setTimerStartedAt(startMs)
                setSecondsRemaining(durationSec - elapsed)
            }
        }
    }, [patientId, durationSec])

    // タイマーのカウントダウンループ
    useEffect(() => {
        if (!timerStartedAt || isCompleted) return

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000)
            const remaining = Math.max(0, durationSec - elapsed)
            setSecondsRemaining(remaining)

            if (remaining === 0) {
                setIsCompleted(true)
                clearInterval(interval)
            }
        }, 300)

        return () => clearInterval(interval)
    }, [timerStartedAt, isCompleted, durationSec])

    const handleStartTriage = () => {
        if (!patientId) return
        const now = Date.now()
        setTimerStartedAt(now)
        setSecondsRemaining(durationSec)
        setIsCompleted(false)
        localStorage.setItem(`${STORAGE_PREFIX}${patientId}`, String(now))
    }

    if (loading) return <LoadingScreen message="トリアージ患者データを取得中" subMessage="しばらくお待ちください..." />
    if (error || !patient) {
        return (
            <div className="page-error">
                <div className="page-error__icon">⚠</div>
                <p className="page-error__title">データ取得エラー</p>
                <p className="page-error__message">{error || '患者が見つかりません'}</p>
                <button className="button button--secondary" style={{ marginTop: '1.5rem', width: 'auto' }} onClick={() => navigate('/training')}>
                    患者一覧へ戻る
                </button>
            </div>
        )
    }

    // 進行度（0% 〜 100%）
    const elapsedSec = durationSec - secondsRemaining
    const progressPct = timerStartedAt ? Math.min(100, Math.max(0, Math.floor((elapsedSec / durationSec) * 100))) : 0

    // 段階的開示フラグ
    // フェーズ1 (開始直後 0%〜): 外見・大まかな印象・意識レベル
    // フェーズ2 (進行度 30%〜 または isCompleted): トリアージバイタル
    // フェーズ3 (進行度 10%〜100% で徐々にテキスト解禁): 全身観察所見（リアルタイム開示）
    const isPhase1Unlocked = timerStartedAt !== null
    const isPhase2Unlocked = progressPct >= 30 || isCompleted

    // ① 外見・大まかな印象・意識レベルの患者固有の動的生成
    const getGeneralAppearance = () => {
        const parts: string[] = []

        // 意識レベルの記載
        if (patient.consciousness_level) {
            parts.push(`【意識状態】${patient.consciousness_level}`)
        } else if (patient.vitals_triage_struct) {
            const vt = patient.vitals_triage_struct
            if (vt.gcs_e || vt.gcs_v || vt.gcs_m) {
                const gcsSum = (vt.gcs_e || 4) + (vt.gcs_v || 5) + (vt.gcs_m || 6)
                parts.push(`【意識状態】GCS ${gcsSum} (E${vt.gcs_e || 4}V${vt.gcs_v || 5}M${vt.gcs_m || 6})`)
            }
        }

        // 外見・体幹・呼吸様式や外出血・表情の第一印象
        const findings = patient.findings || ({} as any)
        const initialLook: string[] = []

        if (findings.head_and_neck && !findings.head_and_neck.includes('なし')) {
            initialLook.push(findings.head_and_neck.split(/[。\n]/)[0])
        }
        if (findings.limbs && !findings.limbs.includes('なし')) {
            initialLook.push(findings.limbs.split(/[。\n]/)[0])
        }
        if (findings.chest && !findings.chest.includes('なし')) {
            initialLook.push(findings.chest.split(/[。\n]/)[0])
        }

        if (initialLook.length > 0) {
            parts.push(`【外見・初見】${initialLook.slice(0, 2).join('、')}`)
        } else {
            parts.push('【外見・初見】目立った大量外出血なし、担架上で安静')
        }

        return parts.join('\n')
    }

    // ③ 全身観察所見のフルテキスト取得
    const getFullFindings = () => {
        const f = patient.findings || ({} as any)
        const parts: string[] = []
        if (f.head_and_neck) parts.push(`【頭頸部】${f.head_and_neck}`)
        if (f.chest) parts.push(`【胸部】${f.chest}`)
        if (f.abdomen_and_pelvis) parts.push(`【腹・骨盤】${f.abdomen_and_pelvis}`)
        if (f.limbs) parts.push(`【四肢】${f.limbs}`)
        return parts.length > 0 ? parts.join('\n') : '特記すべき外表外傷なし'
    }

    // 進行度（progressPct）に応じて徐々に文字・センテンスを判明させていく
    const getGradualRevealedFindings = () => {
        const fullText = getFullFindings()
        if (!fullText) return '特記すべき外表外傷なし'
        if (progressPct >= 95 || isCompleted) return fullText
        if (progressPct < 10) return '全身を観察・触診中...'

        const sentences = fullText.split(/(?<=[。\n])/).filter(Boolean)
        if (sentences.length > 1) {
            const countToKeep = Math.max(1, Math.floor((sentences.length * progressPct) / 100))
            return sentences.slice(0, countToKeep).join('')
        }

        const keepLen = Math.max(4, Math.floor((fullText.length * progressPct) / 100))
        return `${fullText.slice(0, keepLen)}...`
    }

    const formatTimer = (sec: number) => {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    return (
        <div className="page triage-patient-page" style={{ padding: '1rem', maxWidth: '720px', margin: '0 auto' }}>
            {/* 上部ナビゲーション */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button onClick={() => navigate('/training')} className="button button--secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                    患者スキャンに戻る
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isTestMode && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#fef08a', color: '#854d0e', border: '1px solid #eab308' }}>
                            ⚡ 検証モード (5秒)
                        </span>
                    )}
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '0.3rem 0.7rem', borderRadius: '999px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                        🚑 病院入口トリアージポスト
                    </span>
                </div>
            </div>

            {/* 患者基本情報カード */}
            <div className="card card--elevated" style={{ marginBottom: '1rem', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <PatientPictogram age={patient.age} gender={patient.gender} size={48} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 'bold' }}>TRIAGE TARGET</div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0.2rem 0', color: 'var(--gray-900)' }}>
                            {Math.floor(patient.age / 10) * 10}代 {patient.gender === 'M' ? '男性' : '女性'}
                        </h1>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                            ※ 診察エリアへの情報伝達は紙カルテ / トリアージタッグで行います
                        </div>
                    </div>
                </div>
            </div>

            {/* トリアージタイマー コントロール */}
            {!timerStartedAt ? (
                <div className="card card--elevated" style={{ textAlign: 'center', padding: '2rem 1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)', border: '2px solid #f87171' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱️</div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#991b1b', marginBottom: '0.5rem' }}>
                        トリアージ迅速評価 {isTestMode ? '（検証5秒）' : '（2分間）'}
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                        ボタンを押すとタイマーが開始し、<br />
                        全身の診察が進行するにつれて所見とバイタルが徐々に判明します。<br />
                        <strong>確認した所見を紙カルテに記入してください。</strong>
                    </p>
                    <button
                        onClick={handleStartTriage}
                        className="button button--primary"
                        style={{ width: '100%', maxWidth: '320px', padding: '0.9rem', fontSize: '1.05rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#dc2626' }}
                    >
                        🩺 トリアージ診察を開始する {isTestMode ? '(5秒)' : '(2分)'}
                    </button>
                </div>
            ) : (
                <div className="card card--elevated" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: isCompleted ? '#f0fdf4' : '#fafafa', border: `2px solid ${isCompleted ? '#22c55e' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isCompleted ? '#166534' : '#991b1b' }}>
                            {isCompleted ? '✅ トリアージ迅速評価 完了' : `⏳ 診察・観察中... (${progressPct}%)`}
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace', color: isCompleted ? '#166534' : '#dc2626' }}>
                            {formatTimer(secondsRemaining)}
                        </span>
                    </div>

                    {/* プログレスバー */}
                    <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{
                            width: `${progressPct}%`,
                            height: '100%',
                            background: isCompleted ? '#22c55e' : '#ef4444',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        <span>外見・意識 (即時)</span>
                        <span>バイタル判定</span>
                        <span>全身観察完了</span>
                    </div>
                </div>
            )}

            {/* 段階的開示セクション群 */}
            {timerStartedAt && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    {/* ステップ1: 外見・初期印象・意識 */}
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #3b82f6', opacity: isPhase1Unlocked ? 1 : 0.4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e40af' }}>
                                ① 外見・大まかな印象 / 意識状態
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600' }}>即時確認</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--gray-800)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {getGeneralAppearance()}
                        </p>
                    </div>

                    {/* ステップ2: トリアージバイタル */}
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b', opacity: isPhase2Unlocked ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#92400e' }}>
                                ② トリアージエリア バイタルサイン
                            </span>
                            <span style={{ fontSize: '0.75rem', color: isPhase2Unlocked ? '#16a34a' : '#d97706', fontWeight: '600' }}>
                                {isPhase2Unlocked ? '開示済' : '測定中...'}
                            </span>
                        </div>

                        {isPhase2Unlocked ? (
                            <VitalsCard
                                title="トリアージV/S"
                                vitals={patient.vitals_triage || patient.vitals_initial}
                                vitalsStruct={patient.vitals_triage_struct || patient.vitals_initial_struct}
                                isBlurred={false}
                            />
                        ) : (
                            <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', textAlign: 'center', color: '#92400e', fontSize: '0.85rem' }}>
                                測定・カウント中...（まもなくバイタルが表示されます）
                            </div>
                        )}
                    </div>

                    {/* ステップ3: 全身迅速観察所見（徐々に判明） */}
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#065f46' }}>
                                ③ 迅速全身観察所見（診察進行に応じて判明）
                            </span>
                            <span style={{ fontSize: '0.75rem', color: isCompleted ? '#16a34a' : '#059669', fontWeight: '600' }}>
                                {isCompleted ? '診察完了 (100%)' : `進行中 (${progressPct}%)`}
                            </span>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--gray-200)', minHeight: '60px' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gray-900)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {getGradualRevealedFindings()}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 下部アクションボタン */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                    onClick={() => navigate('/training')}
                    className={`button ${isCompleted ? 'button--primary' : 'button--secondary'}`}
                    style={{
                        padding: '0.85rem',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: isCompleted ? '#16a34a' : undefined
                    }}
                >
                    {isCompleted ? '📋 カルテ記入完了 → 次の患者をスキャン' : '患者一覧 / スキャナーに戻る'}
                </button>
            </div>
        </div>
    )
}

export default TriagePatientPage
