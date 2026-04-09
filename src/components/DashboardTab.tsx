import React, { useState, useEffect } from 'react'
import { Patient } from '../types/patient'

interface DashboardTabProps {
    patients: Patient[]
}

const DashboardTab: React.FC<DashboardTabProps> = ({ patients }) => {
    // 経過タイマー
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    useEffect(() => {
        if (patients.length === 0) {
            setElapsedSeconds(0)
            return
        }
        
        // セッション内の最も古い受付時間を開始時間とする
        const validTimes = patients.map(p => p.reception_time_ms).filter(Boolean) as number[]
        if (validTimes.length === 0) return

        const startTime = Math.min(...validTimes)
        const updateTimer = () => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
        }
        
        updateTimer()
        const intervalId = setInterval(updateTimer, 1000)
        return () => clearInterval(intervalId)
    }, [patients])

    const formattedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`

    // 重症度別の集計
    const redCount = patients.filter(p => p.triage_color === '赤').length
    const yellowCount = patients.filter(p => p.triage_color === '黄').length
    const greenCount = patients.filter(p => p.triage_color === '緑').length
    const blackCount = patients.filter(p => p.triage_color === '黒').length
    const totalCount = patients.length

    return (
        <div className="dashboard-tab">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>全体の概況</h2>
                <div className="card card--elevated" style={{ padding: '0.5rem 1rem', background: 'var(--gray-800)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-300)' }}>訓練経過時間</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{formattedTime}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card card--elevated" style={{ textAlign: 'center', padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>総患者数</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalCount}</div>
                </div>
                <div className="card card--elevated" style={{ textAlign: 'center', padding: '1rem', borderTop: '4px solid var(--status-red)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>赤 (重症)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--status-red)' }}>{redCount}</div>
                </div>
                <div className="card card--elevated" style={{ textAlign: 'center', padding: '1rem', borderTop: '4px solid #d97706' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>黄 (中等症)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>{yellowCount}</div>
                </div>
                <div className="card card--elevated" style={{ textAlign: 'center', padding: '1rem', borderTop: '4px solid var(--status-green)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>緑 (軽症)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--status-green)' }}>{greenCount}</div>
                </div>
                <div className="card card--elevated" style={{ textAlign: 'center', padding: '1rem', borderTop: '4px solid var(--status-black)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>黒 (死亡等)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--status-black)' }}>{blackCount}</div>
                </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>患者別ステータス一覧</h3>
            <div className="table-wrapper" style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>ID / 名前</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>トリアージ</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>診断名</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>ステータス</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <div style={{ fontWeight: '500' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>ID: {String(p.id).padStart(4, '0')}</div>
                                </td>
                                <td style={{ padding: '0.75rem 1rem' }}>
                                    <span className={`triage-badge triage-badge--sm triage-${p.triage_color === '赤' ? 'red' : p.triage_color === '黄' ? 'yellow' : p.triage_color === '緑' ? 'green' : 'black'}`}>
                                        {p.triage_color}
                                    </span>
                                </td>
                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                                    {p.diagnosis}
                                </td>
                                <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        background: p.status === '初期状態' ? 'var(--gray-100)' :
                                                    p.status === '処置中' ? '#fef3c7' :
                                                    p.status === 'アセスメント完了' ? '#d1fae5' : 'var(--gray-100)',
                                        color: p.status === '初期状態' ? 'var(--gray-600)' :
                                               p.status === '処置中' ? '#92400e' :
                                               p.status === 'アセスメント完了' ? '#065f46' : 'var(--gray-600)',
                                        fontSize: '0.8rem',
                                        fontWeight: '500'
                                    }}>
                                        {p.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default DashboardTab
