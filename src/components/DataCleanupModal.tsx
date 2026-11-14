import React, { useMemo, useState } from 'react'
import { TrainingSession } from '../lib/firestore'
import { Patient } from '../types/patient'

interface DataCleanupModalProps {
    sessions: TrainingSession[]
    allPatients: Patient[]
    onClose: () => void
    onDeleteSessions: (sessionIds: string[]) => Promise<void>
    onDeleteOrphans: () => Promise<void>
    onExportSessionsCSV: (sessionIds: string[]) => void
}

export const DataCleanupModal: React.FC<DataCleanupModalProps> = ({
    sessions,
    allPatients,
    onClose,
    onDeleteSessions,
    onDeleteOrphans,
    onExportSessionsCSV,
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    // セッションごとの患者数と孤立患者数を集計
    const { patientCountBySession, orphanCount } = useMemo(() => {
        const validIds = new Set(sessions.map(s => s.id))
        const counts = new Map<string, number>()
        let orphans = 0
        allPatients.forEach(p => {
            if (p.session_id) {
                if (validIds.has(p.session_id)) {
                    counts.set(p.session_id, (counts.get(p.session_id) || 0) + 1)
                } else {
                    orphans++
                }
            }
        })
        return { patientCountBySession: counts, orphanCount: orphans }
    }, [sessions, allPatients])

    const deletableSessions = useMemo(
        () => sessions.filter(s => !s.isActive),
        [sessions]
    )

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectAllEnded = () => {
        setSelectedIds(new Set(deletableSessions.map(s => s.id)))
    }

    const selectOlderThan30Days = () => {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
        const oldIds = deletableSessions
            .filter(s => {
                const t = new Date(s.createdAt || s.date || 0).getTime()
                return t > 0 && t < cutoff
            })
            .map(s => s.id)
        setSelectedIds(new Set(oldIds))
    }

    const selectedPatientTotal = useMemo(() => {
        let sum = 0
        selectedIds.forEach(id => {
            sum += patientCountBySession.get(id) || 0
        })
        return sum
    }, [selectedIds, patientCountBySession])

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0 || isDeleting) return
        const ok = window.confirm(
            `選択した ${selectedIds.size} 件のセッションと、紐づく ${selectedPatientTotal} 件の患者データを完全に削除しますか？\n（※患者マスターは保護されます。この操作は取り消せません）`
        )
        if (!ok) return
        setIsDeleting(true)
        try {
            await onDeleteSessions(Array.from(selectedIds))
            setSelectedIds(new Set())
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDeleteOrphans = async () => {
        if (orphanCount === 0 || isDeleting) return
        const ok = window.confirm(
            `セッションが既に存在しない古い患者データ（孤立データ）${orphanCount} 件を完全に削除しますか？\n（※患者マスターは保護されます）`
        )
        if (!ok) return
        setIsDeleting(true)
        try {
            await onDeleteOrphans()
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                width: '100%',
                maxWidth: '720px',
                maxHeight: '88vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                overflow: 'hidden',
            }}>
                {/* ヘッダー */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--gray-200)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--gray-900)' }}>
                            🧹 過去データの整理（アーカイブ削除）
                        </h2>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                            終了済みの訓練セッションと紐づく患者データを削除します。進行中のセッションと患者マスターは保護されます。
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none', background: 'none', fontSize: '1.3rem',
                            cursor: 'pointer', color: 'var(--gray-500)', padding: '0.25rem 0.5rem',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 孤立データバナー */}
                {orphanCount > 0 && (
                    <div style={{
                        margin: '0.75rem 1.25rem 0',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fcd34d',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                    }}>
                        <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
                            ⚠️ 紐づけ先セッションが存在しない古い患者データが <strong>{orphanCount}件</strong> 残っています。
                        </div>
                        <button
                            onClick={handleDeleteOrphans}
                            disabled={isDeleting}
                            className="button button--secondary"
                            style={{
                                width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem',
                                backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#f59e0b',
                            }}
                        >
                            孤立データを掃除する
                        </button>
                    </div>
                )}

                {/* ショートカット操作バー */}
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderBottom: '1px solid var(--gray-200)',
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}>
                    <button
                        onClick={selectAllEnded}
                        className="button button--secondary"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                        終了済みをすべて選択 ({deletableSessions.length})
                    </button>
                    <button
                        onClick={selectOlderThan30Days}
                        className="button button--secondary"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                        30日以上前を選択
                    </button>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="button button--secondary"
                            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                            選択解除
                        </button>
                    )}
                </div>

                {/* セッション一覧 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
                    {sessions.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem 0' }}>
                            セッションデータはありません。
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {sessions.map(s => {
                                const isProtected = Boolean(s.isActive)
                                const checked = selectedIds.has(s.id)
                                const count = patientCountBySession.get(s.id) || 0
                                const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleString('ja-JP') : '日時不明'
                                return (
                                    <label
                                        key={s.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.7rem 0.9rem',
                                            borderRadius: '8px',
                                            border: `1px solid ${checked ? '#ef4444' : 'var(--gray-200)'}`,
                                            backgroundColor: isProtected ? '#f8fafc' : checked ? '#fef2f2' : '#ffffff',
                                            opacity: isProtected ? 0.7 : 1,
                                            cursor: isProtected ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            disabled={isProtected || isDeleting}
                                            checked={checked}
                                            onChange={() => toggleSelect(s.id)}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.92rem', color: 'var(--gray-900)' }}>
                                                    {s.title || '（無題のセッション）'}
                                                </span>
                                                {isProtected ? (
                                                    <span style={{
                                                        fontSize: '0.72rem', fontWeight: 'bold', padding: '0.15rem 0.5rem',
                                                        borderRadius: '999px', backgroundColor: '#dcfce7', color: '#166534',
                                                    }}>
                                                        進行中（削除不可）
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        fontSize: '0.72rem', padding: '0.15rem 0.5rem',
                                                        borderRadius: '999px', backgroundColor: '#f1f5f9', color: '#475569',
                                                    }}>
                                                        終了済み
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                                                作成: {dateStr} ／ 紐づく患者: {count}件
                                            </div>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* フッター */}
                <div style={{
                    padding: '0.9rem 1.25rem',
                    borderTop: '1px solid var(--gray-200)',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={() => onExportSessionsCSV(Array.from(selectedIds))}
                        disabled={selectedIds.size === 0 || isDeleting}
                        className="button button--secondary"
                        style={{ width: 'auto', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
                    >
                        💾 削除前にCSV保存
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="button button--secondary"
                            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                        >
                            閉じる
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={selectedIds.size === 0 || isDeleting}
                            className="button"
                            style={{
                                width: 'auto',
                                padding: '0.5rem 1.1rem',
                                fontSize: '0.85rem',
                                backgroundColor: selectedIds.size > 0 ? '#dc2626' : '#cbd5e1',
                                color: '#ffffff',
                            }}
                        >
                            {isDeleting ? '削除中...' : `選択した ${selectedIds.size} 件を削除`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
