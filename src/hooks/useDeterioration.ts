import { useState, useEffect } from 'react'
import { Patient, VitalSignStruct } from '../types/patient'

interface DeteriorationResult {
    currentVitalsText: string
    progressPercent: number
    isDeteriorating: boolean
}

// 経過時間に応じた現在値を計算する
function interpolateLimit(start: number, end: number, progress: number): number {
    return Math.round(start + (end - start) * progress)
}

function formatVitals(vitals: VitalSignStruct): string {
    return `・BP: ${vitals.sbp}/${vitals.dbp}\n・HR：${vitals.hr}\n・R:${vitals.rr}\n・SPO2:${vitals.spo2}%\n・KT:${vitals.temp.toFixed(1)}`
}

export function useDeterioration(patient: Patient | null): DeteriorationResult {
    const [currentVitalsText, setCurrentVitalsText] = useState('')
    const [progressPercent, setProgressPercent] = useState(0)
    const [isDeteriorating, setIsDeteriorating] = useState(false)

    useEffect(() => {
        if (!patient) return

        // ROSC（心拍再開）の判定: CPRが完了し、ROSC可能フラグがONの場合
        if (patient.rosc_possible && patient.completed_treatments?.includes('cpr') && patient.vitals_rosc_struct) {
            const baseTextRows = patient.vitals_initial?.split('\n') || []
            const gcsRow = baseTextRows.find(row => row.toUpperCase().includes('GCS')) || 'GCS:測定不能'
            setCurrentVitalsText(`${gcsRow}\n${formatVitals(patient.vitals_rosc_struct)}\n(※ROSC 心拍再開)`)
            setProgressPercent(100)
            setIsDeteriorating(false)
            return
        }

        // 全必須処置完了（安定化）している場合は「処置後V/S」を固定表示
        if (patient.stabilization_completed) {
            setCurrentVitalsText(patient.vitals_post)
            setProgressPercent(100)
            setIsDeteriorating(false)
            return
        }

        // 線形悪化設定がOFF、あるいは設定値が不足している場合は初期値をそのまま表示
        if (
            !patient.deterioration_enabled ||
            !patient.vitals_initial_struct ||
            !patient.vitals_post_struct ||
            !patient.deterioration_time_minutes ||
            !patient.reception_time_ms
        ) {
            setCurrentVitalsText(patient.vitals_initial)
            setProgressPercent(0)
            setIsDeteriorating(false)
            return
        }

        const durationMs = patient.deterioration_time_minutes * 60 * 1000
        const startMs = patient.reception_time_ms

        const updateTimer = () => {
            const now = Date.now()
            const elapsed = Math.max(0, now - startMs)
            
            // 進行度合い (0.0 〜 1.0)
            let progress = elapsed / durationMs
            if (progress >= 1) {
                progress = 1
                setCurrentVitalsText(patient.vitals_post) // 完全悪化後は最終テキストをそのまま
                setProgressPercent(100)
                setIsDeteriorating(false)
                return
            }

            // 線形補間
            const init = patient.vitals_initial_struct!
            const post = patient.vitals_post_struct!

            const currentStruct: VitalSignStruct = {
                sbp: interpolateLimit(init.sbp, post.sbp, progress),
                dbp: interpolateLimit(init.dbp, post.dbp, progress),
                hr: interpolateLimit(init.hr, post.hr, progress),
                rr: interpolateLimit(init.rr, post.rr, progress),
                spo2: interpolateLimit(init.spo2, post.spo2, progress),
                temp: Number((init.temp + (post.temp - init.temp) * progress).toFixed(1))
            }

            // GCSなどテキスト部分は初期状態のものを引き継ぎつつ、数値を置き換えるための簡易フォーマット
            const baseTextRows = patient.vitals_initial.split('\n')
            const gcsRow = baseTextRows.find(row => row.toUpperCase().includes('GCS')) || 'GCS:測定不能'
            
            const newText = `${gcsRow}\n${formatVitals(currentStruct)}`

            setCurrentVitalsText(newText)
            setProgressPercent(Math.round(progress * 100))
            setIsDeteriorating(true)
        }

        // 即時実行
        updateTimer()

        // 1秒ごとに更新（1000ms）
        const intervalId = setInterval(updateTimer, 1000)

        return () => clearInterval(intervalId)

    }, [
        patient?.reception_time_ms,
        patient?.deterioration_time_minutes,
        patient?.stabilization_completed,
        // structオブジェクトの参照が変わると再計算になるため、文字列化して依存関係に入れるのが安全ですが、
        // 今回の運用上はpatientオブジェクト自体の変動で捕捉できるため省略
        patient?.status,
        patient?.completed_treatments?.length // CPR完了などのトリガーを検知するため
    ])

    return { currentVitalsText, progressPercent, isDeteriorating }
}
