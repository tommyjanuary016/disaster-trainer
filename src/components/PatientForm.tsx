import React, { useState, useEffect } from 'react'
import { Patient, RequiredTreatment } from '../types/patient'

interface PatientFormProps {
    initialPatient?: Patient | null
    onSubmit: (patient: Patient) => void
    onCancel: () => void
}

const defaultTreatment: RequiredTreatment = {
    treatment_id: '',
    treatment_name: '',
    lock_timer_minutes: 5,
}

const defaultPatient: Patient = {
    id: Date.now(),
    name: '',
    age: 0,
    gender: 'M',
    triage_color: '緑',
    vitals_triage: '',
    vitals_initial: '',
    vitals_post: '',
    findings: {
        head_and_neck: '',
        chest: '',
        abdomen_and_pelvis: '',
        limbs: '',
        fast: '',
        ample: '',
        background: '',
    },
    diagnosis: '',
    required_treatments: [defaultTreatment],
    status: '初期状態',
    assessment_completed: false,
    timer_started_at: null,
    timer_duration_ms: null,
    applied_treatment_id: null,
}

const PatientForm: React.FC<PatientFormProps> = ({ initialPatient, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<Patient>(initialPatient || defaultPatient)

    useEffect(() => {
        if (initialPatient) {
            setFormData(initialPatient)
        } else {
            setFormData({ ...defaultPatient, id: Date.now() })
        }
    }, [initialPatient])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }))
    }

    const handleFindingsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            findings: { ...prev.findings, [name]: value },
        }))
    }

    const handleTreatmentChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => {
            const newTreatments = [...(prev.required_treatments || [])]
            newTreatments[index] = {
                ...newTreatments[index],
                [name]: name === 'lock_timer_minutes' ? (parseInt(value) || 0) : value,
            }
            return { ...prev, required_treatments: newTreatments }
        })
    }

    const addTreatment = () => {
        setFormData((prev) => ({
            ...prev,
            required_treatments: [...(prev.required_treatments || []), { ...defaultTreatment }]
        }))
    }

    const removeTreatment = (index: number) => {
        setFormData((prev) => {
            const newTreatments = [...(prev.required_treatments || [])]
            newTreatments.splice(index, 1)
            return { ...prev, required_treatments: newTreatments }
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="patient-form card card--elevated">
            <header className="patient-form__header">
                <h3 className="card__title">{initialPatient ? '患者情報を編集' : '新規患者登録'}</h3>
                <p className="card__subtitle">全ての項目を入力してください</p>
            </header>

            <div className="patient-form__section">
                <h4 className="section-title">基本情報</h4>
                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">ID</label>
                        <input type="number" name="id" value={formData.id} onChange={handleNumberChange} required className="input" placeholder="例: 101" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">患者名</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input" placeholder="例: 山田 太郎" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">年齢</label>
                        <input type="number" name="age" value={formData.age} onChange={handleNumberChange} required className="input" placeholder="例: 45" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">性別</label>
                        <select name="gender" value={formData.gender} onChange={handleChange} className="input">
                            <option value="M">男性 (M)</option>
                            <option value="F">女性 (F)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">トリアージ区分</label>
                        <select name="triage_color" value={formData.triage_color} onChange={handleChange} className="input">
                            <option value="赤">I 赤 (最優先治療)</option>
                            <option value="黄">II 黄 (待機的治療)</option>
                            <option value="緑">III 緑 (軽症)</option>
                            <option value="黒">0 黒 (死亡/非救命対象)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="patient-form__section">
                <h4 className="section-title">バイタルサイン</h4>
                <div className="form-group">
                    <label className="form-label">トリアージ時</label>
                    <textarea name="vitals_triage" value={formData.vitals_triage} onChange={handleChange} className="input" placeholder="例: HR 110, BP 130/80, RR 24, SpO2 96%"></textarea>
                </div>
                <div className="form-group">
                    <label className="form-label">初期評価時 (Primary Survey)</label>
                    <textarea name="vitals_initial" value={formData.vitals_initial} onChange={handleChange} className="input" placeholder="例: 気道開通, 呼吸促迫なし..."></textarea>
                </div>
                <div className="form-group">
                    <label className="form-label">処置後 (Post Treatment)</label>
                    <textarea name="vitals_post" value={formData.vitals_post} onChange={handleChange} className="input" placeholder="例: 安定, 意識レベル改善..."></textarea>
                </div>
            </div>

            <div className="patient-form__section">
                <h4 className="section-title">身体所見 (Findings)</h4>
                <div className="form-grid form-grid--2col">
                    <div className="form-group">
                        <label className="form-label">頭頸部</label>
                        <textarea name="head_and_neck" value={formData.findings.head_and_neck} onChange={handleFindingsChange} className="input" rows={2}></textarea>
                    </div>
                    <div className="form-group">
                        <label className="form-label">胸部</label>
                        <textarea name="chest" value={formData.findings.chest} onChange={handleFindingsChange} className="input" rows={2}></textarea>
                    </div>
                    <div className="form-group">
                        <label className="form-label">腹部・骨盤</label>
                        <textarea name="abdomen_and_pelvis" value={formData.findings.abdomen_and_pelvis} onChange={handleFindingsChange} className="input" rows={2}></textarea>
                    </div>
                    <div className="form-group">
                        <label className="form-label">四肢</label>
                        <textarea name="limbs" value={formData.findings.limbs} onChange={handleFindingsChange} className="input" rows={2}></textarea>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">FAST (超音波検査)</label>
                    <textarea name="fast" value={formData.findings.fast} onChange={handleFindingsChange} className="input"></textarea>
                </div>
                <div className="form-group">
                    <label className="form-label">AMPLE (既往歴・アレルギー等)</label>
                    <textarea name="ample" value={formData.findings.ample} onChange={handleFindingsChange} className="input"></textarea>
                </div>
                <div className="form-group">
                    <label className="form-label">背景 (負傷機転・事故状況)</label>
                    <textarea name="background" value={formData.findings.background} onChange={handleFindingsChange} className="input"></textarea>
                </div>
            </div>

            <div className="patient-form__section">
                <h4 className="section-title">診断と必要な処置</h4>
                <div className="form-group">
                    <label className="form-label">確定診断名 (Diagnosis)</label>
                    <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="input" placeholder="例: 非穿通性胸部外傷, 肺挫傷" />
                </div>
                {formData.required_treatments?.map((rt, index) => (
                    <div key={index} className="form-grid" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed var(--gray-200)' }}>
                        <div className="form-group">
                            <label className="form-label">処置ID</label>
                            <input type="text" name="treatment_id" value={rt.treatment_id} onChange={(e) => handleTreatmentChange(index, e)} required className="input" placeholder="例: chest_tube" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">処置名</label>
                            <input type="text" name="treatment_name" value={rt.treatment_name} onChange={(e) => handleTreatmentChange(index, e)} required className="input" placeholder="例: 胸腔ドレナージ" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">拘束時間 (分)</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="number" name="lock_timer_minutes" value={rt.lock_timer_minutes} onChange={(e) => handleTreatmentChange(index, e)} required className="input" min="1" />
                                {formData.required_treatments.length > 1 && (
                                    <button type="button" onClick={() => removeTreatment(index)} className="button button--danger" style={{ padding: '0 0.5rem', width: 'auto' }}>
                                        削除
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addTreatment} className="button button--secondary" style={{ width: 'auto', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    + 推奨処置を追加
                </button>
            </div>

            <div className="form-actions">
                <button type="submit" className="button button--primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    {initialPatient ? '変更を保存' : '新規登録を実行'}
                </button>
                <button type="button" className="button button--secondary" onClick={onCancel}>キャンセル</button>
            </div>
        </form>
    )
}

export default PatientForm

