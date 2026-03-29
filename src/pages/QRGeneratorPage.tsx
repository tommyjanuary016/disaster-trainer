import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockPatients } from '../data/mockData'
import { MEDICAL_ITEMS, getItemCategories } from '../data/items'
import { makePatientQR, makeProcedureQR, makeItemQR } from '../types/qr'
import { createPatient } from '../lib/firestore'
import { Patient } from '../types/patient'

// 手技一覧（QR生成用）
const PROCEDURES = [
    { id: 'vitals',             name: 'バイタルサイン測定', category: 'バイタル' },
    { id: 'head_and_neck',      name: '頭頸部診察',         category: '診察手技' },
    { id: 'chest',              name: '胸部診察',           category: '診察手技' },
    { id: 'abdomen_and_pelvis', name: '腹部・骨盤診察',     category: '診察手技' },
    { id: 'limbs',              name: '四肢診察',           category: '診察手技' },
    { id: 'fast',               name: 'FAST',               category: '診察手技' },
    { id: 'ample',              name: 'AMPLE',              category: '診察手技' },
    { id: 'background',         name: '背景聴取',           category: '診察手技' },
    { id: 'diagnosis',          name: '診断',               category: '診察手技' },
    { id: 'iv_access',          name: 'ルート確保',         category: '治療処置' },
    { id: 'iv_fluid',           name: '輸液',               category: '治療処置' },
    { id: 'blood_transfusion',  name: '輸血',               category: '治療処置' },
    { id: 'oxygen',             name: '酸素投与',           category: '治療処置' },
    { id: 'intubation',         name: '気管内挿管',         category: '治療処置' },
    { id: 'chest_tube',         name: 'トロッカーカテーテル', category: '治療処置' },
    { id: 'pelvic_binder',      name: '骨盤固定',           category: '治療処置' },
    { id: 'tourniquet',         name: '止血帯',             category: '治療処置' },
    { id: 'traction',           name: '鋼線牽引',           category: '治療処置' },
    { id: 'ct',                 name: 'CT撮影',             category: '治療処置' },
    { id: 'xray',               name: 'X-P',                category: '治療処置' },
    { id: 'xray_ct',            name: 'X-P/CT',             category: '治療処置' },
    { id: 'medication',         name: '薬剤投与',           category: '治療処置' },
    { id: 'sedation',           name: '鎮静',               category: '治療処置' },
    { id: 'suture',             name: '縫合',               category: '治療処置' },
    { id: 'cpr',                name: 'CPR',                category: '治療処置' },
    { id: 'breathing_support',  name: '呼吸誘導',           category: '治療処置' },
]

/** フリーQR画像APIでQR画像URLを生成 */
function qrImageUrl(data: string, size = 160): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

type Tab = 'patient' | 'procedure' | 'item' | 'import'

