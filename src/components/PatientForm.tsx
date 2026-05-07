import React, { useState, useEffect } from 'react'
import { Patient, RequiredTreatment, VitalSignStruct } from '../types/patient'

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

const COMMON_TREATMENTS = [
    { id: 'iv_fluid', name: '点滴 (外液・ルート等)', time: 1 },
    { id: 'blood_transfusion', name: '緊急輸血', time: 5 },
    { id: 'chest_tube', name: '胸腔ドレーン挿入', time: 5 },
    { id: 'intubation', name: '気管挿管', time: 5 },
    { id: 'splint', name: 'シーネ固定', time: 5 },
    { id: 'traction', name: '牽引', time: 5 },
    { id: 'xray', name: 'レントゲン(X-P)', time: 3 },
    { id: 'ct', name: 'CT画像検査', time: 5 },
    { id: 'blood_test', name: '血液検査', time: 5 },
    { id: 'blood_gas', name: '血液ガス', time: 3 },
    { id: 'suture', name: '縫合処置', time: 5 },
    { id: 'sedation', name: '鎮静・鎮痛薬投与', time: 5 },
    { id: 'antihypertensive', name: '降圧薬投与', time: 5 },
]

const defaultPatient: Patient = {
    id: Date.now(),
    name: '',
    age: 30,
    gender: 'M',
    triage_color: '緑',
    // フリーテキスト（下位互換用に残すが編集画面では使用しない）
    vitals_triage: '',
    vitals_initial: '',
    vitals_post: '',
    // 構造化V/S（新UI）
    vitals_triage_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 36.5, jcs: 0 },
    vitals_initial_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 36.5, jcs: 0 },
    vitals_post_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 36.5, jcs: 0 },
    vitals_deterioration_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 36.5, jcs: 0 },
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
    // 新規項目（オプショナル）
    necessary_tests_and_treatments: '',
    policy: '',
    image_urls: [],
    blood_test_data: '',
    acting_instructions: '',
    deterioration_enabled: false,
    deterioration_time_minutes: 30,
}

