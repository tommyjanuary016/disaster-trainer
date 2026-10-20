import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatientFlexible, updatePatientFlags, subscribeToAllPatients, startTreatmentTimer } from '../lib/firestore'
import { Patient } from '../types/patient'
import { startRobustQRScanner } from '../lib/qrScannerHelper'
import { CameraFallbackUI } from '../components/CameraFallbackUI'

const RadiologyScanPage: React.FC = () => {
    const navigate = useNavigate()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [sessionPatients, setSessionPatients] = useState<Patient[]>([]) // セッション患者一覧

    const [isCameraActive, setIsCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState<any>(null)

    useEffect(() => {
        if (patient || !isCameraActive) return // 患者表示中またはカメラ停止中はスキャナーを停止

        setCameraError(null)
        const stopScanner = startRobustQRScanner('rad-reader', (decodedText) => {
            handleScan(decodedText)
        }, (err) => {
            console.error('Radiology scanner error:', err)
            setCameraError(err)
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

    const [selectedExam, setSelectedExam] = useState<string>('xray')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const RADIOLOGY_EXAMS = [
        { id: 'xray', name: 'レントゲン', minutes: 3 },
        { id: 'ct', name: 'CT', minutes: 5 },
        { id: 'mri', name: 'MRI', minutes: 10 },
        { id: 'contrast_ct', name: '造影CT', minutes: 10 },
    ]

    const handleStartExam = async () => {
        if (!patient || isSubmitting) return
        const exam = RADIOLOGY_EXAMS.find(e => e.id === selectedExam)
        if (!exam) return

        setIsSubmitting(true)
        try {
            // 画像結果をプレイヤーに解放（tests_completedフラグを更新）
            await updatePatientFlags(patient.id, { tests_completed: true })
            // 患者画面を拘束時間分ロック
            await startTreatmentTimer(patient.id, exam.id, exam.minutes)
            alert(`${exam.name}検査を開始しました。\n患者画面を【${exam.minutes}分間】拘束・ロックし、画像結果を送信しました。`)
            setPatient(null)
        } catch (err: any) {
            console.error('Failed to start radiology exam:', err)
            if (err.message === 'ALREADY_LOCKED') {
                alert('⚠️ 対象の患者はすでに他の処置・検査で画面ロック中です。')
            } else {
                alert(`エラーが発生しました: ${err.message || '処理を完了できませんでした'}`)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    if (patient) {
        const currentExam = RADIOLOGY_EXAMS.find(e => e.id === selectedExam)
        return (
            <div className="page" style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
                <h2>放射線科 - 検査受付・実施システム</h2>
                <div className="card card--elevated">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <h3 className="card__title" style={{ margin: 0 }}>{patient.name} 様</h3>
                        <span className={`triage-badge triage-badge--sm triage-${patient.triage_color === '赤' ? 'red' : patient.triage_color === '黄' ? 'yellow' : patient.triage_color === '緑' ? 'green' : 'black'}`}>
                            {patient.triage_color || '未'}
                        </span>
                    </div>

                    <p style={{ marginBottom: '1.2rem', fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                        実施する検査内容を選択してください。選択した検査に応じて患者端末画面が一定時間ロックされます。
                    </p>

                    {/* 検査選択エリア */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                            【実施検査の選択】
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            {RADIOLOGY_EXAMS.map(exam => {
                                const isSelected = selectedExam === exam.id
                                return (
                                    <button
                                        key={exam.id}
                                        type="button"
                                        onClick={() => setSelectedExam(exam.id)}
                                        style={{
                                            padding: '0.75rem 0.6rem',
                                            borderRadius: '8px',
                                            border: isSelected ? '2px solid #2563eb' : '1px solid var(--gray-300)',
                                            backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.2rem',
                                            textAlign: 'center',
                                            boxShadow: isSelected ? '0 0 0 1px #2563eb' : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: isSelected ? '#1e40af' : '#1f2937' }}>
                                            {exam.name}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: isSelected ? '#2563eb' : '#6b7280', fontWeight: 'bold' }}>
                                            🔒 ロック: {exam.minutes}分
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1.2rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>選択中: {currentExam?.name}</span>
                            <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 'bold' }}>患者画面拘束時間: {currentExam?.minutes}分</span>
                        </div>
                        <h4 style={{ margin: '0.4rem 0 0.3rem 0', fontSize: '0.85rem', color: '#64748b' }}>【登録画像URL確認】</h4>
                        {patient.image_urls && patient.image_urls.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                                {patient.image_urls.map((url, i) => (
                                    <li key={i}>
                                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>{url}</a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>登録画像なし（結果テキストまたは事前URLなし）</p>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button
                            type="button"
                            onClick={handleStartExam}
                            disabled={isSubmitting}
                            className="button button--primary"
                            style={{ flex: 1, padding: '0.8rem', fontSize: '1rem', fontWeight: 'bold' }}
                        >
                            {isSubmitting ? '処理中...' : `${currentExam?.name}を開始（患者画面を${currentExam?.minutes}分ロック）`}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPatient(null)}
                            disabled={isSubmitting}
                            className="button button--secondary"
                            style={{ width: 'auto', padding: '0.8rem 1.2rem' }}
                        >
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
                <button onClick={() => navigate('/role-select')} className="button button--secondary" style={{width: 'auto', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    役割選択
                </button>
            </header>

            {/* タイトルバナー（放射線科のデフォルト色） */}
            <div className="scanner-hero">
                <h2 className="scanner-hero__title">患者スキャン（放射線科）</h2>
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
                    <div id="rad-reader" className="qr-reader custom-qr-scanner"></div>
                </div>
            )}

            {cameraError && (
                <div style={{ margin: '0 1.25rem 1rem' }}>
                    <CameraFallbackUI
                        error={cameraError}
                        onScanSuccess={(text) => handleScan(text)}
                        onRetry={() => {
                            setCameraError(null)
                            setIsCameraActive(false)
                            setTimeout(() => setIsCameraActive(true), 100)
                        }}
                    />
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

export default RadiologyScanPage
