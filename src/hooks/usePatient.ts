// 患者データをFirestoreからリアルタイム購読するカスタムフック
import { useState, useEffect } from 'react'
import { Patient } from '../types/patient'
import { subscribeToPatient, fetchPatient } from '../lib/firestore'

interface UsePatientResult {
    patient: Patient | null
    loading: boolean
    error: string | null
}

export function usePatient(patientId: number | null): UsePatientResult {
    const [patient, setPatient] = useState<Patient | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (patientId === null) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        let isMounted = true

        // マウント時に即座に最新データをダイレクト取得（ナビゲーション後の反映遅延対策）
        fetchPatient(patientId).then((fresh: Patient | null) => {
            if (isMounted && fresh) {
                setPatient(fresh)
                setLoading(false)
            }
        }).catch((e: unknown) => console.error(e))

        try {
            const unsubscribe = subscribeToPatient(patientId, (data) => {
                if (isMounted) {
                    setPatient(data)
                    setLoading(false)
                }
            })

            return () => {
                isMounted = false
                unsubscribe()
            }
        } catch (e) {
            setError('患者データの取得に失敗しました')
            setLoading(false)
        }
    }, [patientId])

    return { patient, loading, error }
}