const QRGeneratorPage: React.FC = () => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<Tab>('patient')
    const [importJson, setImportJson] = useState('')
    const [importStatus, setImportStatus] = useState<string | null>(null)
    const [importError, setImportError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const procedureCategories = [...new Set(PROCEDURES.map(p => p.category))]
    const itemCategories = getItemCategories()

    // JSONインポート処理
    const handleImport = async () => {
        setImportStatus(null)
        setImportError(null)
        try {
            const data = JSON.parse(importJson) as Patient[]
            if (!Array.isArray(data)) throw new Error('配列形式のJSONが必要です')
            let count = 0
            for (const patient of data) {
                await createPatient(patient)
                count++
            }
            setImportStatus(`✅ ${count}件の患者データをインポートしました`)
            setImportJson('')
        } catch (e) {
            setImportError(`❌ エラー: ${e instanceof Error ? e.message : String(e)}`)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            setImportJson(ev.target?.result as string ?? '')
        }
        reader.readAsText(file)
    }

    return (
        <div className="page qr-generator-page">
            <header className="admin-header">
                <h1>QRコード生成</h1>
                <button onClick={() => navigate('/admin')} className="button button--secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                    ← 管理画面
                </button>
            </header>

            {/* タブ */}
            <div className="qrgen-tabs">
                {([
                    { key: 'patient',   label: '患者QR' },
                    { key: 'procedure', label: '手技QR' },
                    { key: 'item',      label: '物品QR' },
                    { key: 'import',    label: 'データ取込' },
                ] as { key: Tab; label: string }[]).map(tab => (
                    <button
                        key={tab.key}
                        className={`qrgen-tab ${activeTab === tab.key ? 'qrgen-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <main className="page__content qrgen-content">

                {/* 患者QR */}
                {activeTab === 'patient' && (
                    <div>
                        <p className="qrgen-desc">各患者の病着に貼付するQRコードです。</p>
                        <div className="qrgen-grid">
                            {mockPatients.map(p => (
                                <div key={p.id} className="qrgen-card">
                                    <img
                                        src={qrImageUrl(makePatientQR(p.id))}
                                        alt={`患者QR: ${p.name}`}
                                        className="qrgen-card__qr"
                                    />
                                    <div className="qrgen-card__label">
                                        <span className={`triage-badge triage-badge--sm triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'}`}>
                                            {p.triage_color}
                                        </span>
                                        <strong>No.{String(p.id).padStart(2, '0')}</strong>
                                        <span>{p.name}</span>
                                    </div>
                                    <div className="qrgen-card__data">{makePatientQR(p.id)}</div>
                                </div>
                            ))}
                        </div>
                        <button className="button button--secondary qrgen-print-btn" onClick={() => window.print()}>
                            🖨️ このページを印刷
                        </button>
                    </div>
                )}

                {/* 手技QR */}
                {activeTab === 'procedure' && (
                    <div>
                        <p className="qrgen-desc">処置エリアに掲示する手技QRコードです。</p>
                        {procedureCategories.map(cat => (
                            <div key={cat} className="qrgen-section">
                                <h3 className="qrgen-section__title">{cat}</h3>
                                <div className="qrgen-grid">
                                    {PROCEDURES.filter(p => p.category === cat).map(proc => (
                                        <div key={proc.id} className="qrgen-card">
                                            <img
                                                src={qrImageUrl(makeProcedureQR(proc.id))}
                                                alt={`手技QR: ${proc.name}`}
                                                className="qrgen-card__qr"
                                            />
                                            <div className="qrgen-card__label">
                                                <strong>{proc.name}</strong>
                                            </div>
                                            <div className="qrgen-card__data">{makeProcedureQR(proc.id)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button className="button button--secondary qrgen-print-btn" onClick={() => window.print()}>
                            🖨️ このページを印刷
                        </button>
                    </div>
                )}

                {/* 物品QR */}
                {activeTab === 'item' && (
                    <div>
                        <p className="qrgen-desc">物品・機材に貼付するQRコードです。スキャン時に対応手技に自動変換されます。</p>
                        {itemCategories.map(cat => (
                            <div key={cat} className="qrgen-section">
                                <h3 className="qrgen-section__title">{cat}</h3>
                                <div className="qrgen-grid">
                                    {MEDICAL_ITEMS.filter(item => item.category === cat).map(item => (
                                        <div key={item.item_id} className="qrgen-card">
                                            <img
                                                src={qrImageUrl(makeItemQR(item.item_id))}
                                                alt={`物品QR: ${item.name}`}
                                                className="qrgen-card__qr"
                                            />
                                            <div className="qrgen-card__label">
                                                <strong>{item.name}</strong>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>→ {item.maps_to_treatment_id}</span>
                                            </div>
                                            <div className="qrgen-card__data">{makeItemQR(item.item_id)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button className="button button--secondary qrgen-print-btn" onClick={() => window.print()}>
                            🖨️ このページを印刷
                        </button>
                    </div>
                )}

                {/* データ取込 */}
                {activeTab === 'import' && (
                    <div className="qrgen-import">
                        <p className="qrgen-desc">患者データをJSON形式で一括インポートします。</p>

                        <div className="card card--elevated" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                                JSONファイルを選択
                            </h3>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="button button--secondary"
                                style={{ marginBottom: '0.75rem' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                📂 ファイルを選択
                            </button>
                            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                または以下にJSONを直接貼り付けてください
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">患者データJSON</label>
                            <textarea
                                className="input"
                                rows={10}
                                value={importJson}
                                onChange={e => setImportJson(e.target.value)}
                                placeholder={'[\n  {\n    "id": 1,\n    "name": "...",\n    ...\n  }\n]'}
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical' }}
                            />
                        </div>

                        {importStatus && (
                            <div className="error-message" style={{ background: 'var(--success-light)', borderColor: 'rgba(5,150,105,0.2)', color: 'var(--success)' }}>
                                {importStatus}
                            </div>
                        )}
                        {importError && (
                            <div className="error-message">{importError}</div>
                        )}

                        <button
                            className="button button--primary"
                            onClick={handleImport}
                            disabled={!importJson.trim()}
                        >
                            インポート実行
                        </button>
                    </div>
                )}

            </main>
        </div>
    )
}

export default QRGeneratorPage
