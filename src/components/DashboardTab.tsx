import React, { useState, useEffect } from 'react'
import { Patient } from '../types/patient'
import { endTrainingSession, activeSessionId, fetchTrainingSession } from '../lib/firestore'
import { exportCSV } from '../lib/csv'

interface DashboardTabProps {
    patients: Patient[]
}

// ミリ秒を「M分S秒」表示に変換
function msToMinSec(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}分${String(s).padStart(2, '0')}秒`
}

// ミリ秒を「MM:SS」表示に変換
function msToDisplay(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const DashboardTab: React.FC<DashboardTabProps> = ({ patients }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [isSessionEnded, setIsSessionEnded] = useState(false)
    const [frozenElapsedSec, setFrozenElapsedSec] = useState<number | null>(null)
    const [showSummary, setShowSummary] = useState(false)
    const [sessionStartMs, setSessionStartMs] = useState<number | null>(null)

    // セッション開始時刻をFirestoreメタデータから取得（なければ受付時刻最小値で代用）
    useEffect(() => {
        if (activeSessionId) {
            fetchTrainingSession(activeSessionId).then(session => {
                if (session?.sessionStartMs) {
                    setSessionStartMs(session.sessionStartMs)
                } else {
                    const validTimes = patients.map(p => p.reception_time_ms).filter(Boolean) as number[]
                    if (validTimes.length > 0) setSessionStartMs(Math.min(...validTimes))
                }
            }).catch(() => {
                const validTimes = patients.map(p => p.reception_time_ms).filter(Boolean) as number[]
                if (validTimes.length > 0) setSessionStartMs(Math.min(...validTimes))
            })
        } else {
            const validTimes = patients.map(p => p.reception_time_ms).filter(Boolean) as number[]
            if (validTimes.length > 0) setSessionStartMs(Math.min(...validTimes))
        }
    }, [patients.length])

    useEffect(() => {
        if (isSessionEnded || !sessionStartMs) return
        const updateTimer = () => {
            setElapsedSeconds(Math.floor((Date.now() - sessionStartMs) / 1000))
        }
        updateTimer()
        const intervalId = setInterval(updateTimer, 1000)
        return () => clearInterval(intervalId)
    }, [sessionStartMs, isSessionEnded])

    const displaySec = isSessionEnded && frozenElapsedSec !== null ? frozenElapsedSec : elapsedSeconds
    const formattedTime = msToDisplay(displaySec * 1000)

    const handleEndSession = async () => {
        if (window.confirm('訓練を終了しますか？タイマーを停止し、セッションを完了状態にします。')) {
            setFrozenElapsedSec(elapsedSeconds)
            setIsSessionEnded(true)
            if (activeSessionId) {
                try {
                    await endTrainingSession(activeSessionId)
                } catch (e) {
                    console.error('Failed to end session', e)
                }
            }
        }
    }

    // --------------- 集計 ---------------
    const totalCount = patients.length
    const redCount    = patients.filter(p => p.triage_color === '赤').length
    const yellowCount = patients.filter(p => p.triage_color === '黄').length
    const greenCount  = patients.filter(p => p.triage_color === '緑').length
    const blackCount  = patients.filter(p => p.triage_color === '黒').length

    // 投入済み（アクションが開始された）患者数
    const activeCount = patients.filter(p => p.triage_time_ms || p.initial_vs_time_ms || p.timer_started_at || p.status !== '初期状態').length

    // フェーズ別完了カウント
    const triageCount    = patients.filter(p => p.triage_time_ms).length
    const initialVsCount = patients.filter(p => p.initial_vs_time_ms).length
    const postVsCount    = patients.filter(p => p.post_vs_time_ms).length
    const deterioratedCount = patients.filter(p => p.status === '悪化').length

    // サマリー用：各患者の経過時間計算
    const summaryRows = patients.map(p => {
        const base = p.reception_time_ms
        const triageDelta  = base && p.triage_time_ms    ? p.triage_time_ms    - base : null
        const initialDelta = base && p.initial_vs_time_ms ? p.initial_vs_time_ms - base : null
        const postDelta    = base && p.post_vs_time_ms   ? p.post_vs_time_ms   - base : null
        const deteriorated = p.status === '悪化'
        return { p, triageDelta, initialDelta, postDelta, deteriorated }
    })

    const pct = (n: number) => totalCount > 0 ? Math.round((n / totalCount) * 100) : 0

    return (
        <div className="dashboard-tab">
            {/* ヘッダー行 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>全体の概況</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* 経過タイマー */}
                    <div className="card card--elevated" style={{ padding: '0.5rem 1rem', background: isSessionEnded ? '#064e3b' : 'var(--gray-800)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.5s' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-300)' }}>{isSessionEnded ? '訓練終了' : '訓練経過時間'}</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{formattedTime}</span>
                    </div>
                    {/* 訓練終了ボタン */}
                    {!isSessionEnded ? (
                        <button
                            onClick={handleEndSession}
                            className="button button--danger"
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            訓練終了
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowSummary(true)}
                            className="button button--primary"
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#059669', borderColor: '#059669' }}
                        >
                            📋 セッションサマリー
                        </button>
                    )}
                </div>
            </div>

            {/* 患者数カード（各重症度の投入数/総数を表示） */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="card card--elevated" style={{ textAlign: 'center', padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>投入数 / 総計</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{activeCount} <span style={{fontSize: '1rem', color: 'var(--gray-400)'}}>/ {totalCount}</span></div>
                </div>
                {[
                    { label: '赤', count: redCount, color: '#dc2626', bgColor: '#fef2f2' },
                    { label: '黄', count: yellowCount, color: '#d97706', bgColor: '#fffbeb' },
                    { label: '緑', count: greenCount, color: '#059669', bgColor: '#f0fdf4' },
                    { label: '黒', count: blackCount, color: '#1e293b', bgColor: '#f8fafc' },
                ].map(({ label, count, color, bgColor }) => {
                    const active = patients.filter(p =>
                        p.triage_color === label &&
                        (p.triage_time_ms || p.initial_vs_time_ms || p.timer_started_at || p.status !== '初期状態')
                    ).length
                    return (
                        <div key={label} className="card card--elevated" style={{ textAlign: 'center', padding: '0.875rem', borderTop: `4px solid ${color}`, background: bgColor }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{label}</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color }}>{active}<span style={{ fontSize: '0.85rem', color: 'var(--gray-400)', fontWeight: 'normal' }}>/{count}</span></div>
                        </div>
                    )
                })}
            </div>

            {/* トリアージ分布バー */}
            <div className="card card--elevated" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>トリアージ分布</h3>
                <div style={{ height: '20px', width: '100%', background: 'var(--gray-100)', borderRadius: '10px', display: 'flex', overflow: 'hidden', marginBottom: '0.4rem' }}>
                    <div style={{ width: `${pct(redCount)}%`, background: '#dc2626', transition: 'width 0.5s' }} title={`赤: ${redCount}`} />
                    <div style={{ width: `${pct(yellowCount)}%`, background: '#f59e0b', transition: 'width 0.5s' }} title={`黄: ${yellowCount}`} />
                    <div style={{ width: `${pct(greenCount)}%`, background: '#059669', transition: 'width 0.5s' }} title={`緑: ${greenCount}`} />
                    <div style={{ width: `${pct(blackCount)}%`, background: '#0f172a', transition: 'width 0.5s' }} title={`黒: ${blackCount}`} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    <span>赤: {pct(redCount)}%</span>
                    <span>黄: {pct(yellowCount)}%</span>
                    <span>緑: {pct(greenCount)}%</span>
                    <span>黒: {pct(blackCount)}%</span>
                </div>
            </div>

            {/* フェーズ完了状況 */}
            <div className="card card--elevated" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>フェーズ別完了状況</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    {[
                        { label: 'トリアージ完了', count: triageCount, color: '#7c3aed' },
                        { label: '初期V/S測定済', count: initialVsCount, color: '#1d4ed8' },
                        { label: '処置完了', count: postVsCount, color: '#059669' },
                        { label: '悪化患者', count: deterioratedCount, color: '#dc2626' },
                    ].map(({ label, count, color }) => (
                        <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px', border: `2px solid ${color}22` }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>{label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>
                                {count}<span style={{ fontSize: '0.85rem', color: 'var(--gray-400)', fontWeight: 'normal' }}>/{totalCount}</span>
                            </div>
                            <div style={{ marginTop: '0.35rem', height: '4px', background: 'var(--gray-200)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct(count)}%`, height: '100%', background: color, transition: 'width 0.5s', borderRadius: '4px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 患者別ステータス一覧 */}
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>患者別ステータス一覧</h3>
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                        <tr>
                            <th style={{ padding: '0.6rem 0.75rem', color: 'var(--gray-600)' }}>患者</th>
                            <th style={{ padding: '0.6rem 0.75rem', color: 'var(--gray-600)' }}>色</th>
                            <th style={{ padding: '0.6rem 0.75rem', color: 'var(--gray-600)' }}>T完了</th>
                            <th style={{ padding: '0.6rem 0.75rem', color: 'var(--gray-600)' }}>初期V/S</th>
                            <th style={{ padding: '0.6rem 0.75rem', color: 'var(--gray-600)' }}>処置完了</th>
                            <th style={{ padding: '0.6rem 0.75rem', color: 'var(--gray-600)' }}>状態</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)', background: p.status === '悪化' ? '#fff8f8' : 'white' }}>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                    <div style={{ fontWeight: '500' }}>{p.name || `ID:${p.id}`}</div>
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                                        background: p.triage_color === '赤' ? '#dc2626' : p.triage_color === '黄' ? '#f59e0b' : p.triage_color === '緑' ? '#059669' : '#0f172a',
                                        color: 'white'
                                    }}>
                                        {p.triage_color}
                                    </span>
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{p.triage_time_ms ? '✅' : '—'}</td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{p.initial_vs_time_ms ? '✅' : '—'}</td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{p.post_vs_time_ms ? '✅' : '—'}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500',
                                        background: p.status === '初期状態' ? 'var(--gray-100)' : p.status === '処置中' ? '#fef3c7' :
                                                    p.status === 'アセスメント完了' ? '#d1fae5' : p.status === '悪化' ? '#fee2e2' : 'var(--gray-100)',
                                        color: p.status === '悪化' ? '#991b1b' : p.status === '処置中' ? '#92400e' : p.status === 'アセスメント完了' ? '#065f46' : 'var(--gray-600)',
                                    }}>
                                        {p.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ───────── セッションサマリーモーダル ───────── */}
            {showSummary && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    padding: '1rem', paddingBottom: '3rem', overflowY: 'auto'
                }}>
                    <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '700px', padding: '1.5rem', position: 'relative', margin: 'auto' }}>
                        <button
                            onClick={() => setShowSummary(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--gray-500)', lineHeight: 1 }}
                        >×</button>

                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>📋 セッションサマリー</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '1.25rem' }}>
                            総訓練時間: {formattedTime} ／ 総患者数: {totalCount}名
                            {deterioratedCount > 0 && <span style={{ color: '#dc2626', fontWeight: 'bold', marginLeft: '0.75rem' }}>⚠ 悪化患者: {deterioratedCount}名</span>}
                        </p>

                        {/* 概況バー */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            {[
                                { label: 'トリアージ完了', v: triageCount, color: '#7c3aed' },
                                { label: '初期V/S済', v: initialVsCount, color: '#1d4ed8' },
                                { label: '処置完了', v: postVsCount, color: '#059669' },
                                { label: '悪化', v: deterioratedCount, color: '#dc2626' },
                            ].map(({ label, v, color }) => (
                                <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '8px', border: `1px solid ${color}33` }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{label}</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{v}<span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>/{totalCount}</span></div>
                                </div>
                            ))}
                        </div>

                        {/* 患者別詳細テーブル */}
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>患者別パフォーマンス</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                                    <tr>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: 'var(--gray-600)' }}>患者名</th>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#7c3aed' }}>T開始</th>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#1d4ed8' }}>初期V/S</th>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#059669' }}>処置完了</th>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#dc2626' }}>悪化</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryRows.map(({ p, triageDelta, initialDelta, postDelta, deteriorated }) => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)', background: deteriorated ? '#fff1f2' : 'white' }}>
                                            <td style={{ padding: '0.5rem 0.6rem', fontWeight: '500' }}>
                                                {deteriorated && <span style={{ color: '#dc2626', marginRight: '4px' }}>⚠</span>}
                                                {p.name || `ID:${p.id}`}
                                                <span style={{
                                                    marginLeft: '6px', fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '3px',
                                                    background: p.triage_color === '赤' ? '#dc2626' : p.triage_color === '黄' ? '#f59e0b' : p.triage_color === '緑' ? '#059669' : '#0f172a',
                                                    color: 'white'
                                                }}>{p.triage_color}</span>
                                            </td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#7c3aed' }}>
                                                {triageDelta !== null ? msToMinSec(triageDelta) : '—'}
                                            </td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#1d4ed8' }}>
                                                {initialDelta !== null ? msToMinSec(initialDelta) : '—'}
                                            </td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#059669' }}>
                                                {postDelta !== null ? msToMinSec(postDelta) : '—'}
                                            </td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                                                {deteriorated
                                                    ? <span style={{ color: '#dc2626', fontWeight: 'bold' }}>悪化</span>
                                                    : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '1rem' }}>
                            ※ 各時間は reception_time_ms（患者受付登録時刻）からの経過時間です。
                        </p>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => {
                                    const csv = exportCSV(patients)
                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `訓練ログ_${new Date().toISOString().slice(0,10)}.csv`
                                    a.click()
                                    URL.revokeObjectURL(url)
                                }}
                                className="button button--primary"
                                style={{ width: 'auto', padding: '0.5rem 1.25rem', background: '#1d4ed8', borderColor: '#1d4ed8' }}
                            >
                                ↓ 訓練ログCSV出力
                            </button>
                            <button onClick={() => setShowSummary(false)} className="button button--secondary" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DashboardTab
