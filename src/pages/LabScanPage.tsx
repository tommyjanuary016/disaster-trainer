import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseQRCode } from '../types/qr'
import { fetchPatientFlexible, updatePatientFlags, subscribeToAllPatients, startTreatmentTimer } from '../lib/firestore'
import { Patient } from '../types/patient'
import { startRobustQRScanner } from '../lib/qrScannerHelper'
import { CameraFallbackUI } from '../components/CameraFallbackUI'

const LabScanPage: React.FC = () => {
    const navigate = useNavigate()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [sessionPatients, setSessionPatients] = useState<Patient[]>([]) // セッション患者一覧

    const [isCameraActive, setIsCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState<any>(null)

    useEffect(() => {
        if (patient || !isCameraActive) return

        setCameraError(null)
        const stopScanner = startRobustQRScanner('lab-reader', (decodedText) => {
            handleScan(decodedText)
        }, (err) => {
            console.error('Lab scanner error:', err)
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

    const [selectedLabExam, setSelectedLabExam] = useState<string>('blood_test')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const LAB_EXAMS = [
        { id: 'blood_test', name: '血液検査', minutes: 0 },
        { id: 'blood_gas', name: '血液ガス分析', minutes: 0 },
        { id: 'ecg', name: '心電図', minutes: 3 },
        { id: 'echocardiography', name: '心エコー', minutes: 5 },
        { id: 'other_echo', name: 'その他エコー', minutes: 10 },
    ]

    const handleStartLabExam = async () => {
        if (!patient || isSubmitting) return
        const exam = LAB_EXAMS.find(e => e.id === selectedLabExam)
        if (!exam) return

        setIsSubmitting(true)
        try {
            // 検査結果をプレイヤーに解放（tests_completedフラグを更新）
            await updatePatientFlags(patient.id, { tests_completed: true })

            if (exam.minutes > 0) {
                // ロックあり検査（心電図3分、心エコー5分、その他エコー10分）
                await startTreatmentTimer(patient.id, exam.id, exam.minutes)
                alert(`${exam.name}検査を開始しました。\n患者画面を【${exam.minutes}分間】拘束・ロックし、検査結果を送信しました。`)
            } else {
                // ロックなし検査（血液検査、血液ガス分析）
                alert(`${exam.name}の結果を訓練プレイヤーに送信しました。(※患者画面ロックなし)`)
            }
            setPatient(null)
        } catch (err: any) {
            console.error('Failed to start lab exam:', err)
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
        const currentExam = LAB_EXAMS.find(e => e.id === selectedLabExam)
        return (
            <div className="page" style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
                <h2>検査科 - 検査受付・実施システム</h2>
                <div className="card card--elevated">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <h3 className="card__title" style={{ margin: 0 }}>{patient.name} 様</h3>
                        <span className={`triage-badge triage-badge--sm triage-${patient.triage_color === '赤' ? 'red' : patient.triage_color === '黄' ? 'yellow' : patient.triage_color === '緑' ? 'green' : 'black'}`}>
                            {patient.triage_color || '未'}
                        </span>
                    </div>

                    <p style={{ marginBottom: '1.2rem', fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                        実施する検査内容を選択してください。心電図やエコーを選択した場合は所定時間、患者端末画面がロックされます。
                    </p>

                    {/* 検査選択エリア */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                            【実施検査の選択】
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            {LAB_EXAMS.map(exam => {
                                const isSelected = selectedLabExam === exam.id
                                return (
                                    <button
                                        key={exam.id}
                                        type="button"
                                        onClick={() => setSelectedLabExam(exam.id)}
                                        style={{
                                            padding: '0.75rem 0.6rem',
                                            borderRadius: '8px',
                                            border: isSelected ? '2px solid #059669' : '1px solid var(--gray-300)',
                                            backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.2rem',
                                            textAlign: 'center',
                                            boxShadow: isSelected ? '0 0 0 1px #059669' : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: isSelected ? '#065f46' : '#1f2937' }}>
                                            {exam.name}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: isSelected ? '#059669' : '#6b7280', fontWeight: 'bold' }}>
                                            {exam.minutes > 0 ? `🔒 ロック: ${exam.minutes}分` : '🔓 ロックなし'}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1.2rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>選択中: {currentExam?.name}</span>
                            <span style={{ fontSize: '0.85rem', color: currentExam && currentExam.minutes > 0 ? '#dc2626' : '#059669', fontWeight: 'bold' }}>
                                {currentExam && currentExam.minutes > 0 ? `患者画面拘束時間: ${currentExam.minutes}分` : '患者画面拘束: なし'}
                            </span>
                        </div>
                        <h4 style={{ margin: '0.4rem 0 0.3rem 0', fontSize: '0.85rem', color: '#64748b' }}>【登録血液検査データ確認】</h4>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: patient.blood_test_data ? '#1e293b' : '#94a3b8' }}>
                            {patient.blood_test_data || '血液検査データは登録されていません。'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button
                            type="button"
                            onClick={handleStartLabExam}
                            disabled={isSubmitting}
                            className="button button--primary"
                            style={{ flex: 1, padding: '0.8rem', fontSize: '1rem', fontWeight: 'bold' }}
                        >
                            {isSubmitting ? '処理中...' : currentExam && currentExam.minutes > 0
                                ? `${currentExam.name}を開始（患者画面を${currentExam.minutes}分ロック）`
                                : `${currentExam?.name}結果を送信（即時完了）`
                            }
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
                <h1>検査科 受付システム</h1>
                <button onClick={() => navigate('/role-select')} className="button button--secondary" style={{width: 'auto', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    役割選択
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

export default LabScanPage
