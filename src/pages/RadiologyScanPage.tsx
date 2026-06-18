import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatient, updatePatientFlags, subscribeToAllPatients } from '../lib/firestore'
import { Patient } from '../types/patient'

const RadiologyScanPage: React.FC = () => {
    const navigate = useNavigate()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [manualId, setManualId] = useState('')
    const [showManual, setShowManual] = useState(false) // サブ：手入力表示制御
    const [sessionPatients, setSessionPatients] = useState<Patient[]>([]) // セッション患者一覧

    useEffect(() => {
        if (patient) return // 患者表示中はスキャナーを停止

        const scanner = new Html5QrcodeScanner(
            'rad-reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        )

        scanner.render(
            (decodedText) => {
                handleScan(decodedText)
                scanner.clear()
            },
            () => {}
        )

        return () => {
            scanner.clear().catch(e => console.error(e))
        }
    }, [patient])

    // セッション内の患者一覧を購読（患者ID手入力時の表示用）
    useEffect(() => {
        const unsub = subscribeToAllPatients((patients) => {
            setSessionPatients(patients)
        })
        return () => unsub()
    }, [])

    const handleScan = async (text: string) => {
        const parsed = parseQRCode(text)
        if (!parsed || parsed.type !== 'patient') {
            setError('無効なQRです。患者病着QRを読み取ってください。')
            return
        }

        setError(null)
        const p = await fetchPatient(parseInt(parsed.id))
        if (p) {
            setPatient(p)
        } else {
            setError('存在しない患者IDです。')
        }
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualId) {
            handleScan(`patient:${manualId}`)
        }
    }

    const handleComplete = async () => {
        if (patient) {
            // 画像結果をプレイヤーに解放し、tests_completedフラグを更新
            await updatePatientFlags(patient.id, { tests_completed: true })
            alert('放射線画像結果を訓練プレイヤーに送信しました。')
            setPatient(null)
            setManualId('')
            setShowManual(false)
        }
    }

    if (patient) {
        return (
            <div className="page" style={{ padding: '1rem' }}>
                <h2>放射線科 - 画像結果提示システム</h2>
                <div className="card card--elevated">
                    <h3 className="card__title">{patient.name} 様</h3>
                    <p style={{marginBottom: '1rem'}}>
                        依頼された画像情報を確認し、訓練生に結果を返却（解放）します。
                    </p>
                    
                    <div style={{ backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <h4 style={{margin: '0 0 0.5rem 0'}}>【画像URLリスト】</h4>
                        {patient.image_urls && patient.image_urls.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                                {patient.image_urls.map((url, i) => (
                                    <li key={i}>
                                        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ margin: 0, color: '#666' }}>画像データは登録されていません。</p>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button onClick={handleComplete} className="button button--primary">
                            結果を送信（手技完了）
                        </button>
                        <button onClick={() => setPatient(null)} className="button button--secondary">
                            キャンセル
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page qr-scanner-page">
            <header className="admin-header">
                <h1>放射線科 受付システム</h1>
                <button onClick={() => navigate('/')} className="button button--secondary" style={{width: 'auto', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    アプリトップへ戻る
                </button>
            </header>

            {/* タイトルバナー（放射線科のデフォルト色） */}
            <div className="scanner-hero">
                <h2 className="scanner-hero__title">患者スキャン（放射線科）</h2>
                <p className="scanner-hero__sub">患者の病着QRを読み取ってください</p>
            </div>

            {/* QRスキャナー（デフォルト表示） */}
            <div className="qr-reader-wrapper">
                <div id="rad-reader" className="qr-reader custom-qr-scanner"></div>
            </div>

            {error && <div className="error-message" style={{ margin: '0 1.25rem 1.25rem' }}>{error}</div>}

            {/* サブ：QRが読めない場合の患者ID入力 */}
            <div style={{ padding: '0 1.25rem 1.5rem' }}>
                {!showManual ? (
                    <button
                        type="button"
                        onClick={() => setShowManual(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--gray-500)',
                            fontSize: '0.8rem',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        QRコードが読み取れない場合はこちら（患者IDを入力）
                    </button>
                ) : (
                    <div style={{
                        backgroundColor: 'var(--gray-50)',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '10px',
                        padding: '1rem',
                    }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: '0.75rem', fontWeight: '600' }}>
                            QRコードが読み取れない場合 — 患者IDを入力
                        </p>

                        {/* セッション参加患者の一覧 */}
                        {sessionPatients.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
                                    セッション参加患者一覧（タップで即選択）:
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {sessionPatients.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleScan(`patient:${p.id}`)}
                                            style={{
                                                padding: '0.3rem 0.7rem',
                                                fontSize: '0.8rem',
                                                borderRadius: '20px',
                                                border: '1px solid var(--gray-300)',
                                                background: 'white',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {p.base_patient_id || p.id}番
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>患者ID番号を直接入力</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={manualId}
                                    onChange={(e) => setManualId(e.target.value)}
                                    placeholder="例: 101"
                                    className="input"
                                    style={{ marginTop: '0.25rem' }}
                                />
                            </div>
                            <button type="submit" className="button button--primary" disabled={!manualId} style={{ width: 'auto', padding: '0.6rem 1rem', flexShrink: 0 }}>
                                検索
                            </button>
                        </form>
                        <button
                            type="button"
                            onClick={() => setShowManual(false)}
                            style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--gray-400)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                        >
                            閉じる
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default RadiologyScanPage
