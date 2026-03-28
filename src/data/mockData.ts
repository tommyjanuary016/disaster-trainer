import { Patient } from '../types/patient'
import { mockPatients as generatedPatients } from './mockPatients'

export const mockPatients: Patient[] = generatedPatients

// IDで患者を検索するヘルパー
export function getMockPatientById(id: number): Patient | undefined {
    return mockPatients.find((p) => p.id === id)
}
