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

export function formatVitals(vitals: VitalSignStruct): string {
    const hasGCS = vitals.gcs_e !== undefined || vitals.gcs_v !== undefined || vitals.gcs_m !== undefined
    const gcsTotal = (vitals.gcs_e || 0) + (vitals.gcs_v || 0) + (vitals.gcs_m || 0)
    const gcsStr = hasGCS ? `\n・GCS: E${vitals.gcs_e}V${vitals.gcs_v}M${vitals.gcs_m} (${gcsTotal})` : ''
    return `・BP: ${vitals.sbp}/${vitals.dbp}\n・HR：${vitals.hr}\n・R:${vitals.rr}\n・SPO2:${vitals.spo2}%\n・KT:${vitals.temp.toFixed(1)}${gcsStr}`
}

/** バイタルがCPA（心肺停止状態）に該当するか判定する */
export function isCpaVitals(vitals?: VitalSignStruct | null): boolean {
    if (!vitals) return false
    return vitals.hr === 0 || vitals.sbp === 0 || (vitals.sbp < 40 && vitals.hr < 30)
}

/**
 * 任意の時刻における患者の計算バイタル・悪化度合い・CPA状態を取得する純粋関数
 */
export function computeCurrentPatientVitals(patient: Patient, nowMs: number = Date.now()): {
    vitalsStruct: VitalSignStruct | null
    vitalsText: string
    isCpa: boolean
    isStabilized: boolean
    progressPercent: number
} {
    // 1. 搬出・転帰が既に確定している場合は、確定時のデータをそのまま返す
    if (patient.disposition) {
        const struct = patient.disposition.final_vitals || patient.vitals_initial_struct || null
        const text = patient.disposition.final_vitals_text || (struct ? formatVitals(struct) : '搬出完了')
        return {
            vitalsStruct: struct,
            vitalsText: text,
            isCpa: patient.disposition.is_cpa_at_disposition,
            isStabilized: patient.disposition.is_stabilized,
            progressPercent: patient.disposition.is_cpa_at_disposition ? 100 : 0
        }
    }

    const completed = patient.completed_treatments || []
    const requiredIds = patient.required_treatments?.map(rt => rt.treatment_id) || []
    const allRequiredMet = requiredIds.length > 0 && requiredIds.every(id => completed.includes(id))
    const isStabilized = Boolean(patient.stabilization_completed || allRequiredMet)

    // 2. ROSC（心拍再開）
    const roscReady = patient.rosc_possible && completed.includes('cpr') && (requiredIds.length === 0 || allRequiredMet)
    if (roscReady && patient.vitals_rosc_struct) {
        const rosc = patient.vitals_rosc_struct
        return {
            vitalsStruct: rosc,
            vitalsText: `${formatVitals(rosc)}\n(※ROSC 心拍再開)`,
            isCpa: false,
            isStabilized: true,
            progressPercent: 100
        }
    }

    const deteriorationTarget = patient.vitals_deterioration_struct || patient.vitals_post_struct

    // 3. 悪化無効 or 必要データなし or 安定化処置完了
    if (
        !patient.deterioration_enabled ||
        !patient.vitals_initial_struct ||
        !deteriorationTarget ||
        !patient.deterioration_time_minutes ||
        !patient.reception_time_ms ||
        isStabilized
    ) {
        const baseStruct = patient.vitals_initial_struct || null
        const baseText = baseStruct ? formatVitals(baseStruct) : (patient.vitals_initial || 'バイタルデータなし')
        return {
            vitalsStruct: baseStruct,
            vitalsText: baseText,
            isCpa: isCpaVitals(baseStruct),
            isStabilized,
            progressPercent: 0
        }
    }

    // 4. 線形悪化の進行度計算
    const durationMs = patient.deterioration_time_minutes * 60 * 1000
    const startMs = patient.reception_time_ms
    const elapsed = Math.max(0, nowMs - startMs)
    let progress = elapsed / durationMs

    if (progress >= 1) {
        return {
            vitalsStruct: deteriorationTarget,
            vitalsText: formatVitals(deteriorationTarget),
            isCpa: isCpaVitals(deteriorationTarget),
            isStabilized: false,
            progressPercent: 100
        }
    }

    const init = patient.vitals_initial_struct
    const post = deteriorationTarget
    const currentStruct: VitalSignStruct = {
        sbp:  interpolateLimit(init.sbp, post.sbp, progress),
        dbp:  interpolateLimit(init.dbp, post.dbp, progress),
        hr:   interpolateLimit(init.hr, post.hr, progress),
        rr:   interpolateLimit(init.rr, post.rr, progress),
        spo2: interpolateLimit(init.spo2, post.spo2, progress),
        temp: Number((init.temp + (post.temp - init.temp) * progress).toFixed(1)),
        gcs_e: init.gcs_e !== undefined && post.gcs_e !== undefined
            ? Math.max(1, Math.min(4, Math.round(init.gcs_e + (post.gcs_e - init.gcs_e) * progress)))
            : init.gcs_e,
        gcs_v: init.gcs_v !== undefined && post.gcs_v !== undefined
            ? Math.max(1, Math.min(5, Math.round(init.gcs_v + (post.gcs_v - init.gcs_v) * progress)))
            : init.gcs_v,
        gcs_m: init.gcs_m !== undefined && post.gcs_m !== undefined
            ? Math.max(1, Math.min(6, Math.round(init.gcs_m + (post.gcs_m - init.gcs_m) * progress)))
            : init.gcs_m,
    }

    return {
        vitalsStruct: currentStruct,
        vitalsText: formatVitals(currentStruct),
        isCpa: isCpaVitals(currentStruct),
        isStabilized: false,
        progressPercent: Math.round(progress * 100)
    }
}

