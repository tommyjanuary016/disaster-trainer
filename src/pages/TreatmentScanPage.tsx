import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPatient, startTreatmentTimer } from '../lib/firestore'
import { Patient } from '../types/patient'
import { mockPatients } from '../data/mockData'

interface SelectedTreatment {
    id: string
    name: string
    defaultMinutes: number
    isCorrect: boolean
}

// 診察手技のIDリスト
const EXAM_IDS = ['head_and_neck', 'chest', 'abdomen_and_pelvis', 'limbs', 'fast', 'ample', 'background']

// 全患者から動的に治療処置リストを生成（将来的な拡張に対応）
const allTreatmentsMap = new Map<string, string>()
// 共通のダミーやベースとなる処置を先に追加
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
        // まだ登録されていなければ追加（既存のものがある場合は上書きしない）
        if (!allTreatmentsMap.has(rt.treatment_id)) {
            // 長すぎる処置名は少し短くするなどの工夫も可能だが、今回はそのまま登録
            allTreatmentsMap.set(rt.treatment_id, rt.treatment_name)
        }
    })
})
const DYNAMIC_TREATMENTS = Array.from(allTreatmentsMap.entries()).map(([id, name]) => ({ id, name }))

const isTreatmentOption = (id: string) => {
    return id !== 'vitals' && id !== 'diagnosis' && !EXAM_IDS.includes(id)
}

