import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { medicalKnowledgeList, MedicalKnowledgeItem } from '../data/medicalKnowledge'

export const KnowledgeLibraryPage: React.FC = () => {
    const navigate = useNavigate()
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'basic' | 'tips' | 'advanced'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedItem, setSelectedItem] = useState<MedicalKnowledgeItem | null>(null)

    // カテゴリと検索語によるフィルタリング
    const filteredList = useMemo(() => {
        return medicalKnowledgeList.filter((item) => {
            const matchesCat = selectedCategory === 'all' || item.category === selectedCategory
            const q = searchQuery.trim().toLowerCase()
            const matchesQuery = !q ||
                item.title.toLowerCase().includes(q) ||
                item.content.toLowerCase().includes(q) ||
                item.keyTakeaway.toLowerCase().includes(q) ||
                item.code.toLowerCase().includes(q)
            return matchesCat && matchesQuery
        })
    }, [selectedCategory, searchQuery])

    // カウント集計
    const counts = useMemo(() => {
        return {
            all: medicalKnowledgeList.length,
            basic: medicalKnowledgeList.filter(i => i.category === 'basic').length,
            tips: medicalKnowledgeList.filter(i => i.category === 'tips').length,
            advanced: medicalKnowledgeList.filter(i => i.category === 'advanced').length,
        }
    }, [])

    const getCategoryBadgeStyle = (category: MedicalKnowledgeItem['category']) => {
        switch (category) {
            case 'basic':
                return {
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    borderColor: '#bfdbfe',
                }
            case 'tips':
                return {
                    color: '#d97706',
                    backgroundColor: '#fffbeb',
                    borderColor: '#fde68a',
                }
            case 'advanced':
                return {
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                    borderColor: '#fecaca',
                }
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            paddingBottom: '3rem',
        }}>
            {/* 上部ヘッダーバー */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderRadius: '8px',
                        color: '#e2e8f0',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                    }}
                >
                    <span>←</span>
                    <span>トップへ戻る</span>
                </button>
                <div style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    fontFamily: 'monospace',
                }}>
                    全 {medicalKnowledgeList.length} 件収載
                </div>
            </div>

            {/* メインコンテナ */}
            <div style={{
                maxWidth: '720px',
                margin: '0 auto',
                padding: '1.25rem 1rem',
            }}>
                {/* ページタイトル */}
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        marginBottom: '0.6rem',
                    }}>
                        FIELD MANUAL ARCHIVE
                    </div>
                    <h1 style={{
                        fontSize: '1.4rem',
                        fontWeight: '800',
                        margin: '0 0 0.5rem 0',
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                    }}>
                        💡 現場で役立つ！外傷・災害Tips＆知識集
                    </h1>
                    <p style={{
                        fontSize: '0.85rem',
                        color: '#94a3b8',
                        margin: 0,
                        lineHeight: '1.5',
                    }}>
                        訓練の手技待機時間だけでなく、自習や振り返りにも使える全100選のリファレンスです。
                    </p>
                </div>

                {/* 検索バー */}
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="キーワードで検索 (例: 骨盤ベルト, 気胸, トリアージ, FAST...)"
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '0.75rem 1rem',
                            fontSize: '0.9rem',
                            backgroundColor: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: '10px',
                            color: '#ffffff',
                            outline: 'none',
                        }}
                    />
                </div>

                {/* カテゴリフィルタタブ */}
                <div style={{
                    display: 'flex',
                    gap: '0.4rem',
                    marginBottom: '1.25rem',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                }}>
                    <button
                        onClick={() => setSelectedCategory('all')}
                        style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            backgroundColor: selectedCategory === 'all' ? '#2563eb' : 'rgba(30, 41, 59, 0.8)',
                            color: selectedCategory === 'all' ? '#ffffff' : '#94a3b8',
                        }}
                    >
                        すべて ({counts.all})
                    </button>
                    <button
                        onClick={() => setSelectedCategory('basic')}
                        style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            backgroundColor: selectedCategory === 'basic' ? '#2563eb' : 'rgba(30, 41, 59, 0.8)',
                            color: selectedCategory === 'basic' ? '#ffffff' : '#94a3b8',
                        }}
                    >
                        基礎知識 ({counts.basic})
                    </button>
                    <button
                        onClick={() => setSelectedCategory('tips')}
                        style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            backgroundColor: selectedCategory === 'tips' ? '#d97706' : 'rgba(30, 41, 59, 0.8)',
                            color: selectedCategory === 'tips' ? '#ffffff' : '#94a3b8',
                        }}
                    >
                        現場TIPS ({counts.tips})
                    </button>
                    <button
                        onClick={() => setSelectedCategory('advanced')}
                        style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            backgroundColor: selectedCategory === 'advanced' ? '#dc2626' : 'rgba(30, 41, 59, 0.8)',
                            color: selectedCategory === 'advanced' ? '#ffffff' : '#94a3b8',
                        }}
                    >
                        アドバンス ({counts.advanced})
                    </button>
                </div>

                {/* ナレッジ一覧リスト */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredList.length === 0 ? (
                        <div style={{
                            padding: '3rem 1rem',
                            textAlign: 'center',
                            color: '#64748b',
                            backgroundColor: 'rgba(30, 41, 59, 0.4)',
                            borderRadius: '12px',
                        }}>
                            該当するナレッジが見つかりませんでした。
                        </div>
                    ) : (
                        filteredList.map((item) => {
                            const badge = getCategoryBadgeStyle(item.category)
                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        padding: '1rem 1.1rem',
                                        backgroundColor: 'rgba(30, 41, 59, 0.65)',
                                        border: '1px solid rgba(148, 163, 184, 0.2)',
                                        borderRadius: '10px',
                                        transition: 'border-color 0.2s',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        marginBottom: '0.4rem',
                                    }}>
                                        <span style={{
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                            fontWeight: '700',
                                            color: '#94a3b8',
                                            fontSize: '0.75rem',
                                        }}>
                                            {item.code}
                                        </span>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            border: `1px solid ${badge.borderColor}`,
                                            color: badge.color,
                                            backgroundColor: badge.backgroundColor,
                                        }}>
                                            {item.categoryLabel}
                                        </span>
                                    </div>

                                    <h3 style={{
                                        fontSize: '0.98rem',
                                        fontWeight: '700',
                                        color: '#f8fafc',
                                        margin: '0 0 0.5rem 0',
                                        lineHeight: '1.4',
                                    }}>
                                        {item.title}
                                    </h3>

                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: '#cbd5e1',
                                        lineHeight: '1.65',
                                        margin: 0,
                                        textAlign: 'justify',
                                    }}>
                                        {item.content}
                                    </p>

                                    {item.keyTakeaway && (
                                        <div style={{
                                            marginTop: '0.7rem',
                                            paddingTop: '0.5rem',
                                            borderTop: '1px dashed rgba(148, 163, 184, 0.2)',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.4rem',
                                        }}>
                                            <span style={{ color: '#38bdf8', flexShrink: 0, fontWeight: '700' }}>▶ 要点:</span>
                                            <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{item.keyTakeaway}</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

export default KnowledgeLibraryPage
