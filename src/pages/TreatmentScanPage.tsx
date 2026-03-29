import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPatient, startTreatmentTimer } from '../lib/firestore'
import { Patient } from '../types/patient'
import { parseQRCode, ParsedQRCode } from '../types/qr'
import { getMedicalItemById } from '../data/items'
import { mockPatients } from '../data/mockData'
import QRConfirmModal from '../components/QRConfirmModal'

// 診察手技のIDリスト
const EXAM_IDS = ['head_and_neck', 'chest', 'abdomen_and_pelvis', 'limbs', 'fast', 'ample', 'background']

// 手技IDと表示名のマッピング
const PROCEDURE_NAMES: Record<string, string> = {
    vitals:             'バイタルサイン測定',
    head_and_neck:      '頭頸部診察',
    chest:              '胸部診察',
    abdomen_and_pelvis: '腹部・骨盤診察',
    limbs:              '四肢診察',
    fast:               'FAST',
    ample:              'AMPLE',
    background:         '背景聴取',
    diagnosis:          '診断',
}

// 全患者から動的に治療処置リストを生成（将来的な拡張に対応）
const allTreatmentsMap = new Map<string, string>()
const BASE_TREATMENTS = [
    { id: 'iv_access', name: 'ルート確保' },
    { id: 'oxygen', name: '酸素投与' },
    { id: 'pelvic_binder', name: '骨盤固定' },
    { id: 'tourniquet', name: '止血帯' },
    { id: 'cpr', name: 'CPR' },
]
BASE_TREATMENTS.forEach(t => allTreatmentsMap.set(t.id, t.name))
mockPatients.forEach(p => {
    p.required_treatments?.forEach(rt => {
        if (!allTreatmentsMap.has(rt.treatment_id)) {
            allTreatmentsMap.set(rt.treatment_id, rt.treatment_name)
        }
    })
})
const DYNAMIC_TREATMENTS = Array.from(allTreatmentsMap.entries()).map(([id, name]) => ({ id, name }))

const isTreatmentOption = (id: string) => {
    return id !== 'vitals' && id !== 'diagnosis' && !EXAM_IDS.includes(id)
}

interface ResolvedProcedure {
    treatment_id: string
    treatment_name: string
    defaultMinutes: number
    isCorrect: boolean
    /** QRの種別（手技QR / 物品QR） */
    qrType: 'procedure' | 'item'
    /** 物品QR の場合の物品名 */
    itemName?: string
}