const TreatmentScanPage: React.FC = () => {
    const { patientId } = useParams<{ patientId: string }>()
    const navigate = useNavigate()
    const [manualTreatmentId, setManualTreatmentId] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [patient, setPatient] = useState<Patient | null>(null)
    const [selectedTreatment, setSelectedTreatment] = useState<SelectedTreatment | null>(null)
    const [timerMinutes, setTimerMinutes] = useState<number>(0)
    const [hasVitalsOrExams, setHasVitalsOrExams] = useState(false)

    useEffect(() => {
        if (patientId) {
            fetchPatient(parseInt(patientId)).then(p => {
                if (p) {
                    setPatient(p)
                    // バイタルサイン測定または診察手技のいずれかを実施済みか判定
                    const done = p.completed_treatments?.some(
                        id => id === 'vitals' || EXAM_IDS.includes(id)
                    ) || false;
                    setHasVitalsOrExams(done)
                }
            })
        }
    }, [patientId])

    useEffect(() => {
        if (selectedTreatment) return // 処置選択済みの場合はスキャナーを起動しない

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
                // ignore errors during scanning
            }
        )

        return () => {
            scanner.clear().catch(e => console.error("Error clearing scanner", e))
        }
    }, [patientId, selectedTreatment, hasVitalsOrExams])

    const handleScan = async (text: string) => {
        // format: treatment:[treatment_id]
        if (text.startsWith('treatment:')) {
            const treatmentId = text.split(':')[1]
            await prepareTreatment(treatmentId)
        } else {
            setError('無効なQRコードです。「treatment:[ID]」の形式である必要があります。')
        }
    }

    const prepareTreatment = async (treatmentId: string) => {
        if (!patient) return

        // 治療処置の場合、バイタル・診察を行っていないとブロックする
        if (isTreatmentOption(treatmentId) && !hasVitalsOrExams) {
            setError('※ 治療処置を実施する前に、バイタルサイン測定または診察手技を行ってください。')
            setManualTreatmentId('')
            return
        }

        setError(null)

        // 処置IDが推奨処置スキャンか確認し、デフォルトタイマー時間を取得
        const matchedTreatment = patient.required_treatments?.find(rt => rt.treatment_id === treatmentId)
        
        let initialMinutes = 5
        let treatmentName = '各種処置'

        if (matchedTreatment) {
            initialMinutes = matchedTreatment.lock_timer_minutes
            treatmentName = matchedTreatment.treatment_name
        } else if (treatmentId === 'vitals') {
            treatmentName = 'バイタルサイン測定'
        } else if (treatmentId === 'head_and_neck') {
            treatmentName = '頭頸部診察'
        } else if (treatmentId === 'chest') {
            treatmentName = '胸部診察'
        } else if (treatmentId === 'abdomen_and_pelvis') {
            treatmentName = '腹部・骨盤診察'
        } else if (treatmentId === 'limbs') {
            treatmentName = '四肢診察'
        } else if (treatmentId === 'fast') {
            treatmentName = 'FAST'
        } else if (treatmentId === 'ample') {
            treatmentName = 'AMPLE'
        } else if (treatmentId === 'background') {
            treatmentName = '背景聴取'
        } else if (treatmentId === 'diagnosis') {
            treatmentName = '診断'
        } else {
            // どれにも該当しない場合は、全処置リストから名前を探す
            const found = DYNAMIC_TREATMENTS.find(t => t.id === treatmentId)
            if (found) {
                treatmentName = found.name
            }
        }

        setSelectedTreatment({
            id: treatmentId,
            name: treatmentName,
            defaultMinutes: initialMinutes,
            isCorrect: !!matchedTreatment
        })
        setTimerMinutes(initialMinutes)
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualTreatmentId) {
            prepareTreatment(manualTreatmentId)
        }
    }

    const confirmTreatment = async () => {
        if (!patientId || !selectedTreatment) return
        const pStr = parseInt(patientId)
        await startTreatmentTimer(pStr, selectedTreatment.id, timerMinutes)
        navigate(`/patient/${patientId}`)
    }

    const cancelTreatment = () => {
        setSelectedTreatment(null)
        setManualTreatmentId('')
        setError(null)
    }

    return (
        <div className="page treatment-scan-page">
            <header className="treatment-header">
                <div className="treatment-header__label">TREATMENT FOR</div>
                <h1 className="treatment-header__name">
                    {patient ? `${Math.floor(patient.age / 10) * 10}代 ${patient.gender === 'M' ? '男性' : '女性'}` : '読み込み中...'}
                </h1>
            </header>
            <main className="page__content">
                {selectedTreatment ? (
                    <div className="treatment-confirmation card card--elevated">
                        <h2 className="card__title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            処置の確認
                        </h2>
                        <div className="info-row">
                            <span className="info-row__label">処置ID</span>
                            <span className="info-row__value">{selectedTreatment.id}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-row__label">処置名</span>
                            <span className="info-row__value">{selectedTreatment.name}</span>
                        </div>

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

                        <div className="actions">
                            <button className="button button--danger" onClick={confirmTreatment}>
                                タイマーを開始
                            </button>
                            <button className="button button--secondary" onClick={cancelTreatment}>
                                やり直す
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="instruction-text">実施する処置の物品QRコードをスキャンしてください。</p>

                        <div className="qr-reader-wrapper">
                            <div id="treatment-reader" className="qr-reader custom-qr-scanner"></div>
                        </div>

                        {error && <div className="error-message" style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>}

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
                                            const val = e.target.value;
                                            setManualTreatmentId(val);
                                            // 即座にエラーチェックを行う
                                            if (val && isTreatmentOption(val) && !hasVitalsOrExams) {
                                                setError('※ 治療処置を実施する前に、バイタルサイン測定または診察手技を行ってください。');
                                                setManualTreatmentId('');
                                            } else {
                                                setError(null);
                                            }
                                        }}
                                    >
                                        <option value="">-- 手技を選択 --</option>

                                        {/* バイタル */}
                                        <optgroup label="バイタル">
                                            <option value="vitals">バイタルサイン測定</option>
                                        </optgroup>

                                        {/* 診察手技 */}
                                        <optgroup label="診察手技">
                                            <option value="head_and_neck">頭頸部診察</option>
                                            <option value="chest">胸部診察</option>
                                            <option value="abdomen_and_pelvis">腹部・骨盤診察</option>
                                            <option value="limbs">四肢診察</option>
                                            <option value="fast">FAST</option>
                                            <option value="ample">AMPLE</option>
                                            <option value="background">背景聴取</option>
                                        </optgroup>

                                        {/* 治療処置（全患者共通の動的リスト） */}
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
                )}
            </main>
        </div>
    )
}

export default TreatmentScanPage
