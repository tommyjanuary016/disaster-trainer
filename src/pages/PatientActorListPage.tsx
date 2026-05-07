import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeToAllPatients, activeSessionId } from '../lib/firestore'
import { Patient } from '../types/patient'

const PatientActorListPage: React.FC = () => {
    const navigate = useNavigate()
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // セッション内の患者のみ取得する
        const unsubscribe = subscribeToAllPatients((data) => {
            setPatients(data)
            setLoading(false)
        }, true) // sessionIdOnly = true

        return () => unsubscribe()
    }, [])

    return (
        <div className="actor-list-page">
            <header className="actor-page__header" style={{ marginBottom: '1rem' }}>
                <button className="actor-page__back" onClick={() => navigate('/training')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    訓練トップへ戻る
                </button>
                <h2 className="actor-title" style={{ margin: 0, paddingLeft: '1rem' }}>担当患者を選択</h2>
            </header>
            
            <div className="page__content" style={{ padding: '0 1rem' }}>
                {!activeSessionId ? (
                    <div className="error-message" style={{ textAlign: 'center', marginTop: '2rem' }}>
                        アクティブな訓練セッションがありません。<br/>
                        管理画面からセッションを開始してください。
                    </div>
                ) : loading ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>読み込み中...</div>
                ) : patients.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>患者が見つかりません。</div>
                ) : (
                    <div className="patient-list">
                        {patients.map((patient) => (
                            <button
                                key={patient.id}
                                className="patient-list-card"
                                onClick={() => navigate(`/training/actor/${patient.id}`)}
                            >
                                <div className="patient-list-card__header">
                                    <span className="patient-list-card__id">ID: {patient.base_patient_id || patient.id}</span>
                                </div>
                                <div className="patient-list-card__info">
                                    {patient.age}歳 {patient.gender === 'M' ? '男性' : '女性'}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default PatientActorListPage
