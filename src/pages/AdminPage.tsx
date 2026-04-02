import React, { useEffect, useState } from 'react'
import { fetchAllPatients, createPatient, seedPatientsToFirestore, activeSessionId, setActiveSession, createTrainingSession, SessionConfig } from '../lib/firestore'
import { Patient } from '../types/patient'
import PatientForm from '../components/PatientForm'
import { useNavigate } from 'react-router-dom'
import { parseCSV, mapCSVToPatients, exportCSV } from '../lib/csv'

const AdminPage: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([])
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
    const [isFormVisible, setIsFormVisible] = useState(false)
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
    const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
        totalPatients: 20,
        redRatio: 20,
        yellowRatio: 30,
        greenRatio: 40,
        blackRatio: 10,
        sortBySeverity: true
    })
    const navigate = useNavigate()

    const loadPatients = async () => {
        const data = await fetchAllPatients()
        setPatients(data)
    }

    useEffect(() => {
        loadPatients()
    }, [])

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = async (event) => {
            const text = event.target?.result as string
            if (text) {
                try {
                    const rows = parseCSV(text)
                    const newPatients = mapCSVToPatients(rows)
                    if (newPatients.length > 0) {
                        if (window.confirm(`${newPatients.length}件の患者データをインポートしますか？\n(既存の同IDデータは上書きされます)`)) {
                            // 簡易ローディング表示の代わり
                            document.body.style.cursor = 'wait'
                            await seedPatientsToFirestore(newPatients)
                            document.body.style.cursor = 'default'
                            alert('CSVインポートが完了しました。')
                            loadPatients()
                        }
                    } else {
                        alert('有効なデータが見つかりませんでした。ヘッダー行を確認してください。')
                    }
                } catch (err) {
                    console.error('CSV Parsing error:', err)
                    alert('CSVの解析中にエラーが発生しました。')
                }
            }
        }
        reader.readAsText(file)
        // 同じファイルを選び直せるようにリセット
        e.target.value = ''
    }

    const handleAddClick = () => {
        setEditingPatient(null)
        setIsFormVisible(true)
    }

    const handleEditClick = (patient: Patient) => {
        setEditingPatient(patient)
        setIsFormVisible(true)
    }

    const handleFormSubmit = async (patient: Patient) => {
        await createPatient(patient)
        setIsFormVisible(false)
        loadPatients()
    }

    const handleFormCancel = () => {
        setIsFormVisible(false)
        setEditingPatient(null)
    }

    const handleCreateSession = async () => {
        const totalRatio = sessionConfig.redRatio + sessionConfig.yellowRatio + sessionConfig.greenRatio + sessionConfig.blackRatio
        if (totalRatio !== 100) {
            alert('重症度の割合の合計は100%にしてください')
            return
        }
        if (window.confirm('新しい訓練セッションを開始しますか？現在進行中のセッション患者はクリアされます。')) {
            document.body.style.cursor = 'wait'
            await createTrainingSession(sessionConfig)
            document.body.style.cursor = 'default'
            setIsSessionModalOpen(false)
            loadPatients()
            alert('新しいセッションを作成しました。')
        }
    }

    const handleClearSession = () => {
        if (window.confirm('現在のセッションを終了し、全マスターデータを表示しますか？')) {
            setActiveSession(null)
            loadPatients()
        }
    }

    const handleExportCSV = () => {
        if (patients.length === 0) {
            alert('エクスポートするデータがありません。')
            return
        }
        const csvContent = exportCSV(patients)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `training_log_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="page admin-page">
            <header className="admin-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '1rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
                    <div>
                        <h1>管理画面 (Admin)</h1>
                        <p style={{fontSize: '0.8rem', color: 'var(--gray-500)', margin: 0}}>
                            現在の状態: {activeSessionId ? `訓練中 (${activeSessionId})` : 'マスターデータ編集中'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => navigate('/')} className="app-header__back" style={{position: 'static', transform: 'none', background: 'var(--gray-100)'}}>
                            ホームへ
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setIsSessionModalOpen(true)}
                        className="button button--primary"
                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                        新規訓練セッション開始
                    </button>
                    {activeSessionId && (
                        <>
                            <button
                                onClick={handleExportCSV}
                                className="button button--secondary"
                                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#3b82f6', color: '#1d4ed8' }}
                            >
                                ↓ ダウンロード (振り返り用CSV)
                            </button>
                            <button
                                onClick={handleClearSession}
                                className="button button--secondary"
                                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            >
                                セッション終了 (全データ表示)
                            </button>
                        </>
                    )}
                    <label className="button button--secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center' }}>
                        マスターCSVインポート
                        <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVUpload} />
                    </label>
                    <button
                        onClick={() => navigate('/qr-generator')}
                        className="button button--secondary"
                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                        QRコード生成
                    </button>
                </div>
            </header>

            <main className="page__content">
                {isSessionModalOpen && (
                    <div className="card card--elevated" style={{ marginBottom: '2rem' }}>
                        <h3 className="card__title">新規訓練セッション設定</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">対象患者数</label>
                                <input type="number" min="1" value={sessionConfig.totalPatients} onChange={e => setSessionConfig({...sessionConfig, totalPatients: parseInt(e.target.value) || 10})} className="input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">搬入順 (トリアージ優先)</label>
                                <select value={sessionConfig.sortBySeverity ? 'yes' : 'no'} onChange={e => setSessionConfig({...sessionConfig, sortBySeverity: e.target.value === 'yes'})} className="input">
                                    <option value="yes">重症度順（優先度高い順）</option>
                                    <option value="no">完全ランダム</option>
                                </select>
                            </div>
                        </div>
                        <h4 style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>重症度割合 (合計100%)</h4>
                        <div className="form-grid form-grid--2col" style={{marginBottom: '1rem'}}>
                            <div className="form-group">
                                <label className="form-label" style={{color: 'var(--status-red)'}}>赤 (%)</label>
                                <input type="number" min="0" value={sessionConfig.redRatio} onChange={e => setSessionConfig({...sessionConfig, redRatio: parseInt(e.target.value) || 0})} className="input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{color: '#d97706'}}>黄 (%)</label>
                                <input type="number" min="0" value={sessionConfig.yellowRatio} onChange={e => setSessionConfig({...sessionConfig, yellowRatio: parseInt(e.target.value) || 0})} className="input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{color: 'var(--status-green)'}}>緑 (%)</label>
                                <input type="number" min="0" value={sessionConfig.greenRatio} onChange={e => setSessionConfig({...sessionConfig, greenRatio: parseInt(e.target.value) || 0})} className="input" />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{color: 'var(--status-black)'}}>黒 (%)</label>
                                <input type="number" min="0" value={sessionConfig.blackRatio} onChange={e => setSessionConfig({...sessionConfig, blackRatio: parseInt(e.target.value) || 0})} className="input" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={handleCreateSession} className="button button--primary">生成実行</button>
                            <button onClick={() => setIsSessionModalOpen(false)} className="button button--secondary">キャンセル</button>
                        </div>
                    </div>
                )}
                {isFormVisible ? (
                    <PatientForm
                        initialPatient={editingPatient}
                        onSubmit={handleFormSubmit}
                        onCancel={handleFormCancel}
                    />
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{fontSize: '1.1rem', fontWeight: '700'}}>患者データ一覧</h2>
                            <button onClick={handleAddClick} className="button button--primary" style={{width: 'auto', padding: '0.5rem 1rem'}}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '4px'}}>
                                    <path d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                追加
                            </button>
                        </div>

                        <div className="patient-list">
                            {patients.length === 0 ? (
                                <p style={{textAlign: 'center', color: 'var(--gray-500)', padding: '2rem'}}>患者データがありません。</p>
                            ) : (
                                patients.map((p, index) => (
                                    <div key={p.id} className="patient-list-item" style={{ '--index': index } as React.CSSProperties}>
                                        <div className="patient-list-item__header">
                                            <div>
                                                <div className="patient-list-item__name">{p.name}</div>
                                                <div className="patient-list-item__meta">ID: {String(p.id).padStart(4, '0')}</div>
                                            </div>
                                            <span className={`triage-badge triage-badge--sm triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'}`}>
                                                {p.triage_color}
                                            </span>
                                        </div>
                                        <div className="info-row" style={{padding: '0.25rem 0'}}>
                                            <span className="info-row__label">診断</span>
                                            <span className="info-row__value">{p.diagnosis}</span>
                                        </div>
                                        <div className="info-row" style={{padding: '0.25rem 0'}}>
                                            <span className="info-row__label">必要処置</span>
                                            <span className="info-row__value">
                                                {p.required_treatments?.map(rt => rt.treatment_name).join(', ') || 'なし'}
                                            </span>
                                        </div>
                                        <div className="info-row" style={{padding: '0.25rem 0'}}>
                                            <span className="info-row__label">拘束時間</span>
                                            <span className="info-row__value">
                                                {p.required_treatments?.map(rt => `${rt.lock_timer_minutes}分`).join(', ') || 'なし'}
                                            </span>
                                        </div>
                                        <div className="actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: 'var(--border)' }}>
                                            <button
                                                className="button button--secondary"
                                                onClick={() => handleEditClick(p)}
                                                style={{padding: '0.5rem'}}
                                            >
                                                編集
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

export default AdminPage
