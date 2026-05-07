import React, { useEffect, useState } from 'react'
import { createPatient, createTrainingSession, setActiveSession, activeSessionId, endTrainingSession, subscribeToAllPatients, SessionConfig, seedPatientsToFirestore } from '../lib/firestore'
import { Patient } from '../types/patient'
import PatientForm from '../components/PatientForm'
import { useNavigate, useLocation } from 'react-router-dom'
import { parseCSV, mapCSVToPatients, exportCSV, exportMasterCSV } from '../lib/csv'
import DashboardTab from '../components/DashboardTab'
import { exportToGoogleSheets } from '../lib/sheetsExport'

const AdminPage: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([])
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
    const [isFormVisible, setIsFormVisible] = useState(false)
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
    const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
        title: '',
        totalPatients: 20,
        redRatio: 20,
        yellowRatio: 40,
        greenRatio: 40,
        blackRatio: 0,
        sortBySeverity: true,
        useBasePatients: true,
        examLockTimeMinutes: 3,
        treatmentLockTimeMinutes: 5,
        isTestMode: false,
    })
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'patients' | 'dashboard' | 'settings'>('patients')
    const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('gas_webhook_url') || '')
    const [isExporting, setIsExporting] = useState(false)
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(activeSessionId)
    const location = useLocation()

    useEffect(() => {
        if (location.state?.action === 'new_session') {
            setIsSessionModalOpen(true)
            // clear state so it doesn't reopen on refresh
            window.history.replaceState({}, document.title)
        }
    }, [location.state?.action])

    useEffect(() => {
        const unsubscribe = subscribeToAllPatients((data) => {
            setPatients(data)
        })
        return () => unsubscribe()
    }, [currentSessionId])

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
        // IDの自動連番 (現在の最大ID + 1)
        const maxId = patients.length > 0 ? Math.max(...patients.map(p => p.id)) : 100
        const nextId = maxId >= 1000000000000 ? 101 : maxId + 1 // 古いDate.nowのIDがあればリセット気味に
        
        // フォームにはまだ initialPatient を渡さない設計になっているため、PatientForm側で props を受け取るか、
        // 編集モードとして渡す形になりますが、新規追加であることがわかるようにします。
        // ここでは新規追加用のダミー患者オブジェクトを渡します。
        setEditingPatient({
            id: nextId,
            name: '',
            age: 30,
            gender: 'M',
            triage_color: '緑',
            vitals_triage: '',
            vitals_initial: '',
            vitals_post: '',
            findings: { head_and_neck: '', chest: '', abdomen_and_pelvis: '', limbs: '', fast: '', ample: '', background: '' },
            diagnosis: '',
            required_treatments: [],
            status: '初期状態',
            assessment_completed: false,
            timer_started_at: null,
            timer_duration_ms: null,
            applied_treatment_id: null
        } as unknown as Patient)
        setIsFormVisible(true)
    }

    const handleEditClick = (patient: Patient) => {
        setEditingPatient(patient)
        setIsFormVisible(true)
    }

    const handleFormSubmit = async (patient: Patient) => {
        await createPatient(patient)
        setIsFormVisible(false)
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
        if (window.confirm('新しい訓練セッションを開始しますか？（現在のセッションも保持されます）')) {
            document.body.style.cursor = 'wait'
            const newSessionId = await createTrainingSession(sessionConfig)
            setCurrentSessionId(newSessionId)
            document.body.style.cursor = 'default'
            setIsSessionModalOpen(false)
            alert('新しいセッションを作成しました。')
        }
    }

    const handleClearSession = async () => {
        if (window.confirm('現在のセッションを終了し、全マスターデータを表示しますか？\n（このセッションは以降「訓練スタート」画面に表示されなくなります）')) {
            if (activeSessionId) {
                await endTrainingSession(activeSessionId)
            }
            setActiveSession(null)
            setCurrentSessionId(null)
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

    const handleExportMasterCSV = () => {
        if (patients.length === 0) {
            alert('エクスポートするデータがありません。')
            return
        }
        const csvContent = exportMasterCSV(patients)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `patient_master_template_${new Date().toISOString().slice(0, 10)}.csv`)
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
                            現在の状態: {currentSessionId ? `訓練中 (${currentSessionId})` : 'マスターデータ編集中'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => navigate('/training')} className="app-header__back" style={{position: 'static', transform: 'none', background: 'var(--gray-100)'}}>
                            訓練トップ
                        </button>
                        <button onClick={() => navigate('/')} className="app-header__back" style={{position: 'static', transform: 'none', background: 'var(--gray-100)'}}>
                            アプリトップ
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {currentSessionId ? (
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
                                訓練終了 (全データ表示に戻る)
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleExportMasterCSV}
                            className="button button--secondary"
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#8b5cf6', color: '#6d28d9' }}
                        >
                            ↓ 患者CSVを一括作成するためのマスターCSV出力
                        </button>
                    )}
                    <label className="button button--secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center' }}>
                        患者CSV一括インポート
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
                            <div className="form-group" style={{gridColumn: 'span 2'}}>
                                <label className="form-label">訓練タイトル</label>
                                <input type="text" placeholder="例: 2026年度 災害時BCP訓練" value={sessionConfig.title} onChange={e => setSessionConfig({...sessionConfig, title: e.target.value})} className="input" />
                            </div>
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
                            <div className="form-group">
                                <label className="form-label">検査デフォルト拘束時間 (分)</label>
                                <input type="number" min="0" value={sessionConfig.examLockTimeMinutes} onChange={e => setSessionConfig({...sessionConfig, examLockTimeMinutes: parseInt(e.target.value) || 0})} className="input" />
                                <span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>X線, CT, 採血などに適用</span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">手技デフォルト拘束時間 (分)</label>
                                <input type="number" min="0" value={sessionConfig.treatmentLockTimeMinutes} onChange={e => setSessionConfig({...sessionConfig, treatmentLockTimeMinutes: parseInt(e.target.value) || 0})} className="input" />
                                <span style={{fontSize: '0.75rem', color: 'var(--gray-500)'}}>点滴や外科処置などに適用</span>
                            </div>
                            <div className="form-group" style={{gridColumn: 'span 2'}}>
                                <label className="form-label">基礎患者（25名）の使用</label>
                                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.4rem 0'}}>
                                    <input
                                        type="checkbox"
                                        checked={sessionConfig.useBasePatients}
                                        onChange={e => setSessionConfig({...sessionConfig, useBasePatients: e.target.checked})}
                                        style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                    />
                                    <span style={{fontSize: '0.9rem', color: 'var(--gray-700)'}}>アプリ内蔵の基礎患者25名をプールに含める</span>
                                </label>
                                {!sessionConfig.useBasePatients && (
                                    <p style={{fontSize: '0.78rem', color: 'var(--warning)', marginTop: '0.2rem'}}>
                                        ⚠ Firestoreのカスタム患者のみが対象になります
                                    </p>
                                )}
                            </div>
                            <div className="form-group" style={{gridColumn: 'span 2'}}>
                                <label className="form-label">動作確認モード（検証用）</label>
                                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.4rem 0', background: 'var(--gray-50)', borderRadius: '4px'}}>
                                    <input
                                        type="checkbox"
                                        checked={sessionConfig.isTestMode || false}
                                        onChange={e => setSessionConfig({...sessionConfig, isTestMode: e.target.checked})}
                                        style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                    />
                                    <span style={{fontSize: '0.9rem', color: 'var(--gray-700)'}}>全ての拘束時間を一律5秒に短縮する（テスト目的）</span>
                                </label>
                            </div>
                        </div>
                        <h4 style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>重症度割合 (合計100%)</h4>
                        <div style={{ display: 'flex', height: '16px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem', backgroundColor: '#e5e7eb', gap: '1px' }}>
                            <div style={{ width: `${sessionConfig.redRatio}%`, backgroundColor: '#dc2626', transition: 'width 0.3s', minWidth: sessionConfig.redRatio > 0 ? '2px' : '0' }} title={`赤: ${sessionConfig.redRatio}%`} />
                            <div style={{ width: `${sessionConfig.yellowRatio}%`, backgroundColor: '#f59e0b', transition: 'width 0.3s', minWidth: sessionConfig.yellowRatio > 0 ? '2px' : '0' }} title={`黄: ${sessionConfig.yellowRatio}%`} />
                            <div style={{ width: `${sessionConfig.greenRatio}%`, backgroundColor: '#059669', transition: 'width 0.3s', minWidth: sessionConfig.greenRatio > 0 ? '2px' : '0' }} title={`緑: ${sessionConfig.greenRatio}%`} />
                            <div style={{ width: `${sessionConfig.blackRatio}%`, backgroundColor: '#1e293b', transition: 'width 0.3s', minWidth: sessionConfig.blackRatio > 0 ? '2px' : '0' }} title={`黒: ${sessionConfig.blackRatio}%`} />
                        </div>
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
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--gray-200)' }}>
                            <button
                                onClick={() => setActiveTab('patients')}
                                style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'patients' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'patients' ? 'bold' : 'normal', color: activeTab === 'patients' ? 'var(--primary)' : 'var(--gray-600)' }}
                            >
                                患者データ一覧
                            </button>
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'dashboard' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal', color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--gray-600)' }}
                            >
                                ダッシュボード
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: activeTab === 'settings' ? 'bold' : 'normal', color: activeTab === 'settings' ? 'var(--primary)' : 'var(--gray-600)' }}
                            >
                                設定
                            </button>
                        </div>

                        {activeTab === 'dashboard' ? (
                            <DashboardTab patients={patients} />
                        ) : activeTab === 'settings' ? (
                            <div className="card card--elevated">
                                <h3 className="card__title">Google Sheets 連携 (GAS Webhook)</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: '1rem' }}>
                                    Google Apps Script の Web アプリURLを設定することで、現在の患者データをスプレッドシートへエクスポートできます。
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Webhook URL</label>
                                    <input 
                                        type="url" 
                                        className="input" 
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        value={webhookUrl}
                                        onChange={(e) => {
                                            setWebhookUrl(e.target.value)
                                            localStorage.setItem('gas_webhook_url', e.target.value)
                                        }}
                                    />
                                </div>
                                <button 
                                    className="button button--primary" 
                                    onClick={async () => {
                                        if (!webhookUrl) {
                                            alert('Webhook URLを入力してください。')
                                            return
                                        }
                                        setIsExporting(true)
                                        document.body.style.cursor = 'wait'
                                        const success = await exportToGoogleSheets(webhookUrl, patients)
                                        document.body.style.cursor = 'default'
                                        setIsExporting(false)
                                        if (success) {
                                            alert('Google Sheets へのデータ送信が完了しました。')
                                        } else {
                                            alert('データ送信に失敗しました。URLやネットワーク環境を確認してください。')
                                        }
                                    }}
                                    disabled={isExporting}
                                    style={{ width: 'auto', padding: '0.5rem 1.5rem', opacity: isExporting ? 0.7 : 1, marginBottom: '2rem' }}
                                >
                                    {isExporting ? '送信中...' : 'データを今すぐエクスポートする'}
                                </button>

                                <div className="gas-setup-guide" style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                                    <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                        Google Apps Script (GAS) の設定方法
                                    </h4>
                                    <ol style={{ fontSize: '0.85rem', color: 'var(--gray-700)', paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                                        <li>送信先のスプレッドシートを開き、「拡張機能」→「Apps Script」をクリックします。</li>
                                        <li>以下のボタンでコードをコピーし、エディタに貼り付けて保存します。</li>
                                        <li>「デプロイ」→「新しいデプロイ」を選択し、種類を「ウェブアプリ」にします。</li>
                                        <li>アクセスできるユーザーを「全員」にしてデプロイし、発行されたURLを上の入力欄に貼り付けます。</li>
                                    </ol>
                                    <button 
                                        className="button button--secondary"
                                        style={{ fontSize: '0.8rem', width: 'auto', padding: '0.4rem 0.8rem', marginTop: '1rem' }}
                                        onClick={() => {
                                            const gasCode = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  // ヘッダーがなければ作成
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["タイムスタンプ", "患者ID", "名前", "トリアージ", "診断名", "ステータス", "実施処置", "完了済み処置"]);
  }
  
  // 各患者データを追記
  data.patients.forEach(function(p) {
    sheet.appendRow([
      data.timestamp,
      p.id,
      p.name,
      p.triageColor,
      p.diagnosis,
      p.status,
      p.appliedTreatment,
      p.completedTreatments
    ]);
  });
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}`;
                                            navigator.clipboard.writeText(gasCode);
                                            alert('GASコードをクリップボードにコピーしました。');
                                        }}
                                    >
                                        GAS用スクリプトをコピー
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h2 style={{fontSize: '1.1rem', fontWeight: '700'}}>患者データ一覧</h2>
                                    {!currentSessionId && (
                                        <button onClick={handleAddClick} className="button button--primary" style={{width: 'auto', padding: '0.5rem 1rem'}}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '4px'}}>
                                                <path d="M12 4V20M20 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            追加
                                        </button>
                                    )}
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
                                        {!currentSessionId ? (
                                            <div className="actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: 'var(--border)' }}>
                                                <button
                                                    className="button button--secondary"
                                                    onClick={() => handleEditClick(p)}
                                                    style={{padding: '0.5rem'}}
                                                >
                                                    編集
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: 'var(--border)' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'block', textAlign: 'center' }}>
                                                    ※セッション中は編集不可
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}

export default AdminPage
