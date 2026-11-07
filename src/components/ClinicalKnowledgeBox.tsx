import React, { useState } from 'react'
import { medicalKnowledgeList, MedicalKnowledgeItem } from '../data/medicalKnowledge'

export const ClinicalKnowledgeBox: React.FC = () => {
    // 初回表示時にランダムなインデックスを選択
    const [currentIndex, setCurrentIndex] = useState(() =>
        Math.floor(Math.random() * medicalKnowledgeList.length)
    )

    const item: MedicalKnowledgeItem = medicalKnowledgeList[currentIndex]

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % medicalKnowledgeList.length)
    }

    const getCategoryBadgeStyle = (category: MedicalKnowledgeItem['category']) => {
        switch (category) {
            case 'basic':
                return {
                    color: '#60a5fa',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderColor: 'rgba(59, 130, 246, 0.35)',
                }
            case 'tips':
                return {
                    color: '#fbbf24',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                }
            case 'advanced':
                return {
                    color: '#f87171',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                }
        }
    }

    const badgeStyle = getCategoryBadgeStyle(item.category)

    return (
        <div style={{
            margin: '1.2rem 0 0.8rem 0',
            padding: '1rem 1.1rem',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '8px',
            textAlign: 'left',
            backdropFilter: 'blur(8px)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}>
            {/* ヘッダー部: タクティカルコード・カテゴリ・切替アクション */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.6rem',
                marginBottom: '0.6rem',
                borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                fontSize: '0.75rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontWeight: '700',
                        color: '#94a3b8',
                        letterSpacing: '0.05em',
                    }}>
                        {item.code}
                    </span>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: `1px solid ${badgeStyle.borderColor}`,
                        color: badgeStyle.color,
                        backgroundColor: badgeStyle.backgroundColor,
                        letterSpacing: '0.03em',
                    }}>
                        {item.categoryLabel}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={handleNext}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 4px',
                        transition: 'opacity 0.2s',
                    }}
                    title="次のナレッジを表示"
                >
                    <span>次へ</span>
                    <span style={{ fontSize: '0.85rem' }}>↻</span>
                </button>
            </div>

            {/* ナレッジタイトル */}
            <div style={{
                fontSize: '0.95rem',
                fontWeight: '700',
                color: '#f1f5f9',
                marginBottom: '0.5rem',
                lineHeight: '1.4',
                letterSpacing: '-0.01em',
            }}>
                {item.title}
            </div>

            {/* 本文（常体） */}
            <p style={{
                fontSize: '0.825rem',
                color: '#cbd5e1',
                lineHeight: '1.65',
                margin: 0,
                textAlign: 'justify',
            }}>
                {item.content}
            </p>

            {/* 要点フッター */}
            {item.keyTakeaway && (
                <div style={{
                    marginTop: '0.7rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px dashed rgba(148, 163, 184, 0.2)',
                    fontSize: '0.75rem',
                    color: '#94a3b8',
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
}
