import React, { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatient } from '../lib/firestore'
import { Patient } from '../types/patient'
import QRConfirmModal from '../components/QRConfirmModal'

const QRScannerPage: React.FC = () => {
    const navigate = useNavigate()
    const [manualId, setManualId] = useState('')
    const [error, setError] = useState<string | null>(null)
    // 確認モーダル用の状態
    const [pendingPatientId, setPendingPatientId] = useState<string | null>(null)
    const [pendingPatient, setPendingPatient] = useState<Patient | null>(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (showModal) return // モーダル表示中はスキャナーを起動しない

        const scanner = new Html5QrcodeScanner(
            'reader',
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
    }, [showModal])

    const handleScan = async (text: string) => {
        const parsed = parseQRCode(text)

        if (!parsed || parsed.type !== 'patient') {
            setError('無効なQRコードです。患者QR（病着に貼付）を読み取ってください。')
            return
        }

        setError(null)
        // 患者情報を取得して確認モーダルを表示
        const patientId = parsed.id
        const patient = await fetchPatient(parseInt(patientId))
        setPendingPatientId(patientId)
        setPendingPatient(patient)
        setShowModal(true)
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualId) {
            handleScan(`patient:${manualId}`)
        }
    }

    const handleConfirm = () => {
        if (pendingPatientId) {
            navigate(`/patient/${pendingPatientId}`)
        }
    }

    const handleCancel = () => {
        setShowModal(false)
        setPendingPatientId(null)
        setPendingPatient(null)
    }

    return (
        <div className="page qr-scanner-page">
            {/* QR確認モーダル */}
            {showModal && pendingPatientId && (
                <QRConfirmModal
                    parsed={{ type: 'patient', id: pendingPatientId }}
                    patient={pendingPatient}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}

            <div className="scanner-hero">
                <div className="scanner-hero__icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4H10V10H4V4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 4H20V10H14V4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 14H10V20H4V14Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 14H17V17H14V14Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 17H20V20H17V17Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 20H17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 14V17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h2 className="scanner-hero__title">患者スキャン</h2>
                <p className="scanner-hero__sub">患者の病着QRを読み取ってください</p>
            </div>

            <div className="qr-reader-wrapper">
                <div id="reader" className="qr-reader custom-qr-scanner"></div>
            </div>

            {error && <div className="error-message" style={{ margin: '0 1.25rem 1.25rem' }}>{error}</div>}

            <div className="divider">
                <span>OR</span>
            </div>

            <div className="manual-entry">
                <form onSubmit={handleManualSubmit} className="manual-entry__form">
                    <div className="form-group">
                        <label>患者ID（開発用手入力）</label>
                        <input
                            type="number"
                            value={manualId}
                            onChange={(e) => setManualId(e.target.value)}
                            placeholder="例: 101"
                            className="input"
                        />
                    </div>
                    <button type="submit" className="button button--primary" disabled={!manualId}>
                        ID検索
                    </button>
                    <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => navigate('/admin')}
                        style={{ marginTop: '0.5rem' }}
                    >
                        管理画面
                    </button>
                    <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => navigate('/actor')}
                        style={{ marginTop: '0.5rem' }}
                    >
                        模擬患者モード
                    </button>
                </form>
            </div>
        </div>
    )
}

export default QRScannerPage
