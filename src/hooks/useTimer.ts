// カウントダウンタイマーカスタムフック
// 診療エリアの複数人同時アクションに対応し、自端末が開始したアクションのみ画面ロックする
import { useState, useEffect, useRef } from 'react'
import { Patient, TrainingSession, ActiveTreatment } from '../types/patient'
import {
    completeTreatment,
    getMyActiveAction,
    clearMyActiveAction,
    subscribeToTrainingSession,
    activeSessionId,
} from '../lib/firestore'

interface UseTimerResult {
    isLocked: boolean          // 自端末の操作ロック中かどうか
    remainingMs: number        // 自端末アクションの残り時間（ミリ秒）
    remainingDisplay: string   // 表示用残り時間 MM:SS
    isCompleted: boolean       // タイマー完了済みかどうか
    myTreatmentId: string | null // 自端末が実行中の手技ID
    isPaused: boolean          // セッション一時停止中かどうか
}

export function useTimer(patient: Patient | null): UseTimerResult {
    const [remainingMs, setRemainingMs] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)
    const [myTreatmentId, setMyTreatmentId] = useState<string | null>(null)
    const [session, setSession] = useState<TrainingSession | null>(null)
    const completingIdsRef = useRef<Set<string>>(new Set())

    const targetSessionId = patient?.session_id || activeSessionId

    // セッション状態（一時停止・再開）を購読
    useEffect(() => {
        if (!targetSessionId) {
            setSession(null)
            return
        }
        const unsub = subscribeToTrainingSession(targetSessionId, (s) => {
            setSession(s)
        })
        return () => unsub()
    }, [targetSessionId])

    const isPaused = session?.status === 'paused'

    useEffect(() => {
        if (!patient) return

        const evaluate = () => {
            const now = isPaused && session?.pausedAtMs ? session.pausedAtMs : Date.now()

            // 1. 患者上の全進行中アクション（他人の分も含む）を確認し、満了分をサーバー完了させる
            const serverActives: ActiveTreatment[] =
                patient.active_treatments && patient.active_treatments.length > 0
                    ? patient.active_treatments
                    : (patient.status === '処置中' &&
                       patient.timer_started_at != null &&
                       patient.timer_duration_ms != null &&
                       patient.applied_treatment_id)
                        ? [{
                            action_id: `legacy_${patient.timer_started_at}`,
                            treatment_id: patient.applied_treatment_id,
                            started_at: patient.timer_started_at,
                            duration_ms: patient.timer_duration_ms,
                        }]
                        : []

            if (!isPaused && serverActives.length > 0) {
                const expiredServer = serverActives.filter(at => now >= at.started_at + at.duration_ms)
                if (expiredServer.length > 0) {
                    const expiredIds = expiredServer.map(at => at.action_id)
                    const notYetCompleting = expiredIds.filter(id => !completingIdsRef.current.has(id))
                    if (notYetCompleting.length > 0) {
                        notYetCompleting.forEach(id => completingIdsRef.current.add(id))
                        completeTreatment(patient.id, true, notYetCompleting)
                            .catch(e => console.error('処置完了更新エラー:', e))
                            .finally(() => {
                                setTimeout(() => {
                                    notYetCompleting.forEach(id => completingIdsRef.current.delete(id))
                                }, 3000)
                            })
                    }
                }
            }

            // 2. この端末自身が開始したアクションを取得（自端末ロック判定）
            const localMy = getMyActiveAction(patient.id)
            if (!localMy) {
                setRemainingMs(0)
                setMyTreatmentId(null)
                setIsCompleted(false)
                return
            }

            // サーバー側に一致する action_id があればそちらの最新タイムスタンプを使用（再開時の時間スライド反映）
            const matchedServer = serverActives.find(at => at.action_id === localMy.action_id)
            const activeMy = matchedServer || localMy

            // すでにサーバー側の completed_treatments に移っており active_treatments から消えている場合
            // （開始直後のラグを除き、サーバー側 active_treatments が明示的に更新済みで存在しないとき）
            const ageSinceStart = Date.now() - activeMy.started_at
            if (
                !matchedServer &&
                Array.isArray(patient.active_treatments) &&
                ageSinceStart > 2500 &&
                (patient.completed_treatments || []).includes(activeMy.treatment_id)
            ) {
                clearMyActiveAction(patient.id, activeMy.action_id)
                setRemainingMs(0)
                setMyTreatmentId(null)
                setIsCompleted(true)
                return
            }

            const endAt = activeMy.started_at + activeMy.duration_ms
            const rem = Math.max(0, endAt - now)
            setMyTreatmentId(activeMy.treatment_id)
            setRemainingMs(rem)

            if (rem === 0 && !isPaused) {
                clearMyActiveAction(patient.id, activeMy.action_id)
                setIsCompleted(true)
                if (!completingIdsRef.current.has(activeMy.action_id)) {
                    completingIdsRef.current.add(activeMy.action_id)
                    completeTreatment(patient.id, true, activeMy.action_id)
                        .catch(e => console.error('自端末処置完了更新エラー:', e))
                        .finally(() => {
                            setTimeout(() => completingIdsRef.current.delete(activeMy.action_id), 3000)
                        })
                }
            } else {
                setIsCompleted(false)
            }
        }

        evaluate()
        const intervalId = setInterval(evaluate, 1000)
        return () => clearInterval(intervalId)
    }, [
        patient?.id,
        patient?.status,
        patient?.timer_started_at,
        patient?.timer_duration_ms,
        patient?.active_treatments,
        patient?.completed_treatments,
        isPaused,
        session?.pausedAtMs,
    ])

    const minutes = Math.floor(remainingMs / 60000)
    const seconds = Math.floor((remainingMs % 60000) / 1000)
    const remainingDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    const isLocked = myTreatmentId !== null && remainingMs > 0

    return { isLocked, remainingMs, remainingDisplay, isCompleted, myTreatmentId, isPaused }
}
