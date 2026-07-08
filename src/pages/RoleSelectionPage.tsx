import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole, Role } from '../hooks/useRole'
import { activeSessionId } from '../lib/firestore'

const RoleSelectionPage: React.FC = () => {
    const navigate = useNavigate()
    const { setRole } = useRole()
    const [showShareModal, setShowShareModal] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)

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

    const shareUrl = `${window.location.origin}/?session_id=${activeSessionId}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 2000)
        }).catch(err => {
            console.error('コピー失敗:', err)
        })
    }

    return (
        <div className="page" style={{ padding: '1rem', position: 'relative' }}>
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

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
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

                {/* 共有セクション */}
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--gray-400)', fontWeight: 500 }}>
                        🔗 この訓練セッションを他のプレイヤーに共有
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                            className="button button--secondary"
                            style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                            onClick={handleCopyLink}
                        >
                            {copySuccess ? '✅ コピー完了' : '📋 リンクをコピー'}
                        </button>
                        <button
                            className="button button--secondary"
                            style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                            onClick={() => setShowShareModal(true)}
                        >
                            📱 QRコードを表示
                        </button>
                    </div>
                </div>

                <button
                    className="button"
                    style={{ marginTop: '1.5rem', background: 'transparent', color: 'var(--gray-500)', border: 'none', textDecoration: 'underline' }}
                    onClick={() => navigate('/')}
                >
                    セッション選択に戻る
                </button>
            </div>

            {/* QRコード共有モーダル */}
            {showShareModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1rem'
                    }}
                    onClick={() => setShowShareModal(false)}
                >
                    <div 
                        style={{
                            backgroundColor: '#1e293b',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            maxWidth: '320px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>セッションに参加</h3>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                            他の端末のカメラでスキャンすると、このセッションに直接参加できます。
                        </p>
                        <div style={{ 
                            backgroundColor: '#ffffff', 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            display: 'inline-block',
                            marginBottom: '1.25rem',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}>
                            <img 
                                src={qrUrl} 
                                alt="Session QR Code" 
                                style={{ display: 'block', width: '200px', height: '200px' }} 
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button 
                                className="button button--primary" 
                                onClick={handleCopyLink}
                                style={{ width: '100%' }}
                            >
                                {copySuccess ? '✅ コピー完了' : '📋 リンクをコピー'}
                            </button>
                            <button 
                                className="button button--secondary" 
                                onClick={() => setShowShareModal(false)}
                                style={{ width: '100%' }}
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RoleSelectionPage

