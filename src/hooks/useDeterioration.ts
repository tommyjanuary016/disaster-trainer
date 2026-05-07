import { useState, useEffect } from 'react'
import { Patient, VitalSignStruct } from '../types/patient'

interface DeteriorationResult {
    currentVitalsText: string
    currentVitalsStruct: VitalSignStruct | null
    progressPercent: number
    isDeteriorating: boolean
}

// 経過時間に応じた現在値を計算する
function interpolateLimit(start: number, end: number, progress: number): number {
    return Math.round(start + (end - start) * progress)
}

function formatVitals(vitals: VitalSignStruct): string {
    const jcsStr = vitals.jcs !== undefined ? `\n・JCS: ${vitals.jcs}` : ''
    return `・BP: ${vitals.sbp}/${vitals.dbp}\n・HR：${vitals.hr}\n・R:${vitals.rr}\n・SPO2:${vitals.spo2}%\n・KT:${vitals.temp.toFixed(1)}${jcsStr}`
}

export function useDeterioration(patient: Patient | null): DeteriorationResult {
    const [currentVitalsText, setCurrentVitalsText] = useState('')
    const [currentVitalsStruct, setCurrentVitalsStruct] = useState<VitalSignStruct | null>(null)
    const [progressPercent, setProgressPercent] = useState(0)
    const [isDeteriorating, setIsDeteriorating] = useState(false)

    useEffect(() => {
        if (!patient) return

        const completed = patient.completed_treatments || []

        // ── ROSC（心拍再開）の判定 ──
        // ROSC可能フラグがON、かつCPR完了、かつ患者の必須処置が全て完了している場合
        const requiredIds = patient.required_treatments?.map(rt => rt.treatment_id) || []
        const allRequiredMet = requiredIds.length === 0 || requiredIds.every(id => completed.includes(id))
        const roscReady = patient.rosc_possible && completed.includes('cpr') && allRequiredMet

        if (roscReady && patient.vitals_rosc_struct) {
            const rosc = patient.vitals_rosc_struct
            setCurrentVitalsText(`${formatVitals(rosc)}\n(※ROSC 心拍再開)`)
            setCurrentVitalsStruct(rosc)
            setProgressPercent(100)
            setIsDeteriorating(false)
            return
        }

        // ── 安定化完了（必須処置が全て終わった）場合は「処置完了後V/S」を固定表示 ──
        if (patient.stabilization_completed && patient.vitals_post_struct) {
            setCurrentVitalsText(formatVitals(patient.vitals_post_struct))
            setCurrentVitalsStruct(patient.vitals_post_struct)
            setProgressPercent(100)
            setIsDeteriorating(false)
            return
        }

        // ── 悪化設定がOFF or 必要なstruct/設定値が不足している場合 ──
        // 悪化到達バイタルは vitals_deterioration_struct を使う（旧: vitals_post_struct）
        const deteriorationTarget = patient.vitals_deterioration_struct || patient.vitals_post_struct

        if (
            !patient.deterioration_enabled ||
            !patient.vitals_initial_struct ||
            !deteriorationTarget ||
            !patient.deterioration_time_minutes ||
            !patient.reception_time_ms
        ) {
            setCurrentVitalsText(patient.vitals_initial_struct
                ? formatVitals(patient.vitals_initial_struct)
                : patient.vitals_initial
            )
            setCurrentVitalsStruct(patient.vitals_initial_struct || null)
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
                setCurrentVitalsText(formatVitals(deteriorationTarget))
                setCurrentVitalsStruct(deteriorationTarget)
                setProgressPercent(100)
                setIsDeteriorating(false)
                return
            }

            // 線形補間
            const init = patient.vitals_initial_struct!
            const post = deteriorationTarget

            const currentStruct: VitalSignStruct = {
                sbp:  interpolateLimit(init.sbp, post.sbp, progress),
                dbp:  interpolateLimit(init.dbp, post.dbp, progress),
                hr:   interpolateLimit(init.hr, post.hr, progress),
                rr:   interpolateLimit(init.rr, post.rr, progress),
                spo2: interpolateLimit(init.spo2, post.spo2, progress),
                temp: Number((init.temp + (post.temp - init.temp) * progress).toFixed(1)),
                jcs:  init.jcs !== undefined && post.jcs !== undefined
                    ? interpolateJCS(init.jcs, post.jcs, progress)
                    : init.jcs,
            }
            
            setCurrentVitalsStruct(currentStruct)
            setCurrentVitalsText(formatVitals(currentStruct))
            setProgressPercent(Math.round(progress * 100))
            setIsDeteriorating(true)
        }

        // 即時実行
        updateTimer()

        // 1秒ごとに更新
        const intervalId = setInterval(updateTimer, 1000)

        return () => clearInterval(intervalId)

    }, [
        patient?.reception_time_ms,
        patient?.deterioration_time_minutes,
        patient?.stabilization_completed,
        patient?.status,
        patient?.completed_treatments?.length, // CPR完了などのトリガーを検知するため
        patient?.rosc_possible,
    ])

    return { currentVitalsText, currentVitalsStruct, progressPercent, isDeteriorating }
}

/**
 * JCSスケールの離散値リスト（補間時に最も近い値にスナップ）
 * JCS: [0, 1, 2, 3, 10, 20, 30, 100, 200, 300]
 */
const JCS_SCALE = [0, 1, 2, 3, 10, 20, 30, 100, 200, 300]

function interpolateJCS(start: number, end: number, progress: number): number {
    const raw = start + (end - start) * progress
    // 最も近いJCS値にスナップ
    return JCS_SCALE.reduce((prev, curr) =>
        Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev
    )
}
