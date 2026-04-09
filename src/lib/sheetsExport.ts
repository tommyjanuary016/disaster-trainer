import { Patient } from '../types/patient'

export async function exportToGoogleSheets(webhookUrl: string, patients: Patient[]): Promise<boolean> {
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            patients: patients.map(p => ({
                id: p.id,
                name: p.name,
                triageColor: p.triage_color,
                diagnosis: p.diagnosis,
                status: p.status,
                appliedTreatment: p.applied_treatment_id || '',
                completedTreatments: p.completed_treatments?.join(', ') || ''
            }))
        }

        // GAS Web App へ POST データ送信
        await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors', // クロスオリジン回避のため
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        // no-cors通信ではレスポンス内容を読み取れないため、例外が発生しなければ成功とみなす
        return true
    } catch (error) {
        console.error('Google Sheets へのエクスポートに失敗しました:', error)
        return false
    }
}
