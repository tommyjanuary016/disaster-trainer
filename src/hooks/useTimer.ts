// カウントダウンタイマーカスタムフック
// Firestoreに保存されたtimer_started_atをベースに残り時間を計算し、
// 複数端末間でタイマーを同期する
import { useState, useEffect } from 'react'
import { Patient } from '../types/patient'
import { completeTreatment } from '../lib/firestore'

interface UseTimerResult {
    isLocked: boolean      // 画面ロック中かどうか
    remainingMs: number    // 残り時間（ミリ秒）
    remainingDisplay: string // 表示用残り時間 MM:SS
    isCompleted: boolean   // タイマー完了済みかどうか
}

export function useTimer(patient: Patient | null): UseTimerResult {
    const [remainingMs, setRemainingMs] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)

    useEffect(() => {
        if (!patient) return

        // 処置中ステータスかつタイマー情報がある場合のみタイマー動作
        const isTimerActive =
            patient.status === '処置中' &&
            patient.timer_started_at !== null &&
            patient.timer_duration_ms !== null

        if (!isTimerActive) {
            setRemainingMs(0)
            setIsCompleted(false)
            return
        }

        const startedAt = patient.timer_started_at!
        const durationMs = patient.timer_duration_ms!
        const endAt = startedAt + durationMs

        // 初回計算
        const now = Date.now()
        const initial = Math.max(0, endAt - now)
        setRemainingMs(initial)

        if (initial === 0) {
            // すでに完了している場合
            handleTimerEnd(patient)
            return
        }

        // 1秒ごとに残り時間を更新
        const intervalId = setInterval(() => {
            const remaining = Math.max(0, endAt - Date.now())
            setRemainingMs(remaining)

            if (remaining === 0) {
                clearInterval(intervalId)
                handleTimerEnd(patient)
            }
        }, 1000)

        return () => clearInterval(intervalId)
    }, [patient?.status, patient?.timer_started_at, patient?.timer_duration_ms])

    async function handleTimerEnd(p: Patient) {
        // applied_treatment_id が required_treatments の中にあれば正解
        const isCorrect =
            (p.required_treatments ?? []).some(rt => rt.treatment_id === p.applied_treatment_id)

        try {
            await completeTreatment(p.id, isCorrect)
        } catch (e) {
            console.error('処置完了更新エラー:', e)
        }
        setIsCompleted(true)
    }

    // 表示用フォーマット (MM:SS)
    const minutes = Math.floor(remainingMs / 60000)
    const seconds = Math.floor((remainingMs % 60000) / 1000)
    const remainingDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    const isLocked = patient?.status === '処置中' && remainingMs > 0

    return { isLocked, remainingMs, remainingDisplay, isCompleted }
}