export function useDeterioration(patient: Patient | null): DeteriorationResult {
    const [currentVitalsText, setCurrentVitalsText] = useState('')
    const [currentVitalsStruct, setCurrentVitalsStruct] = useState<VitalSignStruct | null>(null)
    const [progressPercent, setProgressPercent] = useState(0)
    const [isDeteriorating, setIsDeteriorating] = useState(false)

    useEffect(() => {
        if (!patient) return

        // ── 搬出・転帰（Disposition）確定済みの場合はバイタルと悪化タイマーを完全停止 ──
        if (patient.disposition) {
            const finalStruct = patient.disposition.final_vitals || patient.vitals_initial_struct || null
            const finalText = patient.disposition.final_vitals_text || (finalStruct ? formatVitals(finalStruct) : '搬出完了')
            setCurrentVitalsText(finalText)
            setCurrentVitalsStruct(finalStruct)
            setProgressPercent(patient.disposition.is_cpa_at_disposition ? 100 : 0)
            setIsDeteriorating(false)
            return
        }

        const completed = patient.completed_treatments || []
        const hasVitals = completed.includes('vitals')
        const hasTriage = completed.includes('triage')

        // ── トリアージV/Sのみ完了時の処理 ──
        if (!hasVitals && hasTriage) {
            setCurrentVitalsText(patient.vitals_triage_struct
                ? formatVitals(patient.vitals_triage_struct)
                : patient.vitals_triage || 'トリアージバイタルデータなし'
            )
            setCurrentVitalsStruct(patient.vitals_triage_struct || null)
            setProgressPercent(0)
            setIsDeteriorating(false)
            return
        }

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

        // ── 安定化完了（必須処置が全て終わった）場合でも「処置完了後V/S」は自動表示しない ──
        // ※プレイヤーが自らバイタルサインを再測定（vitals手技を実施）するまで自動反映させない
        // したがって、安定化完了による強制 vitals_post_struct 切り替え処理を削除

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
                gcs_e: init.gcs_e !== undefined && post.gcs_e !== undefined
                    ? Math.max(1, Math.min(4, Math.round(init.gcs_e + (post.gcs_e - init.gcs_e) * progress)))
                    : init.gcs_e,
                gcs_v: init.gcs_v !== undefined && post.gcs_v !== undefined
                    ? Math.max(1, Math.min(5, Math.round(init.gcs_v + (post.gcs_v - init.gcs_v) * progress)))
                    : init.gcs_v,
                gcs_m: init.gcs_m !== undefined && post.gcs_m !== undefined
                    ? Math.max(1, Math.min(6, Math.round(init.gcs_m + (post.gcs_m - init.gcs_m) * progress)))
                    : init.gcs_m,
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
    }, [patient])

    return { currentVitalsText, currentVitalsStruct, progressPercent, isDeteriorating }
}
