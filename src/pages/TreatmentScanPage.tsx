import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchPatient, startTreatmentTimer } from '../lib/firestore'
import { Patient } from '../types/patient'
import { parseQRCode, ParsedQRCode } from '../types/qr'
import { getMedicalItemById } from '../data/items'
import QRConfirmModal from '../components/QRConfirmModal'

// 診察手技のIDリスト
const EXAM_IDS = ['head_and_neck', 'chest', 'abdomen_and_pelvis', 'limbs', 'fast', 'ample', 'background']

// 手技IDと表示名のマッピング（全臨床リスト）
export const PROCEDURE_NAMES: Record<string, string> = {
    vitals:             'バイタルサイン測定',
    head_and_neck:      '頭頸部診察',
    chest:              '胸部診察',
    abdomen_and_pelvis: '腹部・骨盤診察',
    limbs:              '四肢診察',
    fast:               'FAST',
    ample:              'AMPLE',
    background:         '背景聴取',
    diagnosis:          '診断',
    // 気道・呼吸
    oxygen: '酸素投与',
    hfnc: 'ハイフロー開始 (HFNC)',
    intubation: '気管挿管',
    surgical_airway: '外科的気道確保',
    ventilator: '人工呼吸器開始',
    needle_decompression: '胸腔穿刺 (緊急脱気)',
    chest_tube: '胸腔ドレーン挿入',
    // 循環・輸液・輸血
    iv_access: '静脈路確保(末梢)',
    iv_access_2: '静脈路確保(2本目)',
    cv_access: '中心静脈路確保',
    quinton_catheter: '血管アクセスカテーテル挿入 (クイントン)',
    iv_fluid: '外液急速投与',
    blood_transfusion: '緊急輸血 (RBC/FFP/PC)',
    // 薬剤投与
    vasopressor: '昇圧剤投与',
    antihypertensive: '降圧剤投与',
    antibiotics: '抗菌薬投与',
    sedation: '鎮静・鎮痛薬投与',
    // 蘇生・外科的介入・高度医療
    pelvic_binder: 'サムスリング装着 (骨盤固定)',
    cpr: '胸骨圧迫 / ACLS',
    fasciotomy: '減張切開',
    open_cardiac_massage: '開胸心マ',
    aortic_cross_clamping: '開胸大動脈クランプ',
    exploratory_laparotomy: '試験開腹',
    emergency_c_section: '緊急帝王切開',
    iabo: 'IABO (大動脈内バルーン閉塞)',
    iabp: 'IABP (大動脈内バルーンポンピング)',
    pcps: 'PCPS (VA-ECMO)',
    // 整形・その他
    pericardiocentesis: '心嚢穿刺ドレナージ',
    splint: 'シーネ固定',
    traction: '直達牽引',
    suture: '挫創処置 (洗浄縫合)',
}

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
                treatmentName = PROCEDURE_NAMES[treatmentId] ?? '各種処置'
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

        // 必須IVルートの有無判定
        const completed = patient.completed_treatments || []
        const hasAnyIvAccess = completed.includes('iv_access') || completed.includes('cv_access') || completed.includes('quinton_catheter') || completed.includes('iv_access_2')

        const requireIvMeds = ['vasopressor', 'antihypertensive', 'antibiotics', 'sedation', 'iv_fluid', 'blood_transfusion']
        if (requireIvMeds.includes(resolved.treatment_id) && !hasAnyIvAccess) {
            setError('※ 薬剤や輸液の投与には、事前に静脈路(末梢/中心)またはカテーテルの確保が必要です。')
            return
        }

        if (resolved.treatment_id === 'iv_access_2' && !completed.includes('iv_access')) {
            setError('※ 静脈路確保(2本目)は、静脈路確保(末梢)が既に完了している場合のみ実施可能です。')
            return
        }

        setError(null)
        setPendingProcedure(resolved)
        setPendingParsed(parsed)
        setTimerMinutes(resolved.defaultMinutes)
        setShowModal(true)
    }

    // 依存関係チェックヘルパー（手動入力画面用）
    const completedList = patient?.completed_treatments || []
    const hasAnyIvAccess = completedList.includes('iv_access') || completedList.includes('cv_access') || completedList.includes('quinton_catheter') || completedList.includes('iv_access_2')


    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualTreatmentId) {
            handleScan(`procedure:${manualTreatmentId}`)
        }
    }

    const handleConfirm = async () => {
        if (!patientId || !pendingProcedure) return
        await startTreatmentTimer(parseInt(patientId), pendingProcedure.treatment_id, timerMinutes)
        navigate(`/training/patient/${patientId}`)
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

                                    <optgroup label="治療処置: 気道・呼吸" disabled={!hasVitalsOrExams}>
                                        <option value="oxygen">{PROCEDURE_NAMES.oxygen}</option>
                                        <option value="hfnc">{PROCEDURE_NAMES.hfnc}</option>
                                        <option value="intubation">{PROCEDURE_NAMES.intubation}</option>
                                        <option value="surgical_airway">{PROCEDURE_NAMES.surgical_airway}</option>
                                        <option value="ventilator">{PROCEDURE_NAMES.ventilator}</option>
                                        <option value="needle_decompression">{PROCEDURE_NAMES.needle_decompression}</option>
                                        <option value="chest_tube">{PROCEDURE_NAMES.chest_tube}</option>
                                    </optgroup>

                                    <optgroup label="治療処置: 循環・輸液・輸血" disabled={!hasVitalsOrExams}>
                                        <option value="iv_access">{PROCEDURE_NAMES.iv_access}</option>
                                        {completedList.includes('iv_access') && <option value="iv_access_2">{PROCEDURE_NAMES.iv_access_2}</option>}
                                        <option value="cv_access">{PROCEDURE_NAMES.cv_access}</option>
                                        <option value="quinton_catheter">{PROCEDURE_NAMES.quinton_catheter}</option>
                                        
                                        <option value="iv_fluid" disabled={!hasAnyIvAccess}>{PROCEDURE_NAMES.iv_fluid}</option>
                                        <option value="blood_transfusion" disabled={!hasAnyIvAccess}>{PROCEDURE_NAMES.blood_transfusion}</option>
                                        <option value="tourniquet">{PROCEDURE_NAMES.tourniquet}</option>
                                    </optgroup>

                                    <optgroup label="治療処置: 薬剤投与 (※ルート確保必須)" disabled={!hasVitalsOrExams || !hasAnyIvAccess}>
                                        <option value="vasopressor">{PROCEDURE_NAMES.vasopressor}</option>
                                        <option value="antihypertensive">{PROCEDURE_NAMES.antihypertensive}</option>
                                        <option value="antibiotics">{PROCEDURE_NAMES.antibiotics}</option>
                                        <option value="sedation">{PROCEDURE_NAMES.sedation}</option>
                                    </optgroup>

                                    <optgroup label="治療処置: 蘇生・外科的介入・高度医療" disabled={!hasVitalsOrExams}>
                                        <option value="pelvic_binder">{PROCEDURE_NAMES.pelvic_binder}</option>
                                        <option value="cpr">{PROCEDURE_NAMES.cpr}</option>
                                        <option value="fasciotomy">{PROCEDURE_NAMES.fasciotomy}</option>
                                        <option value="open_cardiac_massage">{PROCEDURE_NAMES.open_cardiac_massage}</option>
                                        <option value="aortic_cross_clamping">{PROCEDURE_NAMES.aortic_cross_clamping}</option>
                                        <option value="exploratory_laparotomy">{PROCEDURE_NAMES.exploratory_laparotomy}</option>
                                        <option value="emergency_c_section">{PROCEDURE_NAMES.emergency_c_section}</option>
                                        <option value="iabo">{PROCEDURE_NAMES.iabo}</option>
                                        <option value="iabp">{PROCEDURE_NAMES.iabp}</option>
                                        <option value="pcps">{PROCEDURE_NAMES.pcps}</option>
                                    </optgroup>

                                    <optgroup label="治療処置: 整形・その他" disabled={!hasVitalsOrExams}>
                                        <option value="pericardiocentesis">{PROCEDURE_NAMES.pericardiocentesis}</option>
                                        <option value="splint">{PROCEDURE_NAMES.splint}</option>
                                        <option value="traction">{PROCEDURE_NAMES.traction}</option>
                                        <option value="suture">{PROCEDURE_NAMES.suture}</option>
                                    </optgroup>
                                </select>
                                {!hasVitalsOrExams && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                                        ※ 治療処置はバイタルまたは診察を実施後に選択可能になります。
                                    </p>
                                )}
                                {hasVitalsOrExams && !hasAnyIvAccess && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--amber-600)', marginTop: '0.5rem' }}>
                                        ※ 薬剤や輸液の投与には、事前に静脈路またはカテーテルの確保が必要です。
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
                            onClick={() => navigate(`/training/patient/${patientId}`)}
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
