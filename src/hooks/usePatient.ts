// 患者データをFirestoreからリアルタイム購読するカスタムフック
import { useState, useEffect } from 'react'
import { Patient } from '../types/patient'
import { subscribeToPatient } from '../lib/firestore'

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

        try {
            const unsubscribe = subscribeToPatient(patientId, (data) => {
                setPatient(data)
                setLoading(false)
            })

            return () => unsubscribe()
        } catch (e) {
            setError('患者データの取得に失敗しました')
            setLoading(false)
        }
    }, [patientId])

    return { patient, loading, error }
}
