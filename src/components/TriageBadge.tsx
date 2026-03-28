// TriageBadge - トリアージカラーバッジ
import React from 'react'
import { TriageColor } from '../types/patient'

interface TriageBadgeProps {
    color: TriageColor
    size?: 'sm' | 'md' | 'lg'
}

const colorMap: Record<TriageColor, { bg: string; label: string }> = {
    赤: { bg: 'triage-red', label: 'I 赤（最優先）' },
    黄: { bg: 'triage-yellow', label: 'II 黄（待機可能）' },
    緑: { bg: 'triage-green', label: 'III 緑（保留）' },
    黒: { bg: 'triage-black', label: '0 黒（死亡・不処置）' },
}

const TriageBadge: React.FC<TriageBadgeProps> = ({ color, size = 'md' }) => {
    const info = colorMap[color]
    return (
        <span className={`triage-badge triage-badge--${size} ${info.bg}`}>
            {info.label}
        </span>
    )
}

export default TriageBadge
