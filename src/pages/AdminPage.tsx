import React, { useEffect, useState } from 'react'
import { fetchAllPatients, createPatient } from '../lib/firestore'
import { Patient } from '../types/patient'
import PatientForm from '../components/PatientForm'
import { useNavigate } from 'react-router-dom'

const AdminPage: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([])
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
    const [isFormVisible, setIsFormVisible] = useState(false)
    const navigate = useNavigate()

    const loadPatients = async () => {
        const data = await fetchAllPatients()
        setPatients(data)
    }

    useEffect(() => {
        loadPatients()
    }, [])

    const handleAddClick = () => {
        setEditingPatient(null)
        setIsFormVisible(true)
    }

    const handleEditClick = (patient: Patient) => {
        setEditingPatient(patient)
        setIsFormVisible(true)
    }

    const handleFormSubmit = async (patient: Patient) => {
        await createPatient(patient)
        setIsFormVisible(false)
        loadPatients()
    }

    const handleFormCancel = () => {
        setIsFormVisible(false)
        setEditingPatient(null)
    }

    return (
        <div className="page admin-page">
            <header className="admin-header">
                <h1>管理画面 (Admin)</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => navigate('/qr-generator')}
                        className="button button--primary"
                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                        QR生成
                    </button>
                    <button onClick={() => navigate('/')} className="app-header__back" style={{position: 'static', transform: 'none', background: 'var(--gray-100)'}}>
                        ホームへ
                    </button>
                </div>
            </header>

            <main className="page__content">
                {isFormVisible ? (
                    <PatientForm
                        initialPatient={editingPatient}
                        onSubmit={handleFormSubmit}
                        onCancel={handleFormCancel}
                    />
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{fontSize: '1.1rem', fontWeight: '700'}}>患者データ一覧</h2>
                            <button onClick={handleAddClick} className="button button--primary" style={{width: 'auto', padding: '0.5rem 1rem'}}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '4px'}}>
                                    <path d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                追加
                            </button>
                        </div>

                        <div className="patient-list">
                            {patients.length === 0 ? (
                                <p style={{textAlign: 'center', color: 'var(--gray-500)', padding: '2rem'}}>患者データがありません。</p>
                            ) : (
                                patients.map((p, index) => (
                                    <div key={p.id} className="patient-list-item" style={{ '--index': index } as React.CSSProperties}>
                                        <div className="patient-list-item__header">
                                            <div>
                                                <div className="patient-list-item__name">{p.name}</div>
                                                <div className="patient-list-item__meta">ID: {String(p.id).padStart(4, '0')}</div>
                                            </div>
                                            <span className={`triage-badge triage-badge--sm triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'}`}>
                                                {p.triage_color}
                                            </span>
                                        </div>
                                        <div className="info-row" style={{padding: '0.25rem 0'}}>
                                            <span className="info-row__label">診断</span>
                                            <span className="info-row__value">{p.diagnosis}</span>
                                        </div>
                                        <div className="info-row" style={{padding: '0.25rem 0'}}>
                                            <span className="info-row__label">必要処置</span>
                                            <span className="info-row__value">
                                                {p.required_treatments?.map(rt => rt.treatment_name).join(', ') || 'なし'}
                                            </span>
                                        </div>
                                        <div className="info-row" style={{padding: '0.25rem 0'}}>
                                            <span className="info-row__label">拘束時間</span>
                                            <span className="info-row__value">
                                                {p.required_treatments?.map(rt => `${rt.lock_timer_minutes}分`).join(', ') || 'なし'}
                                            </span>
                                        </div>
                                        <div className="actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: 'var(--border)' }}>
                                            <button
                                                className="button button--secondary"
                                                onClick={() => handleEditClick(p)}
                                                style={{padding: '0.5rem'}}
                                            >
                                                編集
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

export default AdminPage
