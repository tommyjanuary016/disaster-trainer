import React, { useState, useEffect, useRef } from 'react'
import { Patient } from '../types/patient'
import { endTrainingSession, activeSessionId, fetchTrainingSession } from '../lib/firestore'
import { exportCSV } from '../lib/csv'
import { PROCEDURE_NAMES } from '../pages/TreatmentScanPage'
import { useWakeLock } from '../hooks/useWakeLock'
import { soundEngine } from '../lib/soundEngine'

interface DashboardTabProps {
    patients: Patient[]
    isSessionEndedParent?: boolean
}

interface ActivityLogItem {
    id: string
    time: string
    triage: string
    patientName: string
    message: string
    isCritical?: boolean
}

// ミリ秒を「M分S秒」表示に変換
function msToMinSec(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000))
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}分${String(s).padStart(2, '0')}秒`
}

// ミリ秒を「MM:SS」表示に変換
function msToDisplay(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000))
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 初期V/Sと処置後V/Sに明確な数値変化があるかチェックする判定関数
function checkVitalsChanged(p: Patient): boolean {
    if (p.vitals_deterioration_struct) return true
    const i = p.vitals_initial_struct
    const post = p.vitals_post_struct
    if (i && post) {
        if (
            i.sbp !== post.sbp ||
            i.dbp !== post.dbp ||
            i.hr !== post.hr ||
            i.rr !== post.rr ||
            i.spo2 !== post.spo2 ||
            i.temp !== post.temp ||
            i.gcs_e !== post.gcs_e ||
            i.gcs_v !== post.gcs_v ||
            i.gcs_m !== post.gcs_m
        ) {
            return true
        }
    }
    if (p.vitals_initial && p.vitals_post && p.vitals_initial.trim() !== p.vitals_post.trim()) {
        return true
    }
    return false
}

/** 患者の急変カウントダウン（TTD: Time To Deterioration）を計算 */
function computePatientTTD(p: Patient, nowMs: number): {
    hasTTD: boolean
    remainingSec: number
    progressPct: number
    isExpired: boolean
    isStabilized: boolean
} {
    const reqList = p.required_treatments || []
    const doneList = p.completed_treatments || []
    const isStabilized = p.stabilization_completed || (reqList.length > 0 && reqList.every(rt => doneList.includes(rt.treatment_id)))

    if (!p.deterioration_enabled || !p.deterioration_time_minutes) {
        return { hasTTD: false, remainingSec: 0, progressPct: 0, isExpired: false, isStabilized }
    }

    const totalSec = p.deterioration_time_minutes * 60
    const startMs = p.reception_time_ms || nowMs
    const elapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000))
    const remainingSec = Math.max(0, totalSec - elapsedSec)
    const progressPct = Math.min(100, Math.max(0, Math.round((elapsedSec / Math.max(totalSec, 1)) * 100)))
    const isExpired = remainingSec === 0 || p.status === '悪化'

    return {
        hasTTD: true,
        remainingSec,
        progressPct,
        isExpired,
        isStabilized,
    }
}

/** 円形TTD（Time To Deterioration）ゲージコンポーネント */
const CircularTTDGauge: React.FC<{
    remainingSec: number
    progressPct: number
    isExpired: boolean
    isStabilized: boolean
}> = ({ remainingSec, progressPct, isExpired, isStabilized }) => {
    const radius = 26
    const circumference = 2 * Math.PI * radius
    const remainingRatio = Math.max(0, (100 - progressPct) / 100)
    const strokeDashoffset = circumference * (1 - remainingRatio)

    if (isStabilized) {
        return (
            <div className="hq-ttd-badge hq-ttd-badge--safe" title="必須処置完了により急変阻止">
                <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>🛡️ 安定化済</span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>TTD 停止</span>
            </div>
        )
    }

    const strokeColor = isExpired ? '#ef4444' : remainingSec <= 180 ? '#f97316' : '#f43f5e'

    return (
        <div className={`hq-ttd-gauge ${isExpired ? 'hq-ttd-gauge--expired' : ''}`}>
            <div className="hq-ttd-gauge__label">
                {isExpired ? '🚨 状態悪化到達' : '急変まで残り'}
            </div>
            <div className="hq-ttd-gauge__ring-wrap">
                <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke="rgba(239, 68, 68, 0.18)"
                        strokeWidth="5"
                    />
                    <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={isExpired ? 0 : strokeDashoffset}
                        transform="rotate(-90 32 32)"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                </svg>
                <div className="hq-ttd-gauge__center">
                    <div className="hq-ttd-gauge__time">
                        {isExpired ? '00:00' : msToDisplay(remainingSec * 1000)}
                    </div>
                    <div className="hq-ttd-gauge__sub">(TTD)</div>
                </div>
            </div>
        </div>
    )
}

const DashboardTab: React.FC<DashboardTabProps> = ({ patients, isSessionEndedParent }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [nowMs, setNowMs] = useState<number>(() => Date.now())
    const [isSessionEnded, setIsSessionEnded] = useState(isSessionEndedParent || false)
    const [frozenElapsedSec, setFrozenElapsedSec] = useState<number | null>(null)
    const [showSummary, setShowSummary] = useState(false)
    const [sessionStartMs, setSessionStartMs] = useState<number | null>(null)
    const [sessionTitle, setSessionTitle] = useState<string>('DISASTER LOGIC HQ')
    const [viewMode, setViewMode] = useState<'command' | 'table'>('command')
    const [isCompactView, setIsCompactView] = useState(false)

    // 災害対策本部ダッシュボード表示中はモニターの画面スリープを自動防止
    useWakeLock(true)

    // リアルタイム・アクティビティティッカー用の状態と前回スナップショット
    const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])
    const prevSnapshotRef = useRef<Map<number, {
        status: string
        completedCount: number
        lastTreatment: string | null
        testsCompleted: boolean
        triageDone: boolean
        initialVsDone: boolean
    }>>(new Map())

    useEffect(() => {
        if (isSessionEndedParent) {
            setIsSessionEnded(true)
        }
    }, [isSessionEndedParent])

    // セッション開始時刻をFirestoreメタデータから取得
    useEffect(() => {
        if (!activeSessionId) {
            setSessionStartMs(null)
            return
        }
        fetchTrainingSession(activeSessionId).then(session => {
            if (session?.sessionStartMs) {
                setSessionStartMs(session.sessionStartMs)
            }
            if (session?.title) {
                setSessionTitle(session.title)
            }
        }).catch(() => {})
    }, [activeSessionId])

    // 1秒ごとのリアルタイムクロック更新（経過時間＋各患者のTTDカウントダウン同期用）
    useEffect(() => {
        const tick = () => {
            const current = Date.now()
            setNowMs(current)
            if (!isSessionEnded && sessionStartMs && activeSessionId) {
                setElapsedSeconds(Math.floor((current - sessionStartMs) / 1000))
            }
        }
        tick()
        const intervalId = setInterval(tick, 1000)
        return () => clearInterval(intervalId)
    }, [sessionStartMs, isSessionEnded])

    // 患者データ変化の監視 → ライブ・アクティビティ・ティッカーの自動生成 ＆ 急変アラーム音
    useEffect(() => {
        if (!patients || patients.length === 0) return

        const nowStr = () => {
            const d = new Date()
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
        }

        const newLogs: ActivityLogItem[] = []
        let triggerCriticalSound = false
        let triggerNormalBeep = false
        const isFirstSnapshot = prevSnapshotRef.current.size === 0

        patients.forEach((p, idx) => {
            const pLabel = p.name || `患者No.${idx + 1}`
            const triage = p.triage_color || '未'
            const completed = p.completed_treatments || []
            const prev = prevSnapshotRef.current.get(p.id)

            if (!isFirstSnapshot && prev) {
                // トリアージ完了検知
                if (!prev.triageDone && (!!p.triage_time_ms || completed.includes('triage'))) {
                    newLogs.push({
                        id: `${p.id}-triage-${Date.now()}`,
                        time: nowStr(),
                        triage,
                        patientName: pLabel,
                        message: 'トリアージ迅速評価完了',
                    })
                    triggerNormalBeep = true
                }
                // 初療バイタル測定検知
                if (!prev.initialVsDone && (!!p.initial_vs_time_ms || completed.includes('vitals'))) {
                    newLogs.push({
                        id: `${p.id}-vs-${Date.now()}`,
                        time: nowStr(),
                        triage,
                        patientName: pLabel,
                        message: '診療エリアV/S測定完了',
                    })
                    triggerNormalBeep = true
                }
                // 処置開始検知
                if (prev.status !== '処置中' && p.status === '処置中' && p.applied_treatment_id) {
                    const procName = PROCEDURE_NAMES[p.applied_treatment_id] || p.applied_treatment_id
                    newLogs.push({
                        id: `${p.id}-start-${Date.now()}`,
                        time: nowStr(),
                        triage,
                        patientName: pLabel,
                        message: `${procName} 開始`,
                    })
                    triggerNormalBeep = true
                }
                // 新規手技完了検知
                if (completed.length > prev.completedCount) {
                    const lastId = completed[completed.length - 1]
                    if (lastId && lastId !== 'triage' && lastId !== 'vitals') {
                        const procName = PROCEDURE_NAMES[lastId] || lastId
                        newLogs.push({
                            id: `${p.id}-done-${lastId}-${Date.now()}`,
                            time: nowStr(),
                            triage,
                            patientName: pLabel,
                            message: `${procName} 完了`,
                        })
                        triggerNormalBeep = true
                    }
                }
                // 専門検査完了検知
                if (!prev.testsCompleted && p.tests_completed) {
                    newLogs.push({
                        id: `${p.id}-test-${Date.now()}`,
                        time: nowStr(),
                        triage,
                        patientName: pLabel,
                        message: '画像・血液検査結果 公開完了',
                    })
                    triggerNormalBeep = true
                }
                // 状態悪化・急変検知
                if (prev.status !== '悪化' && p.status === '悪化') {
                    newLogs.push({
                        id: `${p.id}-crit-${Date.now()}`,
                        time: nowStr(),
                        triage,
                        patientName: pLabel,
                        message: '🚨 状態悪化（急変）発生！',
                        isCritical: true,
                    })
                    triggerCriticalSound = true
                }
            }

            prevSnapshotRef.current.set(p.id, {
                status: p.status,
                completedCount: completed.length,
                lastTreatment: p.applied_treatment_id,
                testsCompleted: !!p.tests_completed,
                triageDone: !!p.triage_time_ms || completed.includes('triage'),
                initialVsDone: !!p.initial_vs_time_ms || completed.includes('vitals'),
            })
        })

        // 初回マウント時は既存の完了履歴から直近のログを最大5件シード生成してティッカーに表示
        if (isFirstSnapshot) {
            const seeded: ActivityLogItem[] = []
            patients.forEach((p, idx) => {
                const pLabel = p.name || `患者No.${idx + 1}`
                const triage = p.triage_color || '未'
                const completed = p.completed_treatments || []
                if (p.status === '悪化') {
                    seeded.push({
                        id: `seed-crit-${p.id}`,
                        time: 'LIVE',
                        triage,
                        patientName: pLabel,
                        message: '🚨 状態悪化（急変対応要）',
                        isCritical: true,
                    })
                } else if (p.status === '処置中' && p.applied_treatment_id) {
                    const procName = PROCEDURE_NAMES[p.applied_treatment_id] || p.applied_treatment_id
                    seeded.push({
                        id: `seed-act-${p.id}`,
                        time: 'LIVE',
                        triage,
                        patientName: pLabel,
                        message: `${procName} 実施中`,
                    })
                } else if (completed.length > 0) {
                    const lastId = completed[completed.length - 1]
                    const procName = PROCEDURE_NAMES[lastId] || lastId
                    seeded.push({
                        id: `seed-done-${p.id}`,
                        time: 'LOG',
                        triage,
                        patientName: pLabel,
                        message: `${procName} 完了`,
                    })
                }
            })
            if (seeded.length > 0) {
                setActivityLogs(seeded.slice(0, 8))
            }
        } else if (newLogs.length > 0) {
            setActivityLogs(prev => [...newLogs, ...prev].slice(0, 15))
            if (triggerCriticalSound) {
                soundEngine.playCriticalAlert()
            } else if (triggerNormalBeep) {
                soundEngine.playVitalMonitorBeep()
            }
        }
    }, [patients])

    const displaySec = isSessionEnded && frozenElapsedSec !== null ? frozenElapsedSec : elapsedSeconds
    const formattedTime = msToDisplay(displaySec * 1000)
    const showTimer = !!activeSessionId && sessionStartMs !== null

    const handleEndSession = async () => {
        if (window.confirm('訓練を終了しますか？タイマーを停止し、セッションを完了状態にします。')) {
            setFrozenElapsedSec(elapsedSeconds)
            setIsSessionEnded(true)
            soundEngine.playTreatmentComplete()
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
    const redPatients    = patients.filter(p => p.triage_color === '赤')
    const yellowPatients = patients.filter(p => p.triage_color === '黄')
    const greenPatients  = patients.filter(p => p.triage_color === '緑')
    const blackPatients  = patients.filter(p => p.triage_color === '黒')

    const redCount    = redPatients.length
    const yellowCount = yellowPatients.length
    const greenCount  = greenPatients.length
    const blackCount  = blackPatients.length

    // 投入済み（アクションが開始された）患者数
    const activeCount = patients.filter(p => p.triage_time_ms || p.initial_vs_time_ms || p.timer_started_at || p.status !== '初期状態' || (p.completed_treatments && p.completed_treatments.length > 0)).length

    // フェーズ別完了カウント
    const triageCount    = patients.filter(p => p.triage_time_ms || p.completed_treatments?.includes('triage')).length
    const initialVsCount = patients.filter(p => p.initial_vs_time_ms || p.completed_treatments?.includes('vitals')).length
    const postVsCount    = patients.filter(p => {
        const reqs = p.required_treatments || []
        const done = p.completed_treatments || []
        return p.post_vs_time_ms || p.stabilization_completed || (reqs.length > 0 && reqs.every(r => done.includes(r.treatment_id)))
    }).length
    const deterioratedCount = patients.filter(p => p.status === '悪化').length

    // 救命スコア & チームランク計算 (S / A / B / C)
    const allRequiredCount = patients.reduce((acc, p) => acc + (p.required_treatments?.length || 0), 0)
    const allDoneRequiredCount = patients.reduce((acc, p) => {
        const reqs = p.required_treatments || []
        const done = p.completed_treatments || []
        return acc + reqs.filter(r => done.includes(r.treatment_id)).length
    }, 0)

    const nonBlackTotal = Math.max(1, totalCount - blackCount)
    const preventableDeathAvoided = Math.max(0, nonBlackTotal - deterioratedCount)
    const survivalRatePct = totalCount > 0 ? Math.round((preventableDeathAvoided / nonBlackTotal) * 100) : 100
    const treatmentCompletionPct = allRequiredCount > 0 ? Math.round((allDoneRequiredCount / allRequiredCount) * 100) : (activeCount > 0 ? 85 : 0)
    const compositeScore = Math.round(survivalRatePct * 0.65 + treatmentCompletionPct * 0.35)

    const teamRank =
        compositeScore >= 90 ? 'S' :
        compositeScore >= 75 ? 'A' :
        compositeScore >= 60 ? 'B' : 'C'

    // サマリー＆ガントチャート用：各患者の経過時間計算
    const summaryRows = patients.map((p, idx) => {
        const base = p.reception_time_ms || sessionStartMs || (nowMs - 1800000)
        const triageDelta  = p.triage_time_ms    ? Math.max(0, p.triage_time_ms    - base) : null
        const initialDelta = p.initial_vs_time_ms ? Math.max(0, p.initial_vs_time_ms - base) : null
        const postDelta    = p.post_vs_time_ms   ? Math.max(0, p.post_vs_time_ms   - base) : null
        const deteriorated = p.status === '悪化'
        const reqList = p.required_treatments || []
        const doneList = p.completed_treatments || []
        const doneReqCount = reqList.filter(rt => doneList.includes(rt.treatment_id)).length
        return { p, idx, triageDelta, initialDelta, postDelta, deteriorated, reqCount: reqList.length, doneReqCount }
    })

    const pct = (n: number) => totalCount > 0 ? Math.round((n / totalCount) * 100) : 0

    // 4エリアカンバン定義
    const KANBAN_ZONES = [
        { key: '赤', title: 'Red Area', subTitle: '赤エリア（最優先治療群）', color: '#ef4444', headerBg: 'rgba(185, 28, 28, 0.35)', borderColor: 'rgba(239, 68, 68, 0.5)', list: redPatients },
        { key: '黄', title: 'Yellow Area', subTitle: '黄エリア（待機的治療群）', color: '#f59e0b', headerBg: 'rgba(180, 83, 9, 0.35)', borderColor: 'rgba(245, 158, 11, 0.5)', list: yellowPatients },
        { key: '緑', title: 'Green Area', subTitle: '緑エリア（軽症群）', color: '#10b981', headerBg: 'rgba(4, 120, 87, 0.35)', borderColor: 'rgba(16, 185, 129, 0.5)', list: greenPatients },
        { key: '黒', title: 'Black Area', subTitle: '黒エリア（不処置・救命困難群）', color: '#94a3b8', headerBg: 'rgba(30, 41, 59, 0.7)', borderColor: 'rgba(148, 163, 184, 0.35)', list: blackPatients },
    ]

    return (
        <div className="dashboard-tab hq-command-center">
            {/* ───────── Top Command Bar (DISASTER LOGIC HQ) ───────── */}
            <div className="hq-topbar">
                {/* 左：HQロゴ＆タイトル */}
                <div className="hq-topbar__brand">
                    <div className="hq-topbar__emblem">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 19 21 12 17 5 21 12 2" />
                        </svg>
                    </div>
                    <div>
                        <div className="hq-topbar__title">
                            DISASTER LOGIC <span style={{ color: '#38bdf8' }}>HQ</span>
                        </div>
                        <div className="hq-topbar__subtitle">
                            {sessionTitle} — 災害対策本部 統合指揮モニタリングシステム
                        </div>
                    </div>
                </div>

                {/* 中央：SESSION ACTIVE & Elapsed Mission Timer */}
                <div className="hq-topbar__mission">
                    <div className="hq-topbar__status-badge">
                        <span className={`hq-topbar__dot ${isSessionEnded ? 'hq-topbar__dot--ended' : ''}`} />
                        {isSessionEnded ? 'MISSION COMPLETED' : 'SESSION ACTIVE'}
                    </div>
                    <div className="hq-topbar__timer">
                        <span className="hq-topbar__timer-label">Elapsed mission:</span>
                        <span className="hq-topbar__timer-val">{showTimer ? formattedTime : '00:00'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
                        {showTimer && !isSessionEnded && (
                            <button
                                onClick={handleEndSession}
                                className="hq-btn hq-btn--danger"
                            >
                                訓練終了
                            </button>
                        )}
                        <button
                            onClick={() => setShowSummary(true)}
                            className="hq-btn hq-btn--primary"
                        >
                            📋 サマリー出力
                        </button>
                    </div>
                </div>

                {/* 右：リアルタイム・アクティビティ・ティッカー */}
                <div className="hq-ticker">
                    <div className="hq-ticker__header">
                        <span className="hq-ticker__live-dot" />
                        <span>LIVE ACTIVITY STREAM</span>
                    </div>
                    <div className="hq-ticker__list">
                        {activityLogs.length === 0 ? (
                            <div className="hq-ticker__item" style={{ color: '#64748b' }}>
                                待機中... 現場でのQRスキャン・処置がリアルタイムに表示されます
                            </div>
                        ) : (
                            activityLogs.slice(0, 3).map(log => {
                                const badgeColor =
                                    log.triage === '赤' ? '#ef4444' :
                                    log.triage === '黄' ? '#f59e0b' :
                                    log.triage === '緑' ? '#10b981' : '#94a3b8'
                                return (
                                    <div key={log.id} className={`hq-ticker__item ${log.isCritical ? 'hq-ticker__item--critical' : ''}`}>
                                        <span className="hq-ticker__time">{log.time}</span>
                                        <span style={{ color: badgeColor, fontWeight: 700 }}>[{log.triage}]</span>
                                        <span className="hq-ticker__patient">{log.patientName}</span>
                                        <span className="hq-ticker__msg">{log.message}</span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ───────── KPI ステータスバー & ビュー切替 ───────── */}
            <div className="hq-kpi-bar">
                <div className="hq-kpi-chips">
                    <div className="hq-kpi-chip">
                        <span className="hq-kpi-chip__label">投入患者 / 総数</span>
                        <span className="hq-kpi-chip__val">{activeCount}<small>/{totalCount}</small></span>
                    </div>
                    <div className="hq-kpi-chip">
                        <span className="hq-kpi-chip__label" style={{ color: '#a78bfa' }}>トリアージ済</span>
                        <span className="hq-kpi-chip__val" style={{ color: '#c4b5fd' }}>{triageCount}<small>/{totalCount}</small></span>
                    </div>
                    <div className="hq-kpi-chip">
                        <span className="hq-kpi-chip__label" style={{ color: '#60a5fa' }}>初療V/S測定</span>
                        <span className="hq-kpi-chip__val" style={{ color: '#93c5fd' }}>{initialVsCount}<small>/{totalCount}</small></span>
                    </div>
                    <div className="hq-kpi-chip">
                        <span className="hq-kpi-chip__label" style={{ color: '#34d399' }}>必須処置完了</span>
                        <span className="hq-kpi-chip__val" style={{ color: '#6ee7b7' }}>{postVsCount}<small>/{totalCount}</small></span>
                    </div>
                    <div className="hq-kpi-chip hq-kpi-chip--danger">
                        <span className="hq-kpi-chip__label" style={{ color: '#fca5a5' }}>急変・悪化</span>
                        <span className="hq-kpi-chip__val" style={{ color: '#f87171' }}>{deterioratedCount}<small>名</small></span>
                    </div>
                </div>

                {/* 表示モード切替スイッチ */}
                <div className="hq-view-switch">
                    <button
                        type="button"
                        onClick={() => setViewMode('command')}
                        className={`hq-view-switch__btn ${viewMode === 'command' ? 'hq-view-switch__btn--active' : ''}`}
                    >
                        🛰️ 4エリア戦術カンバン
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`hq-view-switch__btn ${viewMode === 'table' ? 'hq-view-switch__btn--active' : ''}`}
                    >
                        📊 一覧テーブル表示
                    </button>
                </div>
            </div>

            {/* ───────── メインビュー：4エリア戦術カンバン OR 一覧テーブル ───────── */}
            {viewMode === 'command' ? (
                <div className="hq-kanban-grid">
                    {KANBAN_ZONES.map(zone => (
                        <div key={zone.key} className="hq-kanban-col" style={{ borderColor: zone.borderColor }}>
                            {/* エリアヘッダー */}
                            <div className="hq-kanban-col__header" style={{ background: zone.headerBg, borderBottomColor: zone.borderColor }}>
                                <div>
                                    <span className="hq-kanban-col__title" style={{ color: zone.key === '赤' ? '#fca5a5' : zone.key === '黄' ? '#fcd34d' : zone.key === '緑' ? '#6ee7b7' : '#e2e8f0' }}>
                                        {zone.title}
                                    </span>
                                    <span className="hq-kanban-col__sub">{zone.subTitle}</span>
                                </div>
                                <span className="hq-kanban-col__count" style={{ background: zone.color }}>
                                    {zone.list.length}名
                                </span>
                            </div>

                            {/* 患者カードリスト */}
                            <div className="hq-kanban-col__body">
                                {zone.list.length === 0 ? (
                                    <div className="hq-kanban-empty">収容患者なし</div>
                                ) : (
                                    zone.list.map((p) => {
                                        const vs = p.vitals_initial_struct || p.vitals_triage_struct
                                        const reqList = p.required_treatments || []
                                        const doneList = p.completed_treatments || []
                                        const doneReqCount = reqList.filter(rt => doneList.includes(rt.treatment_id)).length
                                        const totalSteps = Math.max(1, reqList.length + 2) // Triage + V/S + Required
                                        const doneSteps = (doneList.includes('triage') || p.triage_time_ms ? 1 : 0) + (doneList.includes('vitals') || p.initial_vs_time_ms ? 1 : 0) + doneReqCount
                                        const progressRatio = Math.min(100, Math.round((doneSteps / totalSteps) * 100))

                                        const ttd = computePatientTTD(p, nowMs)
                                        const isCriticalCard = p.status === '悪化' || (ttd.hasTTD && !ttd.isStabilized && ttd.remainingSec <= 180)

                                        return (
                                            <div
                                                key={p.id}
                                                className={`hq-patient-card ${isCriticalCard ? 'hq-patient-card--critical' : ''}`}
                                                style={{ borderLeftColor: zone.color }}
                                            >
                                                <div className="hq-patient-card__main">
                                                    {/* 左側：患者情報・ライブバイタル・進捗バー */}
                                                    <div className="hq-patient-card__info">
                                                        <div className="hq-patient-card__head">
                                                            <span className="hq-patient-card__name">
                                                                {p.name || `患者ID:${p.id}`}
                                                            </span>
                                                            <span className="hq-patient-card__meta">
                                                                {p.age}歳 {p.gender === 'M' ? '男' : '女'}
                                                            </span>
                                                        </div>
                                                        <div className="hq-patient-card__diag" title={p.diagnosis}>
                                                            {p.diagnosis || '診断未確定'}
                                                        </div>

                                                        <div className="hq-patient-card__vitals-label">LIVE VITALS</div>
                                                        {vs ? (
                                                            <div className="hq-patient-card__vitals-row">
                                                                <span className={vs.hr > 120 || vs.hr < 50 ? 'hq-vital--warn' : ''}>
                                                                    ❤️ {vs.hr}
                                                                </span>
                                                                <span className={vs.sbp < 90 ? 'hq-vital--warn' : ''}>
                                                                    🩸 {vs.sbp}/{vs.dbp}
                                                                </span>
                                                                <span className={vs.spo2 < 94 ? 'hq-vital--warn' : ''}>
                                                                    🫧 {vs.spo2}%
                                                                </span>
                                                                <span>
                                                                    🫁 RR{vs.rr}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="hq-patient-card__vitals-row" style={{ color: '#64748b' }}>
                                                                バイタルデータ待機中
                                                            </div>
                                                        )}

                                                        {/* 処置ステータス＆プログレスバー */}
                                                        <div className="hq-patient-card__progress-meta">
                                                            <span>
                                                                {p.status === '処置中' && p.applied_treatment_id
                                                                    ? `💉 ${PROCEDURE_NAMES[p.applied_treatment_id] || p.applied_treatment_id}`
                                                                    : `処置進捗 (${doneReqCount}/${reqList.length})`}
                                                            </span>
                                                            <span>{progressRatio}%</span>
                                                        </div>
                                                        <div className="hq-patient-card__bar-track">
                                                            <div
                                                                className="hq-patient-card__bar-fill"
                                                                style={{
                                                                    width: `${progressRatio}%`,
                                                                    background: zone.color
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* 右側：急変設定がある場合は円形TTDカウントダウンゲージを表示 */}
                                                    {ttd.hasTTD && (
                                                        <CircularTTDGauge
                                                            remainingSec={ttd.remainingSec}
                                                            progressPct={ttd.progressPct}
                                                            isExpired={ttd.isExpired}
                                                            isStabilized={ttd.isStabilized}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ───────── 従来の一覧テーブル表示モード（コンパクト切替対応） ───────── */
                <div className="hq-table-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f8fafc' }}>患者別ステータス一覧</h3>
                        <button
                            onClick={() => setIsCompactView(!isCompactView)}
                            className="hq-btn hq-btn--secondary"
                        >
                            {isCompactView ? '🔍 標準表示に切替' : '⚡ コンパクト表示に切替'}
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto', background: '#0f172a', borderRadius: '10px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: isCompactView ? '0.78rem' : '0.85rem', color: '#e2e8f0' }}>
                            <thead style={{ background: '#1e293b', borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                                <tr>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>患者 ID/氏名</th>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>区分</th>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>必須手技 (完了/総数)</th>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>V/S変化設定</th>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>急変カウントダウン (TTD)</th>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap' }}>T完了</th>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap' }}>初期V/S</th>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap' }}>処置完了</th>
                                    <th style={{ padding: isCompactView ? '0.4rem 0.5rem' : '0.6rem 0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>現在のステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map(p => {
                                    const reqList = p.required_treatments || []
                                    const reqCount = reqList.length
                                    const doneTreatments = p.completed_treatments || []
                                    const doneReqCount = reqList.filter(rt => doneTreatments.includes(rt.treatment_id)).length
                                    const hasVitalsChange = checkVitalsChanged(p)
                                    const ttd = computePatientTTD(p, nowMs)
                                    const pad = isCompactView ? '0.35rem 0.5rem' : '0.6rem 0.75rem'

                                    return (
                                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.12)', background: p.status === '悪化' ? 'rgba(239, 68, 68, 0.12)' : 'transparent', whiteSpace: 'nowrap' }}>
                                            <td style={{ padding: pad }}>
                                                <div style={{ fontWeight: '600', color: '#f8fafc' }}>{p.name || `ID:${p.id}`}</div>
                                            </td>
                                            <td style={{ padding: pad }}>
                                                <span style={{
                                                    display: 'inline-block', padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold',
                                                    background: p.triage_color === '赤' ? '#dc2626' : p.triage_color === '黄' ? '#f59e0b' : p.triage_color === '緑' ? '#059669' : '#334155',
                                                    color: 'white'
                                                }}>
                                                    {p.triage_color}
                                                </span>
                                            </td>
                                            <td style={{ padding: pad }}>
                                                {reqCount > 0 ? (
                                                    <span style={{
                                                        fontSize: '0.72rem', fontWeight: 'bold', padding: '0.12rem 0.4rem', borderRadius: '4px',
                                                        backgroundColor: doneReqCount === reqCount ? 'rgba(16, 185, 129, 0.2)' : doneReqCount > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                                                        color: doneReqCount === reqCount ? '#34d399' : doneReqCount > 0 ? '#fbbf24' : '#94a3b8',
                                                    }}>
                                                        ⚙️ {doneReqCount}/{reqCount} 完了
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>なし</span>
                                                )}
                                            </td>
                                            <td style={{ padding: pad }}>
                                                {hasVitalsChange ? (
                                                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#60a5fa', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '0.12rem 0.4rem', borderRadius: '4px' }}>
                                                        📈 あり
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>なし</span>
                                                )}
                                            </td>
                                            <td style={{ padding: pad }}>
                                                {ttd.hasTTD ? (
                                                    ttd.isStabilized ? (
                                                        <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#34d399' }}>🛡️ 安定化済</span>
                                                    ) : ttd.isExpired ? (
                                                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#f87171' }}>🚨 悪化到達 (00:00)</span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#fb7185', fontFamily: 'monospace' }}>
                                                            ⏳ 残り {msToDisplay(ttd.remainingSec * 1000)}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>なし</span>
                                                )}
                                            </td>
                                            <td style={{ padding: pad, textAlign: 'center' }}>{p.triage_time_ms || doneTreatments.includes('triage') ? '✅' : '—'}</td>
                                            <td style={{ padding: pad, textAlign: 'center' }}>{p.initial_vs_time_ms || doneTreatments.includes('vitals') ? '✅' : '—'}</td>
                                            <td style={{ padding: pad, textAlign: 'center' }}>{p.post_vs_time_ms || doneReqCount === reqCount && reqCount > 0 ? '✅' : '—'}</td>
                                            <td style={{ padding: pad }}>
                                                <span style={{
                                                    display: 'inline-block', padding: '0.12rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600',
                                                    backgroundColor: p.status === '処置完了' ? 'rgba(59, 130, 246, 0.2)' : p.status === '処置中' ? 'rgba(245, 158, 11, 0.2)' :
                                                        p.status === 'アセスメント完了' ? 'rgba(16, 185, 129, 0.2)' : p.status === '悪化' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                                                    color: p.status === '処置完了' ? '#93c5fd' : p.status === '悪化' ? '#fca5a5' : p.status === '処置中' ? '#fcd34d' : p.status === 'アセスメント完了' ? '#6ee7b7' : '#cbd5e1',
                                                }}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ───────── 下部：Golden Hour Debriefing Gantt ＆ TEAM SCORE バッジ ───────── */}
            <div className="hq-bottom-deck">
                {/* 左：ゴールデンアワー・デブリーフィング・ガントチャート */}
                <div className="hq-gantt-card">
                    <div className="hq-gantt-card__header">
                        <div>
                            <h3 className="hq-gantt-card__title">Golden Hour Debriefing Gantt</h3>
                            <p className="hq-gantt-card__sub">患者別の処置フェーズ進行タイムラインと必須手技コンプリート状況</p>
                        </div>
                        <div className="hq-gantt-axis">
                            <span>0:00</span>
                            <span>5:00</span>
                            <span>10:00</span>
                            <span>15:00</span>
                            <span>20:00</span>
                            <span>25:00</span>
                            <span>30:00+</span>
                        </div>
                    </div>

                    <div className="hq-gantt-rows">
                        {summaryRows.slice(0, 8).map(({ p, idx, triageDelta, initialDelta, postDelta, deteriorated, reqCount, doneReqCount }) => {
                            const maxWindowMs = 30 * 60 * 1000 // 30分基準スケール
                            const startOffsetPct = triageDelta
                                ? Math.min(60, Math.round((triageDelta / maxWindowMs) * 100))
                                : (idx * 6) % 35
                            const durationWidthPct = postDelta
                                ? Math.max(18, Math.min(85 - startOffsetPct, Math.round(((postDelta - (triageDelta || 0)) / maxWindowMs) * 100) + 20))
                                : initialDelta
                                    ? 32
                                    : Math.max(15, Math.round(((doneReqCount + 1) / Math.max(reqCount + 1, 2)) * 55))

                            const barColor =
                                deteriorated ? 'linear-gradient(90deg, #dc2626, #f43f5e)' :
                                p.triage_color === '赤' ? 'linear-gradient(90deg, #ef4444, #f97316)' :
                                p.triage_color === '黄' ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' :
                                p.triage_color === '緑' ? 'linear-gradient(90deg, #10b981, #34d399)' :
                                'linear-gradient(90deg, #475569, #64748b)'

                            return (
                                <div key={p.id} className="hq-gantt-row">
                                    <div className="hq-gantt-row__patient">
                                        <span
                                            className="hq-gantt-row__tag"
                                            style={{
                                                background: p.triage_color === '赤' ? '#ef4444' : p.triage_color === '黄' ? '#f59e0b' : p.triage_color === '緑' ? '#10b981' : '#475569'
                                            }}
                                        />
                                        <span className="hq-gantt-row__name">{p.name || `患者No.${idx + 1}`}</span>
                                    </div>
                                    <div className="hq-gantt-row__track">
                                        <div
                                            className="hq-gantt-row__bar"
                                            style={{
                                                marginLeft: `${startOffsetPct}%`,
                                                width: `${durationWidthPct}%`,
                                                background: barColor,
                                            }}
                                        >
                                            <span>
                                                {deteriorated
                                                    ? '🚨 急変・悪化タイムライン'
                                                    : `Treatment Phases (${doneReqCount}/${reqCount})`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 右：TEAM SCORE S RANK バッジカード */}
                <div className="hq-score-card">
                    <div className="hq-score-card__label">TEAM SCORE:</div>
                    <div className={`hq-score-card__rank hq-score-card__rank--${teamRank.toLowerCase()}`}>
                        {teamRank} RANK
                    </div>
                    <div className="hq-score-card__survival">
                        （救命率 {survivalRatePct}%）
                    </div>
                    <div className="hq-score-card__metrics">
                        <div className="hq-score-card__metric-row">
                            <span>必須処置達成率</span>
                            <strong>{treatmentCompletionPct}% ({allDoneRequiredCount}/{allRequiredCount})</strong>
                        </div>
                        <div className="hq-score-card__metric-row">
                            <span>トリアージ実施率</span>
                            <strong>{pct(triageCount)}% ({triageCount}/{totalCount})</strong>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const csv = exportCSV(patients)
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `訓練ログ_${new Date().toISOString().slice(0, 10)}.csv`
                            a.click()
                            URL.revokeObjectURL(url)
                        }}
                        className="hq-btn hq-btn--outline"
                        style={{ width: '100%', marginTop: '0.75rem' }}
                    >
                        ↓ 訓練ログCSV出力
                    </button>
                </div>
            </div>

            {/* ───────── セッションサマリーモーダル ───────── */}
            {showSummary && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(8px)', zIndex: 9000,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    padding: '1rem', paddingBottom: '3rem', overflowY: 'auto'
                }}>
                    <div style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '16px', width: '100%', maxWidth: '760px', padding: '1.5rem', position: 'relative', margin: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
                        <button
                            onClick={() => setShowSummary(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}
                        >×</button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#f8fafc' }}>📋 災害対策本部 デブリーフィング・サマリー</h2>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                                    総訓練時間: {formattedTime} ／ 総患者数: {totalCount}名 ／ 総合評価: <strong style={{ color: '#fbbf24' }}>{teamRank} RANK (救命率 {survivalRatePct}%)</strong>
                                </p>
                            </div>
                        </div>

                        {/* 概況バー */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            {[
                                { label: 'トリアージ完了', v: triageCount, color: '#a78bfa' },
                                { label: '初期V/S済', v: initialVsCount, color: '#60a5fa' },
                                { label: '処置完了', v: postVsCount, color: '#34d399' },
                                { label: '急変・悪化', v: deterioratedCount, color: '#f87171' },
                            ].map(({ label, v, color }) => (
                                <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: '#1e293b', borderRadius: '8px', border: `1px solid ${color}44` }}>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{label}</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{v}<span style={{ fontSize: '0.75rem', color: '#64748b' }}>/{totalCount}</span></div>
                                </div>
                            ))}
                        </div>

                        {/* 患者別詳細テーブル */}
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#e2e8f0' }}>患者別パフォーマンス（受付からの経過時間）</h3>
                        <div style={{ overflowX: 'auto', maxHeight: '340px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', color: '#e2e8f0' }}>
                                <thead style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
                                    <tr>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', color: '#94a3b8' }}>患者名</th>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#c4b5fd' }}>T開始</th>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#93c5fd' }}>初期V/S</th>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#6ee7b7' }}>処置完了</th>
                                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#fca5a5' }}>状態</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryRows.map(({ p, triageDelta, initialDelta, postDelta, deteriorated }) => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #1e293b', background: deteriorated ? 'rgba(239, 68, 68, 0.12)' : 'transparent' }}>
                                            <td style={{ padding: '0.5rem 0.6rem', fontWeight: '500' }}>
                                                {deteriorated && <span style={{ color: '#f87171', marginRight: '4px' }}>⚠</span>}
                                                {p.name || `ID:${p.id}`}
                                                <span style={{
                                                    marginLeft: '6px', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '3px',
                                                    background: p.triage_color === '赤' ? '#dc2626' : p.triage_color === '黄' ? '#f59e0b' : p.triage_color === '緑' ? '#059669' : '#334155',
                                                    color: 'white'
                                                }}>{p.triage_color}</span>
                                            </td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#c4b5fd' }}>
                                                {triageDelta !== null ? msToMinSec(triageDelta) : '—'}
                                            </td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#93c5fd' }}>
                                                {initialDelta !== null ? msToMinSec(initialDelta) : '—'}
                                            </td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: '#6ee7b7' }}>
                                                {postDelta !== null ? msToMinSec(postDelta) : '—'}
                                            </td>
                                            <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                                                {deteriorated
                                                    ? <span style={{ color: '#f87171', fontWeight: 'bold' }}>悪化</span>
                                                    : <span style={{ color: '#64748b' }}>—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

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
                                className="hq-btn hq-btn--primary"
                            >
                                ↓ 訓練ログCSV出力
                            </button>
                            <button onClick={() => setShowSummary(false)} className="hq-btn hq-btn--secondary">
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
