import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatientFlexible, updatePatientFlags, subscribeToAllPatients } from '../lib/firestore'
import { Patient } from '../types/patient'
import { startRobustQRScanner } from '../lib/qrScannerHelper'

const LabScanPage: React.FC = () => {
    const navigate = useNavigate()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [sessionPatients, setSessionPatients] = useState<Patient[]>([]) // セッション患者一覧

    const [isCameraActive, setIsCameraActive] = useState(true)

    useEffect(() => {
        if (patient || !isCameraActive) return

        const stopScanner = startRobustQRScanner('lab-reader', (decodedText) => {
            handleScan(decodedText)
        }, (err) => {
            console.error('Lab scanner error:', err)
        })

        return () => {
            stopScanner()
        }
    }, [patient, isCameraActive])

    // セッション内の患者一覧を購読（患者ID手入力時の表示用）
    useEffect(() => {
        const unsub = subscribeToAllPatients((patients) => {
            setSessionPatients(patients)
        })
        return () => unsub()
    }, [])

    const handleScan = async (text: string) => {
        let rawId = text
        if (text.startsWith('patient:')) {
            rawId = text.slice(8)
        } else {
            const parsed = parseQRCode(text)
            if (parsed && parsed.type === 'patient') {
                rawId = parsed.id
            }
        }

        setError(null)
        const p = await fetchPatientFlexible(rawId)
        if (p) {
            setPatient(p)
        } else {
            setError(`該当する患者が見つかりません (入力・読み取り値: ${rawId})`)
        }
    }

    const handleComplete = async () => {
        if (patient) {
            // 血液検査結果をプレイヤーに解放するのみ（悪化タイマーは停止しない）
            await updatePatientFlags(patient.id, { tests_completed: true })
            alert('血液検査結果を訓練プレイヤーに送信しました。(※タイマーは継続します)')
            setPatient(null)
        }
    }

    if (patient) {
        return (
            <div className="page" style={{ padding: '1rem' }}>
                <h2>検査科 - 血液検査結果システム</h2>
                <div className="card card--elevated">
                    <h3 className="card__title">{patient.name} 様</h3>
                    <p style={{marginBottom: '1rem'}}>
                        依頼された血液検査情報を確認し、訓練生に結果を返却（解放）します。
                    </p>
                    
                    <div style={{ backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <h4 style={{margin: '0 0 0.5rem 0'}}>【血液データ】</h4>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {patient.blood_test_data || '血液検査データは登録されていません。'}
                        </p>
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
                <h1>検査科 受付システム</h1>
                <button onClick={() => navigate('/')} className="button button--secondary" style={{width: 'auto', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                    ＜ アプリトップへ戻る
                </button>
            </header>

            {/* タイトルバナー（放射線科と同じスタイルに統一） */}
            <div className="scanner-hero">
                <h2 className="scanner-hero__title">患者スキャン（検査科）</h2>
                <p className="scanner-hero__sub">カメラ起動ボタンを押すか、下部の患者選択から選択してください</p>
            </div>

            <div style={{ textAlign: 'center', margin: '0.75rem 1.25rem' }}>
                {!isCameraActive ? (
                    <button
                        type="button"
                        onClick={() => setIsCameraActive(true)}
                        className="button button--primary"
                        style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        📷 カメラを起動する
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsCameraActive(false)}
                        className="button button--secondary"
                        style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        ⏹️ カメラを停止する
                    </button>
                )}
            </div>

            {/* QRスキャナー */}
            {isCameraActive && (
                <div className="qr-reader-wrapper">
                    <div id="lab-reader" className="qr-reader custom-qr-scanner"></div>
                </div>
            )}

            {error && <div className="error-message" style={{ margin: '0 1.25rem 1.25rem' }}>{error}</div>}

            {/* QRコードが読み取れない場合の患者選択エリア */}
            <div style={{ padding: '0 1.25rem 1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>
                    📋 QRコードが読めない場合の患者選択
                </h3>
                {sessionPatients.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>参加患者データを読み込んでいます...</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem' }}>
                        {sessionPatients.map((p, idx) => (
                            <button
                                key={p.id}
                                type="button"
                                className="button button--secondary"
                                style={{
                                    padding: '0.6rem 0.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    borderRadius: '10px',
                                    border: '1px solid var(--gray-200)',
                                    boxShadow: 'var(--shadow-sm)',
                                }}
                                onClick={() => handleScan(`patient:${p.id}`)}
                            >
                                <span className={`triage-badge triage-badge--sm triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'}`}>
                                    {p.triage_color || '未'}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.3rem' }}>
                                    No.{idx + 1} {p.name}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                    (ID: {p.base_patient_id || p.id})
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default LabScanPage