const TreatmentScanPage: React.FC = () => {
    const { patientId } = useParams<{ patientId: string }>()
    const navigate = useNavigate()
    const [manualTreatmentId, setManualTreatmentId] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [patient, setPatient] = useState<Patient | null>(null)
    const [hasVitalsOrExams, setHasVitalsOrExams] = useState(false)

    // 確認モーダル用の状態
    const [pendingProcedure, setPendingProcedure] = useState<ResolvedProcedure | null>(null)
    const [pendingParsed, setPendingParsed] = useState<ParsedQRCode | null>(null)
    const [timerMinutes, setTimerMinutes] = useState<number>(0)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (patientId) {
            fetchPatient(parseInt(patientId)).then(p => {
                if (p) {
                    setPatient(p)
                    const done = p.completed_treatments?.some(
                        id => id === 'vitals' || EXAM_IDS.includes(id)
                    ) || false
                    setHasVitalsOrExams(done)
                }
            })
        }
    }, [patientId])

    useEffect(() => {
        if (showModal) return // モーダル表示中はスキャナーを起動しない

        const scanner = new Html5QrcodeScanner(
            'treatment-reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        )

        scanner.render(
            (decodedText) => {
                handleScan(decodedText)
                scanner.clear()
            },
            () => {
                // スキャン中のエラーは無視
            }
        )

        return () => {
            scanner.clear().catch(e => console.error('Error clearing scanner', e))
        }
    }, [patientId, showModal, hasVitalsOrExams])

    /** QR文字列をパースして手技として解決する */
    const resolveQR = (text: string): { resolved: ResolvedProcedure; parsed: ParsedQRCode } | null => {
        const parsed = parseQRCode(text)
        if (!parsed) return null

        let treatmentId: string
        let qrType: 'procedure' | 'item' = 'procedure'
        let itemName: string | undefined

        if (parsed.type === 'procedure') {
            treatmentId = parsed.id
        } else if (parsed.type === 'item') {
            const item = getMedicalItemById(parsed.id)
            if (!item) return null
            treatmentId = item.maps_to_treatment_id
            qrType = 'item'
            itemName = item.name
        } else {
            return null // 患者QRは処置スキャン画面では無効
        }

        // 手技名を決定
        let treatmentName = PROCEDURE_NAMES[treatmentId] ?? '各種処置'
        let initialMinutes = 5

        if (patient) {
            const matched = patient.required_treatments?.find(rt => rt.treatment_id === treatmentId)
            if (matched) {
                treatmentName = matched.treatment_name
                initialMinutes = matched.lock_timer_minutes
            } else {
                const found = DYNAMIC_TREATMENTS.find(t => t.id === treatmentId)
                if (found) treatmentName = found.name
            }
        }

        return {
            parsed,
            resolved: {
                treatment_id: treatmentId,
                treatment_name: treatmentName,
                defaultMinutes: initialMinutes,
                isCorrect: !!patient?.required_treatments?.find(rt => rt.treatment_id === treatmentId),
                qrType,
                itemName,
            },
        }
    }

    const handleScan = (text: string) => {
        if (!patient) return
        const result = resolveQR(text)

        if (!result) {
            setError('無効なQRコードです。手技QRまたは物品QRを読み取ってください。')
            return
        }

        const { resolved, parsed } = result

        // 治療処置の場合、バイタル・診察未実施ならブロック
        if (isTreatmentOption(resolved.treatment_id) && !hasVitalsOrExams) {
            setError('※ 治療処置を実施する前に、バイタルサイン測定または診察手技を行ってください。')
            return
        }

        setError(null)
        setPendingProcedure(resolved)
        setPendingParsed(parsed)
        setTimerMinutes(resolved.defaultMinutes)
        setShowModal(true)
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualTreatmentId) {
            handleScan(`procedure:${manualTreatmentId}`)
        }
    }

    const handleConfirm = async () => {
        if (!patientId || !pendingProcedure) return
        await startTreatmentTimer(parseInt(patientId), pendingProcedure.treatment_id, timerMinutes)
        navigate(`/patient/${patientId}`)
    }

    const handleCancel = () => {
        setShowModal(false)
        setPendingProcedure(null)
        setPendingParsed(null)
        setManualTreatmentId('')
        setError(null)
    }

    return (
        <div className="page treatment-scan-page">
            {/* QR確認モーダル */}
            {showModal && pendingParsed && pendingProcedure && (
                <QRConfirmModal
                    parsed={pendingParsed}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}

            <header className="treatment-header">
                <div className="treatment-header__label">TREATMENT FOR</div>
                <h1 className="treatment-header__name">
                    {patient ? `${Math.floor(patient.age / 10) * 10}代 ${patient.gender === 'M' ? '男性' : '女性'}` : '読み込み中...'}
                </h1>
            </header>

            <main className="page__content">
                {/* タイマー時間調整（モーダルは上に出るが、念のため確認後の調整UIも残す） */}
                {showModal && pendingProcedure && (
                    <div className="card card--elevated" style={{ marginBottom: '1rem' }}>
                        <div className="timer-input-wrapper">
                            <label className="timer-input-label">拘束時間（分）を変更できます</label>
                            <input
                                type="number"
                                value={timerMinutes}
                                onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 0)}
                                className="timer-input"
                                min="0"
                            />
                        </div>
                    </div>
                )}

                <>
                    <p className="instruction-text">手技QRまたは物品QRコードをスキャンしてください。</p>

                    <div className="qr-reader-wrapper">
                        <div id="treatment-reader" className="qr-reader custom-qr-scanner"></div>
                    </div>

                    {error && (
                        <div className="error-message" style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                            {error}
                        </div>
                    )}

                    <div className="divider">
                        <span>OR</span>
                    </div>

                    <div className="manual-entry">
                        <form onSubmit={handleManualSubmit} className="manual-entry__form">
                            <div className="form-group">
                                <label>手技・処置選択</label>
                                <select
                                    className="input"
                                    value={manualTreatmentId}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setManualTreatmentId(val)
                                        if (val && isTreatmentOption(val) && !hasVitalsOrExams) {
                                            setError('※ 治療処置を実施する前に、バイタルサイン測定または診察手技を行ってください。')
                                            setManualTreatmentId('')
                                        } else {
                                            setError(null)
                                        }
                                    }}
                                >
                                    <option value="">-- 手技を選択 --</option>

                                    <optgroup label="バイタル">
                                        <option value="vitals">バイタルサイン測定</option>
                                    </optgroup>

                                    <optgroup label="診察手技">
                                        <option value="head_and_neck">頭頸部診察</option>
                                        <option value="chest">胸部診察</option>
                                        <option value="abdomen_and_pelvis">腹部・骨盤診察</option>
                                        <option value="limbs">四肢診察</option>
                                        <option value="fast">FAST</option>
                                        <option value="ample">AMPLE</option>
                                        <option value="background">背景聴取</option>
                                    </optgroup>

                                    <optgroup label="治療処置（※要バイタル/診察）" disabled={!hasVitalsOrExams}>
                                        {DYNAMIC_TREATMENTS.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                                {!hasVitalsOrExams && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                                        ※ 治療処置はバイタルまたは診察を実施後に選択可能になります。
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="button button--primary"
                                disabled={!manualTreatmentId}
                            >
                                確認
                            </button>
                        </form>
                    </div>

                    <div className="actions">
                        <button
                            className="button button--secondary"
                            onClick={() => navigate(`/patient/${patientId}`)}
                        >
                            キャンセル
                        </button>
                    </div>
                </>
            </main>
        </div>
    )
}

export default TreatmentScanPage