const PatientForm: React.FC<PatientFormProps> = ({ initialPatient, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<Patient>(initialPatient || defaultPatient)

    useEffect(() => {
        if (initialPatient) {
            // 既存患者を編集する場合、structが無ければデフォルト値で初期化
            const enriched = { ...initialPatient }
            if (!enriched.vitals_triage_struct) {
                enriched.vitals_triage_struct = { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 36.5, jcs: 0 }
            }
            if (!enriched.vitals_initial_struct) {
                enriched.vitals_initial_struct = { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 36.5, jcs: 0 }
            }
            setFormData(enriched)
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
        // 自然数のみ（0以上）に強制
        setFormData((prev) => ({ ...prev, [name]: Math.max(0, parseInt(value) || 0) }))
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

    // 構造化V/S更新ヘルパー
    const updateVitalStruct = (
        field: 'vitals_triage_struct' | 'vitals_initial_struct' | 'vitals_post_struct' | 'vitals_deterioration_struct' | 'vitals_rosc_struct',
        key: keyof VitalSignStruct,
        rawValue: string
    ) => {
        // 体温は小数点あり（0以上）、それ以外は0以上の自然数に強制
        const numVal = key === 'temp'
            ? Math.max(0, parseFloat(rawValue) || 0)
            : Math.max(0, parseInt(rawValue) || 0)
        setFormData(prev => ({
            ...prev,
            [field]: { ...(prev[field] || {}), [key]: numVal }
        }))
    }

    // 構造化V/Sをフリーテキストに変換（保存時の同期用）
    const structToText = (s: VitalSignStruct | undefined): string => {
        if (!s) return ''
        const parts = [
            s.sbp || s.dbp ? `BP ${s.sbp}/${s.dbp}` : null,
            s.hr ? `HR ${s.hr}` : null,
            s.rr ? `RR ${s.rr}` : null,
            s.spo2 ? `SpO2 ${s.spo2}%` : null,
            s.temp ? `Temp ${s.temp}℃` : null,
            s.jcs !== undefined && s.jcs !== null ? `JCS ${s.jcs}` : null,
        ].filter(Boolean)
        return parts.join(', ')
    }

    const JCS_OPTIONS = [0, 1, 2, 3, 10, 20, 30, 100, 200, 300]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // 保存時にフリーテキストフィールドを構造化データから自動同期
        const vitals_triage = structToText(formData.vitals_triage_struct) || formData.vitals_triage
        const vitals_initial = structToText(formData.vitals_initial_struct) || formData.vitals_initial
        onSubmit({ ...formData, vitals_triage, vitals_initial })
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
                        <input type="number" name="id" min="0" value={formData.id} onChange={handleNumberChange} required className="input" placeholder="例: 101" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">患者名</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input" placeholder="例: 山田 太郎" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">年齢</label>
                        <input type="number" name="age" min="0" max="130" value={formData.age} onChange={handleNumberChange} required className="input" placeholder="例: 45" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">性別</label>
                        <select name="gender" value={formData.gender} onChange={handleChange} className="input">
                            <option value="M">男性 (M)</option>
                            <option value="F">女性 (F)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">想定トリアージ区分（正解）</label>
                        <select name="triage_color" value={formData.triage_color} onChange={(e) => {
                            const val = e.target.value as any
                            setFormData(prev => {
                                const next = { ...prev, triage_color: val }
                                if (val === '黒') {
                                    next.vitals_triage_struct = { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 35.0, jcs: 300 }
                                    next.vitals_initial_struct = { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 35.0, jcs: 300 }
                                }
                                return next
                            })
                        }} className="input">
                            <option value="赤">I 赤 (最優先治療)</option>
                            <option value="黄">II 黄 (待機的治療)</option>
                            <option value="緑">III 緑 (軽症)</option>
                            <option value="黒">0 黒 (死亡/非救命対象)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">災害現場トリアージ区分</label>
                        <select name="scene_triage_color" value={formData.scene_triage_color || ''} onChange={(e) => {
                            const val = e.target.value as any
                            setFormData(prev => ({
                                ...prev,
                                scene_triage_color: val,
                                // 現場トリアージが選ばれた時、初期値としてV/Sのテンプレを入れる（空の場合）
                                vitals_triage: prev.vitals_triage || (val === '赤' ? 'HR 120, BP 80/50, RR 30, SpO2 90%' : val === '黄' ? 'HR 100, BP 120/80, RR 20, SpO2 96%' : val === '緑' ? '歩行可能, 著変なし' : '呼吸なし, 脈脈拍触知不可'),
                                vitals_triage_struct: val === '黒' ? { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 35.0, jcs: 300 } : prev.vitals_triage_struct,
                                vitals_initial_struct: val === '黒' ? { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 35.0, jcs: 300 } : prev.vitals_initial_struct
                            }))
                        }} className="input">
                            <option value="">（未設定 / 推測）</option>
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
                {/* 共通ラベル行 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '0.25rem', padding: '0 0.25rem' }}>
                    {['SBP', 'DBP', 'HR', 'RR', 'SpO2', 'Temp', 'JCS'].map(l => (
                        <div key={l} style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--gray-500)', textAlign: 'center', letterSpacing: '0.03em' }}>{l}</div>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '0.25rem', padding: '0 0.25rem' }}>
                    {['mmHg', 'mmHg', 'bpm', '/min', '%', '℃', '0-300'].map(l => (
                        <div key={l} style={{ fontSize: '0.6rem', color: 'var(--gray-400)', textAlign: 'center' }}>{l}</div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                    {/* ── トリアージエリアV/S ── */}
                    <div style={{ padding: '1rem', backgroundColor: 'var(--gray-50)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                                🚑 トリアージエリアV/S
                            </span>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                <button type="button" className="button triage-btn-black" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_triage_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 35.0, jcs: 300 } }))}>死亡</button>
                                <button type="button" className="button triage-btn-stripe" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_triage_struct: { sbp: 70, dbp: 40, hr: 135, rr: 35, spo2: 85, temp: 36.0, jcs: 100 } }))}>最重症</button>
                                <button type="button" className="button triage-btn-red" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_triage_struct: { sbp: 80, dbp: 50, hr: 120, rr: 30, spo2: 90, temp: 36.5, jcs: 30 } }))}>重症</button>
                                <button type="button" className="button triage-btn-yellow" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_triage_struct: { sbp: 110, dbp: 70, hr: 100, rr: 22, spo2: 94, temp: 36.5, jcs: 10 } }))}>中等症</button>
                                <button type="button" className="button triage-btn-green" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_triage_struct: { sbp: 120, dbp: 80, hr: 80, rr: 16, spo2: 98, temp: 36.5, jcs: 0 } }))}>軽症</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="120" value={formData.vitals_triage_struct?.sbp !== undefined ? formData.vitals_triage_struct!.sbp : ''}
                                onChange={e => updateVitalStruct('vitals_triage_struct', 'sbp', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="80" value={formData.vitals_triage_struct?.dbp !== undefined ? formData.vitals_triage_struct!.dbp : ''}
                                onChange={e => updateVitalStruct('vitals_triage_struct', 'dbp', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="80" value={formData.vitals_triage_struct?.hr !== undefined ? formData.vitals_triage_struct!.hr : ''}
                                onChange={e => updateVitalStruct('vitals_triage_struct', 'hr', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="20" value={formData.vitals_triage_struct?.rr !== undefined ? formData.vitals_triage_struct!.rr : ''}
                                onChange={e => updateVitalStruct('vitals_triage_struct', 'rr', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="98" value={formData.vitals_triage_struct?.spo2 !== undefined ? formData.vitals_triage_struct!.spo2 : ''}
                                onChange={e => updateVitalStruct('vitals_triage_struct', 'spo2', e.target.value)} />
                            <input type="number" step="0.1" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="36.5" value={formData.vitals_triage_struct?.temp !== undefined ? formData.vitals_triage_struct!.temp : ''}
                                onChange={e => updateVitalStruct('vitals_triage_struct', 'temp', e.target.value)} />
                            <select className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                value={formData.vitals_triage_struct?.jcs ?? 0}
                                onChange={e => updateVitalStruct('vitals_triage_struct', 'jcs', e.target.value)}>
                                {JCS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* ── 診療エリア初期V/S ── */}
                    <div style={{ padding: '1rem', backgroundColor: 'var(--gray-50)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                                🏥 診療エリア初期V/S
                            </span>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                <button type="button" className="button triage-btn-black" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_initial_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 35.0, jcs: 300 } }))}>死亡</button>
                                <button type="button" className="button triage-btn-stripe" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_initial_struct: { sbp: 70, dbp: 40, hr: 135, rr: 35, spo2: 85, temp: 36.0, jcs: 100 } }))}>最重症</button>
                                <button type="button" className="button triage-btn-red" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_initial_struct: { sbp: 80, dbp: 50, hr: 120, rr: 30, spo2: 90, temp: 36.5, jcs: 30 } }))}>重症</button>
                                <button type="button" className="button triage-btn-yellow" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_initial_struct: { sbp: 110, dbp: 70, hr: 100, rr: 22, spo2: 94, temp: 36.5, jcs: 10 } }))}>中等症</button>
                                <button type="button" className="button triage-btn-green" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_initial_struct: { sbp: 120, dbp: 80, hr: 80, rr: 16, spo2: 98, temp: 36.5, jcs: 0 } }))}>軽症</button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="120" value={formData.vitals_initial_struct?.sbp ?? ''}
                                onChange={e => updateVitalStruct('vitals_initial_struct', 'sbp', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="80" value={formData.vitals_initial_struct?.dbp ?? ''}
                                onChange={e => updateVitalStruct('vitals_initial_struct', 'dbp', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="80" value={formData.vitals_initial_struct?.hr ?? ''}
                                onChange={e => updateVitalStruct('vitals_initial_struct', 'hr', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="20" value={formData.vitals_initial_struct?.rr ?? ''}
                                onChange={e => updateVitalStruct('vitals_initial_struct', 'rr', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="98" value={formData.vitals_initial_struct?.spo2 ?? ''}
                                onChange={e => updateVitalStruct('vitals_initial_struct', 'spo2', e.target.value)} />
                            <input type="number" step="0.1" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="36.5" value={formData.vitals_initial_struct?.temp ?? ''}
                                onChange={e => updateVitalStruct('vitals_initial_struct', 'temp', e.target.value)} />
                            <select className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                value={formData.vitals_initial_struct?.jcs ?? 0}
                                onChange={e => updateVitalStruct('vitals_initial_struct', 'jcs', e.target.value)}>
                                {JCS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* ── 処置完了後V/S ── */}
                    <div style={{ padding: '1rem', backgroundColor: 'var(--gray-50)', borderRadius: '10px', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--gray-700)' }}>
                                🩺 処置完了後V/S
                            </span>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                <button type="button" className="button button--secondary" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    onClick={() => setFormData(p => ({ ...p, vitals_post_struct: p.vitals_initial_struct ? { ...p.vitals_initial_struct } : p.vitals_post_struct }))}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7v8a2 2 0 0 0 2 2h6M16 13l4 4-4 4"/></svg>
                                    診療エリア初期V/Sから変化なし
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="120" value={formData.vitals_post_struct?.sbp ?? ''}
                                onChange={e => updateVitalStruct('vitals_post_struct', 'sbp', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="80" value={formData.vitals_post_struct?.dbp ?? ''}
                                onChange={e => updateVitalStruct('vitals_post_struct', 'dbp', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="80" value={formData.vitals_post_struct?.hr ?? ''}
                                onChange={e => updateVitalStruct('vitals_post_struct', 'hr', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="20" value={formData.vitals_post_struct?.rr ?? ''}
                                onChange={e => updateVitalStruct('vitals_post_struct', 'rr', e.target.value)} />
                            <input type="number" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="98" value={formData.vitals_post_struct?.spo2 ?? ''}
                                onChange={e => updateVitalStruct('vitals_post_struct', 'spo2', e.target.value)} />
                            <input type="number" step="0.1" className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                placeholder="36.5" value={formData.vitals_post_struct?.temp ?? ''}
                                onChange={e => updateVitalStruct('vitals_post_struct', 'temp', e.target.value)} />
                            <select className="input" style={{ textAlign: 'center', padding: '0.4rem 0.25rem', fontSize: '0.9rem' }}
                                value={formData.vitals_post_struct?.jcs ?? 0}
                                onChange={e => updateVitalStruct('vitals_post_struct', 'jcs', e.target.value)}>
                                {JCS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>

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
                <h4 className="section-title">模擬患者（アクター）用設定</h4>
                <div className="form-group">
                    <label className="form-label">演技・痛がり方のアドバイス (Acting Instructions)</label>
                    <textarea name="acting_instructions" value={formData.acting_instructions} onChange={handleChange} className="input" rows={3} placeholder="例: 右腹部を押さえて痛がる。呼吸が苦しい素振りをする。"></textarea>
                </div>
            </div>

            <div className="patient-form__section">
                <h4 className="section-title">診断と必要な処置</h4>
                <div className="form-group">
                    <label className="form-label">確定診断名 (Diagnosis)</label>
                    <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="input" placeholder="例: 非穿通性胸部外傷, 肺挫傷" />
                </div>
                {formData.required_treatments?.map((rt, index) => (
                    <div key={index} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                            <select 
                                className="input" 
                                style={{ width: 'auto', flex: '1 1 auto' }}
                                value={COMMON_TREATMENTS.find(t => t.id === rt.treatment_id) ? rt.treatment_id : ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const t = COMMON_TREATMENTS.find(t => t.id === val);
                                    if(t) {
                                        const eventName = { target: { name: 'treatment_name', value: t.name } } as unknown as React.ChangeEvent<HTMLInputElement>;
                                        const eventId = { target: { name: 'treatment_id', value: t.id } } as unknown as React.ChangeEvent<HTMLInputElement>;
                                        const eventTime = { target: { name: 'lock_timer_minutes', value: t.time.toString() } } as unknown as React.ChangeEvent<HTMLInputElement>;
                                        handleTreatmentChange(index, eventName);
                                        handleTreatmentChange(index, eventId);
                                        handleTreatmentChange(index, eventTime);
                                    }
                                }}
                            >
                                <option value="" disabled>定型処置を選択...</option>
                                {COMMON_TREATMENTS.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.time}分)</option>
                                ))}
                            </select>
                            {formData.required_treatments && formData.required_treatments.length > 1 && (
                                <button type="button" onClick={() => removeTreatment(index)} className="button button--danger" style={{ padding: '0 0.5rem', width: 'auto', flex: '0 0 auto' }}>
                                    削除
                                </button>
                            )}
                        </div>
                        <div className="form-grid form-grid--2col">
                            <div className="form-group">
                                <label className="form-label">処置名</label>
                                <input type="text" name="treatment_name" value={rt.treatment_name} onChange={(e) => handleTreatmentChange(index, e)} required className="input" placeholder="例: 胸腔ドレナージ" />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>拘束時間 (分)</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 'normal' }}>内部ID: {rt.treatment_id}</span>
                                </label>
                                <input type="number" name="lock_timer_minutes" value={rt.lock_timer_minutes} onChange={(e) => handleTreatmentChange(index, e)} required className="input" min="1" />
                                <input type="hidden" name="treatment_id" value={rt.treatment_id} />
                            </div>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addTreatment} className="button button--secondary" style={{ width: 'auto', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    + 推奨処置を追加
                </button>
            </div>

            <div className="patient-form__section">
                <h4 className="section-title">急変・悪化・ROSC設定</h4>
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                            type="checkbox" 
                            name="deterioration_enabled" 
                            checked={formData.deterioration_enabled || false}
                            onChange={(e) => setFormData(prev => ({ ...prev, deterioration_enabled: e.target.checked }))} 
                        />
                        <span>悪化シナリオを有効にする</span>
                    </label>
                </div>

                {formData.deterioration_enabled && (
                    <div style={{ padding: '1rem', backgroundColor: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                        <div className="form-group">
                            <label className="form-label">悪化到達時間 (分)</label>
                            <input 
                                type="number" 
                                name="deterioration_time_minutes" 
                                value={formData.deterioration_time_minutes ?? 30} 
                                onChange={handleNumberChange} 
                                className="input" 
                                min="1" 
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>※この時間（分）かけて最終到達バイタル目標まで緩やかに悪化します。</p>
                        </div>

                         <div className="form-group" style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <label className="form-label" style={{ margin: 0 }}>⚠️ 最終到達バイタル目標 (V/S)</label>
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    <button type="button" className="button triage-btn-black" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                        onClick={() => setFormData(p => ({ ...p, vitals_deterioration_struct: { sbp: 0, dbp: 0, hr: 0, rr: 0, spo2: 0, temp: 35.0, jcs: 300 } }))}>死亡</button>
                                    <button type="button" className="button triage-btn-stripe" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                        onClick={() => setFormData(p => ({ ...p, vitals_deterioration_struct: { sbp: 70, dbp: 40, hr: 140, rr: 40, spo2: 82, temp: 36.0, jcs: 100 } }))}>最重症</button>
                                    <button type="button" className="button triage-btn-red" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                        onClick={() => setFormData(p => ({ ...p, vitals_deterioration_struct: { sbp: 80, dbp: 50, hr: 130, rr: 32, spo2: 88, temp: 36.0, jcs: 30 } }))}>重症</button>
                                    <button type="button" className="button triage-btn-yellow" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                        onClick={() => setFormData(p => ({ ...p, vitals_deterioration_struct: { sbp: 95, dbp: 60, hr: 110, rr: 25, spo2: 92, temp: 36.5, jcs: 10 } }))}>中等症</button>
                                    <button type="button" className="button triage-btn-green" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                        onClick={() => setFormData(p => ({ ...p, vitals_deterioration_struct: { sbp: 120, dbp: 80, hr: 80, rr: 16, spo2: 98, temp: 36.5, jcs: 0 } }))}>軽症</button>
                                </div>
                            </div>
                            {/* 共通ラベル行（悪化目標V/S） */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                {['SBP', 'DBP', 'HR', 'RR', 'SpO2', 'Temp', 'JCS'].map(l => (
                                    <div key={l} style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--gray-500)', textAlign: 'center' }}>{l}</div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                                <input type="number" placeholder="0" value={formData.vitals_deterioration_struct?.sbp ?? ''} onChange={e => updateVitalStruct('vitals_deterioration_struct', 'sbp', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} />
                                <input type="number" placeholder="0" value={formData.vitals_deterioration_struct?.dbp ?? ''} onChange={e => updateVitalStruct('vitals_deterioration_struct', 'dbp', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} />
                                <input type="number" placeholder="0" value={formData.vitals_deterioration_struct?.hr ?? ''} onChange={e => updateVitalStruct('vitals_deterioration_struct', 'hr', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} />
                                <input type="number" placeholder="0" value={formData.vitals_deterioration_struct?.rr ?? ''} onChange={e => updateVitalStruct('vitals_deterioration_struct', 'rr', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} />
                                <input type="number" placeholder="0" value={formData.vitals_deterioration_struct?.spo2 ?? ''} onChange={e => updateVitalStruct('vitals_deterioration_struct', 'spo2', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} />
                                <input type="number" step="0.1" placeholder="35" value={formData.vitals_deterioration_struct?.temp ?? ''} onChange={e => updateVitalStruct('vitals_deterioration_struct', 'temp', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} />
                                <select className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }}
                                    value={formData.vitals_deterioration_struct?.jcs ?? 0}
                                    onChange={e => updateVitalStruct('vitals_deterioration_struct', 'jcs', e.target.value)}>
                                    {JCS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                         </div>

                        <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--gray-300)', paddingTop: '1rem' }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    name="rosc_possible" 
                                    checked={formData.rosc_possible || false}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setFormData(prev => {
                                            const next = { ...prev, rosc_possible: checked }
                                            if (checked && !next.vitals_rosc_struct) {
                                                next.vitals_rosc_struct = { sbp: 100, dbp: 60, hr: 100, rr: 20, spo2: 98, temp: 36.0 }
                                            }
                                            return next
                                        })
                                    }} 
                                />
                                <span>ROSC（心拍再開）可能か？</span>
                            </label>
                            {formData.rosc_possible && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <label className="form-label" style={{ margin: 0 }}>ROSC後バイタル目標 (※必須)</label>
                                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                            <button type="button" className="button triage-btn-stripe" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                                onClick={() => setFormData(p => ({ ...p, vitals_rosc_struct: { sbp: 70, dbp: 40, hr: 140, rr: 40, spo2: 82, temp: 36.0, jcs: 100 } }))}>最重症</button>
                                            <button type="button" className="button triage-btn-red" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                                onClick={() => setFormData(p => ({ ...p, vitals_rosc_struct: { sbp: 80, dbp: 50, hr: 130, rr: 32, spo2: 88, temp: 36.0, jcs: 30 } }))}>重症</button>
                                            <button type="button" className="button triage-btn-yellow" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                                onClick={() => setFormData(p => ({ ...p, vitals_rosc_struct: { sbp: 95, dbp: 60, hr: 110, rr: 25, spo2: 92, temp: 36.5, jcs: 10 } }))}>中等症</button>
                                            <button type="button" className="button triage-btn-green" style={{ padding: '0.2rem 0.45rem', fontSize: '0.68rem', width: 'auto' }}
                                                onClick={() => setFormData(p => ({ ...p, vitals_rosc_struct: { sbp: 120, dbp: 80, hr: 80, rr: 16, spo2: 98, temp: 36.5, jcs: 0 } }))}>軽症</button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                        {['SBP', 'DBP', 'HR', 'RR', 'SpO2', 'Temp', 'JCS'].map(l => (
                                            <div key={l} style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--gray-500)', textAlign: 'center' }}>{l}</div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                                        <input type="number" placeholder="100" value={formData.vitals_rosc_struct?.sbp ?? ''} onChange={e => updateVitalStruct('vitals_rosc_struct', 'sbp', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} required />
                                        <input type="number" placeholder="60" value={formData.vitals_rosc_struct?.dbp ?? ''} onChange={e => updateVitalStruct('vitals_rosc_struct', 'dbp', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} required />
                                        <input type="number" placeholder="100" value={formData.vitals_rosc_struct?.hr ?? ''} onChange={e => updateVitalStruct('vitals_rosc_struct', 'hr', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} required />
                                        <input type="number" placeholder="20" value={formData.vitals_rosc_struct?.rr ?? ''} onChange={e => updateVitalStruct('vitals_rosc_struct', 'rr', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} required />
                                        <input type="number" placeholder="98" value={formData.vitals_rosc_struct?.spo2 ?? ''} onChange={e => updateVitalStruct('vitals_rosc_struct', 'spo2', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} required />
                                        <input type="number" step="0.1" placeholder="36" value={formData.vitals_rosc_struct?.temp ?? ''} onChange={e => updateVitalStruct('vitals_rosc_struct', 'temp', e.target.value)} className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }} required />
                                        <select className="input" style={{ textAlign: 'center', padding: '0.4rem 0.2rem', fontSize: '0.85rem' }}
                                            value={formData.vitals_rosc_struct?.jcs ?? 0}
                                            onChange={e => updateVitalStruct('vitals_rosc_struct', 'jcs', e.target.value)}>
                                            {JCS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--amber-600)', marginTop: '0.25rem' }}>※胸骨圧迫/ACLS完了時に、このバイタルサインへ即時ジャンプ回復します。</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
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

