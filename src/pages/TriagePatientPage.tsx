import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Patient } from '../types/patient'
import { usePatient } from '../hooks/usePatient'
import LoadingScreen from '../components/LoadingScreen'
import PatientPictogram from '../components/PatientPictogram'
import VitalsCard from '../components/VitalsCard'

const TRIAGE_DURATION_SEC = 120 // 2分（120秒）
const STORAGE_PREFIX = 'triage_timer_start_'

const TriagePatientPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const patientId = id ? parseInt(id) : null
    const { patient, loading, error } = usePatient(patientId)

    // 2分タイマー管理
    const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
    const [secondsRemaining, setSecondsRemaining] = useState<number>(TRIAGE_DURATION_SEC)
    const [isCompleted, setIsCompleted] = useState(false)

    // ローカルストレージからタイマー再開を試みる（リロード対策）
    useEffect(() => {
        if (!patientId) return
        const key = `${STORAGE_PREFIX}${patientId}`
        const savedStart = localStorage.getItem(key)
        if (savedStart) {
            const startMs = parseInt(savedStart, 10)
            const elapsed = Math.floor((Date.now() - startMs) / 1000)
            if (elapsed >= TRIAGE_DURATION_SEC) {
                setTimerStartedAt(startMs)
                setSecondsRemaining(0)
                setIsCompleted(true)
            } else {
                setTimerStartedAt(startMs)
                setSecondsRemaining(TRIAGE_DURATION_SEC - elapsed)
            }
        }
    }, [patientId])

    // タイマーのカウントダウンループ
    useEffect(() => {
        if (!timerStartedAt || isCompleted) return

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000)
            const remaining = Math.max(0, TRIAGE_DURATION_SEC - elapsed)
            setSecondsRemaining(remaining)

            if (remaining === 0) {
                setIsCompleted(true)
                clearInterval(interval)
            }
        }, 500)

        return () => clearInterval(interval)
    }, [timerStartedAt, isCompleted])

    const handleStartTriage = () => {
        if (!patientId) return
        const now = Date.now()
        setTimerStartedAt(now)
        setSecondsRemaining(TRIAGE_DURATION_SEC)
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
    const elapsedSec = TRIAGE_DURATION_SEC - secondsRemaining
    const progressPct = timerStartedAt ? Math.min(100, Math.floor((elapsedSec / TRIAGE_DURATION_SEC) * 100)) : 0

    // 段階的開示フラグ
    // フェーズ1 (開始直後 0秒〜): 外見・意識状態
    // フェーズ2 (45秒経過 / 35%〜): 呼吸・循環・トリアージバイタル
    // フェーズ3 (90秒経過 / 75%〜): 全身の迅速観察所見（頭部〜四肢の要点）
    const isPhase1Unlocked = timerStartedAt !== null
    const isPhase2Unlocked = elapsedSec >= 45 || isCompleted
    const isPhase3Unlocked = elapsedSec >= 90 || isCompleted

    // トリアージ用要約所見の組み立て
    const getSummaryFindings = () => {
        const f = patient.findings || ({} as any)
        const parts: string[] = []
        if (f.head_and_neck) parts.push(`【頭頸部】${f.head_and_neck}`)
        if (f.chest) parts.push(`【胸部】${f.chest}`)
        if (f.abdomen_and_pelvis) parts.push(`【腹・骨盤】${f.abdomen_and_pelvis}`)
        if (f.limbs) parts.push(`【四肢】${f.limbs}`)
        return parts.length > 0 ? parts.join('\n') : '明らかな外表奇形・大量外出血なし'
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
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '0.3rem 0.7rem', borderRadius: '999px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                    🚑 病院入口トリアージポスト
                </span>
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

            {/* トリアージ2分タイマー コントロール */}
            {!timerStartedAt ? (
                <div className="card card--elevated" style={{ textAlign: 'center', padding: '2rem 1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)', border: '2px solid #f87171' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱️</div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#991b1b', marginBottom: '0.5rem' }}>
                        トリアージ迅速評価（2分間）
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                        ボタンを押すと2分間のタイマーが開始し、<br />
                        全身観察とトリアージバイタルが段階的に開示されます。<br />
                        <strong>確認した所見を紙カルテに記入してください。</strong>
                    </p>
                    <button
                        onClick={handleStartTriage}
                        className="button button--primary"
                        style={{ width: '100%', maxWidth: '320px', padding: '0.9rem', fontSize: '1.05rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#dc2626' }}
                    >
                        🩺 トリアージ診察を開始する（2分）
                    </button>
                </div>
            ) : (
                <div className="card card--elevated" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: isCompleted ? '#f0fdf4' : '#fafafa', border: `2px solid ${isCompleted ? '#22c55e' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isCompleted ? '#166534' : '#991b1b' }}>
                            {isCompleted ? '✅ トリアージ迅速評価 完了' : '⏳ トリアージ迅速評価 進行中...'}
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
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        <span>外見・意識</span>
                        <span>バイタル判定 (45s)</span>
                        <span>全身観察要点 (90s)</span>
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
                                ① 外見・大まかな印象 / 意識レベル
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600' }}>即時確認</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--gray-800)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {patient.consciousness_level ? `意識レベル: ${patient.consciousness_level}` : '意識レベル: 判定中または刺激で開眼'}
                        </p>
                    </div>

                    {/* ステップ2: トリアージバイタル */}
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b', opacity: isPhase2Unlocked ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#92400e' }}>
                                ② トリアージエリア バイタルサイン
                            </span>
                            <span style={{ fontSize: '0.75rem', color: isPhase2Unlocked ? '#16a34a' : '#d97706', fontWeight: '600' }}>
                                {isPhase2Unlocked ? '開示済' : '45秒経過で開示'}
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

                    {/* ステップ3: 全身迅速観察所見（要点） */}
                    <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981', opacity: isPhase3Unlocked ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#065f46' }}>
                                ③ 迅速全身観察所見（要点まとめ）
                            </span>
                            <span style={{ fontSize: '0.75rem', color: isPhase3Unlocked ? '#16a34a' : '#059669', fontWeight: '600' }}>
                                {isPhase3Unlocked ? '開示済' : '90秒経過で開示'}
                            </span>
                        </div>

                        {isPhase3Unlocked ? (
                            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gray-900)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                    {getSummaryFindings()}
                                </p>
                            </div>
                        ) : (
                            <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '8px', textAlign: 'center', color: '#065f46', fontSize: '0.85rem' }}>
                                全身を迅速触診・観察中...（90秒経過で要点が開示されます）
                            </div>
                        )}
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
