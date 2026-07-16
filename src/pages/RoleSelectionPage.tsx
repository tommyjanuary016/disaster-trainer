import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole, Role } from '../hooks/useRole'
import { activeSessionId } from '../lib/firestore'

// 各ロールの定義
const ROLES = [
    {
        role: '医師' as Role,
        label: '医師 / 看護師',
        sublabel: '診察・治療判断',
        description: '患者の初期評価・バイタル測定・診断・治療処置を担当する',
        path: '/training',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
        ),
        colorClass: 'role-card--blue',
    },
    {
        role: '模擬患者' as const,
        label: '模擬患者役',
        sublabel: '症状を演じる',
        description: '傷病者として症状・バイタルサインを演じ訓練をリアルにする',
        path: '/training/actor',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
        ),
        colorClass: 'role-card--orange',
    },
    {
        role: '放射線技師' as Role,
        label: '放射線技師',
        sublabel: '画像診断対応',
        description: 'QRスキャンで担当患者の画像検査オーダーを受け付ける',
        path: '/training/radiology',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        ),
        colorClass: 'role-card--purple',
    },
    {
        role: '臨床検査技師' as Role,
        label: '臨床検査技師',
        sublabel: '血液検査対応',
        description: 'QRスキャンで担当患者の採血・検体検査オーダーを受け付ける',
        path: '/training/lab',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3h6l1 9H8L9 3z" />
                <path d="M8 12c0 5 1.5 7 4 7s4-2 4-7" />
                <path d="M7 16h10" />
            </svg>
        ),
        colorClass: 'role-card--green',
    },
]

const RoleSelectionPage: React.FC = () => {
    const navigate = useNavigate()
    const { setRole } = useRole()
    const [showShareModal, setShowShareModal] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)
    const [hoveredRole, setHoveredRole] = useState<string | null>(null)

    const handleSelectRole = (role: Role | '模擬患者', path: string) => {
        if (role !== '模擬患者') {
            setRole(role as Role)
        }
        navigate(path)
    }

    if (!activeSessionId) {
        return (
            <div className="role-selection-page">
                <div className="role-selection__error">
                    <div className="role-selection__error-icon">⚠</div>
                    <p className="role-selection__error-text">セッションが選択されていません</p>
                    <button className="button button--primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>
                        トップに戻る
                    </button>
                </div>
            </div>
        )
    }

    const shareUrl = `${window.location.origin}/?session_id=${activeSessionId}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 2000)
        }).catch(err => {
            console.error('コピー失敗:', err)
        })
    }

    return (
        <div className="role-selection-page">
            {/* 背景グリッド */}
            <div className="role-selection__bg-grid" />

            <div className="role-selection__content">
                {/* ヘッダー */}
                <header className="role-selection__header">
                    <div className="role-selection__header-badge">SESSION ACTIVE</div>
                    <h1 className="role-selection__title">役割を選択</h1>
                    <p className="role-selection__subtitle">担当する役割を選んで訓練を開始します</p>
                </header>

                {/* ロールカードグリッド */}
                <div className="role-card-grid">
                    {ROLES.map((item) => (
                        <button
                            key={item.role}
                            className={`role-card ${item.colorClass} ${hoveredRole === item.role ? 'role-card--hovered' : ''}`}
                            onClick={() => handleSelectRole(item.role, item.path)}
                            onMouseEnter={() => setHoveredRole(item.role)}
                            onMouseLeave={() => setHoveredRole(null)}
                        >
                            {/* グロー効果 */}
                            <div className="role-card__glow" />
                            {/* アイコン */}
                            <div className="role-card__icon">{item.icon}</div>
                            {/* テキスト */}
                            <div className="role-card__body">
                                <span className="role-card__label">{item.label}</span>
                                <span className="role-card__sublabel">{item.sublabel}</span>
                                <p className="role-card__desc">{item.description}</p>
                            </div>
                            {/* 矢印 */}
                            <div className="role-card__arrow">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>

                {/* 共有セクション */}
                <div className="role-selection__share">
                    <p className="role-selection__share-label">この訓練セッションを共有</p>
                    <div className="role-selection__share-buttons">
                        <button className="role-selection__share-btn" onClick={handleCopyLink}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            {copySuccess ? '✓ コピー完了' : 'リンクをコピー'}
                        </button>
                        <button className="role-selection__share-btn" onClick={() => setShowShareModal(true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                                <path d="M7 17v4M3 14h4" />
                            </svg>
                            QRコード
                        </button>
                    </div>
                </div>

                {/* セッション選択に戻る */}
                <button
                    className="role-selection__back-btn"
                    onClick={() => navigate('/')}
                >
                    ← セッション選択に戻る
                </button>
            </div>

            {/* QRコード共有モーダル */}
            {showShareModal && (
                <div
                    className="role-modal-overlay"
                    onClick={() => setShowShareModal(false)}
                >
                    <div
                        className="role-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="role-modal__title">セッションに参加</h3>
                        <p className="role-modal__sub">
                            他の端末のカメラでスキャンすると、このセッションに直接参加できます。
                        </p>
                        <div className="role-modal__qr-wrapper">
                            <img
                                src={qrUrl}
                                alt="Session QR Code"
                                className="role-modal__qr"
                            />
                        </div>
                        <div className="role-modal__actions">
                            <button className="button button--primary" onClick={handleCopyLink}>
                                {copySuccess ? '✓ コピー完了' : 'リンクをコピー'}
                            </button>
                            <button className="button button--secondary" onClick={() => setShowShareModal(false)}>
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RoleSelectionPage
