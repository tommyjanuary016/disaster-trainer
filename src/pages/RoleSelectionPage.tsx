import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole, Role } from '../hooks/useRole'
import { activeSessionId } from '../lib/firestore'

const RoleSelectionPage: React.FC = () => {
    const navigate = useNavigate()
    const { setRole } = useRole()

    const handleSelectRole = (role: Role | '模擬患者', path: string) => {
        if (role !== '模擬患者') {
            setRole(role as Role)
        }
        navigate(path)
    }

    if (!activeSessionId) {
        return (
            <div className="page" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>セッションが選択されていません</p>
                <button className="button button--primary" onClick={() => navigate('/')}>
                    トップに戻る
                </button>
            </div>
        )
    }

    return (
        <div className="page" style={{ padding: '1rem' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center', marginTop: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>役割を選択してください</h1>
                <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>あなたの担当する役割を選んで訓練を開始します</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
                <button
                    className="button button--primary"
                    style={{ padding: '1.5rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}
                    onClick={() => handleSelectRole('医師', '/training')}
                >
                    <span style={{ fontSize: '2rem' }}>🩺</span>
                    医師 / 看護師 (診察役)
                </button>
                
                <button
                    className="button button--secondary"
                    style={{ padding: '1.5rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', borderColor: '#f97316', color: '#ea580c' }}
                    onClick={() => handleSelectRole('模擬患者', '/training/actor')}
                >
                    <span style={{ fontSize: '2rem' }}>🎭</span>
                    模擬患者役
                </button>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        className="button button--secondary"
                        style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => handleSelectRole('放射線技師', '/training/radiology')}
                    >
                        <span style={{ fontSize: '1.5rem' }}>☢️</span>
                        放射線技師
                    </button>
                    <button
                        className="button button--secondary"
                        style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => handleSelectRole('臨床検査技師', '/training/lab')}
                    >
                        <span style={{ fontSize: '1.5rem' }}>🩸</span>
                        臨床検査技師
                    </button>
                </div>

                <button
                    className="button"
                    style={{ marginTop: '2rem', background: 'transparent', color: 'var(--gray-500)', border: 'none', textDecoration: 'underline' }}
                    onClick={() => navigate('/')}
                >
                    セッション選択に戻る
                </button>
            </div>
        </div>
    )
}

export default RoleSelectionPage
