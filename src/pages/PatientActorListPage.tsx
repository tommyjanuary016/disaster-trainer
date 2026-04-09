import React from 'react'
import { useNavigate } from 'react-router-dom'
import { mockPatients } from '../data/mockData'

const PatientActorListPage: React.FC = () => {
    const navigate = useNavigate()

    return (
        <div className="actor-list-page">
            <h2 className="actor-title">担当患者を選択</h2>
            <div className="patient-list">
                {mockPatients.map((patient) => (
                    <button
                        key={patient.id}
                        className="patient-list-card"
                        onClick={() => navigate(`/training/actor/${patient.id}`)}
                    >
                        <div className="patient-list-card__header">
                            <span className="patient-list-card__id">ID: {patient.id}</span>
                        </div>
                        <div className="patient-list-card__info">
                            {patient.age}歳 {patient.gender === 'M' ? '男性' : '女性'}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default PatientActorListPage
