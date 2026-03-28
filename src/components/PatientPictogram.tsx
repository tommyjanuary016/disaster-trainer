import React from 'react'

// 年齢グループ判定
export type AgeGroup = '小児' | '成人' | '高齢者'
export type Gender = 'M' | 'F'

export function getAgeGroup(age: number): AgeGroup {
    if (age < 15) return '小児'
    if (age < 65) return '成人'
    return '高齢者'
}

interface PatientPictogramProps {
    age: number
    gender: Gender
    size?: number
    className?: string
}

const PatientPictogram: React.FC<PatientPictogramProps> = ({ age, gender, size = 48, className = '' }) => {
    const group = getAgeGroup(age)
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            className={`patient-pictogram ${className}`}
            aria-label={`${group}${gender === 'M' ? '男性' : '女性'}`}
        >
            {group === '小児' && gender === 'M' && <PedMale />}
            {group === '小児' && gender === 'F' && <PedFemale />}
            {group === '成人' && gender === 'M' && <AdultMale />}
            {group === '成人' && gender === 'F' && <AdultFemale />}
            {group === '高齢者' && gender === 'M' && <ElderMale />}
            {group === '高齢者' && gender === 'F' && <ElderFemale />}
        </svg>
    )
}

/* =========================================================
   小児・男性 — 丸頭・小さめ体・ズボン
   ========================================================= */
const PedMale: React.FC = () => (
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* 頭 */}
        <circle cx="24" cy="12" r="6" />
        {/* 胴 */}
        <line x1="24" y1="18" x2="24" y2="32" />
        {/* 腕 */}
        <line x1="14" y1="22" x2="24" y2="20" />
        <line x1="34" y1="22" x2="24" y2="20" />
        {/* 脚 */}
        <line x1="24" y1="32" x2="18" y2="43" />
        <line x1="24" y1="32" x2="30" y2="43" />
    </g>
)

/* =========================================================
   小児・女性 — 丸頭・スカート（台形）
   ========================================================= */
const PedFemale: React.FC = () => (
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* 頭 */}
        <circle cx="24" cy="12" r="6" />
        {/* 胴 */}
        <line x1="24" y1="18" x2="24" y2="27" />
        {/* スカート */}
        <path d="M16 27 L18 38 H30 L32 27 Z" />
        {/* 腕 */}
        <line x1="13" y1="23" x2="24" y2="20" />
        <line x1="35" y1="23" x2="24" y2="20" />
        {/* 脚 */}
        <line x1="20" y1="38" x2="19" y2="45" />
        <line x1="28" y1="38" x2="29" y2="45" />
    </g>
)

/* =========================================================
   成人・男性 — 標準体型・ズボン
   ========================================================= */
const AdultMale: React.FC = () => (
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* 頭 */}
        <circle cx="24" cy="10" r="6" />
        {/* 胴 */}
        <line x1="24" y1="16" x2="24" y2="32" />
        {/* 肩ライン */}
        <line x1="14" y1="20" x2="34" y2="20" />
        {/* 腕 */}
        <line x1="14" y1="20" x2="12" y2="31" />
        <line x1="34" y1="20" x2="36" y2="31" />
        {/* 腰ライン */}
        <line x1="19" y1="32" x2="29" y2="32" />
        {/* 脚 */}
        <line x1="20" y1="32" x2="18" y2="45" />
        <line x1="28" y1="32" x2="30" y2="45" />
    </g>
)

/* =========================================================
   成人・女性 — 標準体型・スカート
   ========================================================= */
const AdultFemale: React.FC = () => (
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* 頭 */}
        <circle cx="24" cy="10" r="6" />
        {/* 胴 */}
        <line x1="24" y1="16" x2="24" y2="28" />
        {/* 肩ライン */}
        <line x1="15" y1="20" x2="33" y2="20" />
        {/* 腕 */}
        <line x1="15" y1="20" x2="13" y2="31" />
        <line x1="33" y1="20" x2="35" y2="31" />
        {/* スカート */}
        <path d="M16 28 L13 42 H35 L32 28 Z" />
        {/* 脚 */}
        <line x1="19" y1="42" x2="18" y2="47" />
        <line x1="29" y1="42" x2="30" y2="47" />
    </g>
)

/* =========================================================
   高齢者・男性 — 杖あり・少し前傾
   ========================================================= */
const ElderMale: React.FC = () => (
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* 頭 */}
        <circle cx="22" cy="10" r="6" />
        {/* 首〜胴（前傾） */}
        <path d="M22 16 L20 32" />
        {/* 肩 */}
        <line x1="13" y1="19" x2="30" y2="20" />
        {/* 左腕（杖） */}
        <line x1="13" y1="19" x2="9" y2="29" />
        {/* 右腕 */}
        <line x1="30" y1="20" x2="33" y2="29" />
        {/* 脚 */}
        <line x1="20" y1="32" x2="15" y2="44" />
        <line x1="20" y1="32" x2="26" y2="44" />
        {/* 杖 */}
        <path d="M9 29 L7 44 L11 44" strokeWidth="1.8" />
    </g>
)

/* =========================================================
   高齢者・女性 — 杖あり・スカート
   ========================================================= */
const ElderFemale: React.FC = () => (
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* 頭 */}
        <circle cx="22" cy="10" r="6" />
        {/* 胴（前傾） */}
        <path d="M22 16 L20 27" />
        {/* 肩 */}
        <line x1="14" y1="19" x2="30" y2="20" />
        {/* 左腕（杖方向） */}
        <line x1="14" y1="19" x2="10" y2="29" />
        {/* 右腕 */}
        <line x1="30" y1="20" x2="32" y2="29" />
        {/* スカート */}
        <path d="M13 27 L11 40 H31 L29 27 Z" />
        {/* 脚 */}
        <line x1="17" y1="40" x2="15" y2="47" />
        <line x1="25" y1="40" x2="26" y2="47" />
        {/* 杖 */}
        <path d="M10 29 L8 43 L12 43" strokeWidth="1.8" />
    </g>
)

export default PatientPictogram
