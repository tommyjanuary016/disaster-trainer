import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatient, updatePatientFlags } from '../lib/firestore'
import { Patient } from '../types/patient'

const RadiologyScanPage: React.FC = () => {
    const navigate = useNavigate()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [manualId, setManualId] = useState('')

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
                <button onClick={() => navigate('/')} className="button button--secondary" style={{width: 'auto', padding: '0.5rem 1rem'}}>
                    トップへ戻る
                </button>
            </header>

            <div className="scanner-hero">
                <h2 className="scanner-hero__title">患者スキャン（放射線科）</h2>
                <p className="scanner-hero__sub">患者の病着QRを読み取ってください</p>
            </div>

            <div className="qr-reader-wrapper">
                <div id="rad-reader" className="qr-reader custom-qr-scanner"></div>
            </div>

            {error && <div className="error-message" style={{ margin: '0 1.25rem 1.25rem' }}>{error}</div>}

            <div className="manual-entry">
                <form onSubmit={handleManualSubmit} className="manual-entry__form">
                    <div className="form-group">
                        <label>患者ID（開発用手入力）</label>
                        <input
                            type="number"
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value)}
                            className="input"
                        />
                    </div>
                    <button type="submit" className="button button--primary" disabled={!manualId}>
                        IDを送信
                    </button>
                </form>
            </div>
        </div>
    )
}

export default RadiologyScanPage
