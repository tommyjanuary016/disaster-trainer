import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import LauncherPage from '../pages/LauncherPage'
import RoleSelectionPage from '../pages/RoleSelectionPage'
import QRScannerPage from '../pages/QRScannerPage'
import PatientDetailPage from '../pages/PatientDetailPage'
import TreatmentScanPage from '../pages/TreatmentScanPage'
import AdminPage from '../pages/AdminPage'
import PatientActorListPage from '../pages/PatientActorListPage'
import PatientActorPage from '../pages/PatientActorPage'
import QRGeneratorPage from '../pages/QRGeneratorPage'
import RadiologyScanPage from '../pages/RadiologyScanPage'
import LabScanPage from '../pages/LabScanPage'

// 画面遷移時に表示するメッセージをランダムで選択
const TRANSITION_MESSAGES = [
    'SYSTEM LOADING',
    'CONNECTING TO SERVER',
    'SYNCING DATA',
    'PREPARING INTERFACE',
    'AUTHENTICATING',
]

// 起動画面（ランチャー）は遷移エフェクトを出さない
const NO_TRANSITION_PATHS = ['/']

export const TransitionRoutes: React.FC = () => {
    const location = useLocation()
    const [displayLocation, setDisplayLocation] = useState(location)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [transitionMessage, setTransitionMessage] = useState(TRANSITION_MESSAGES[0])
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (location.pathname === displayLocation.pathname) return

        // ランチャーへの遷移はエフェクトなし
        const skipTransition = NO_TRANSITION_PATHS.includes(location.pathname)
        if (skipTransition) {
            setDisplayLocation(location)
            return
        }

        // ランダムメッセージを選択
        const msg = TRANSITION_MESSAGES[Math.floor(Math.random() * TRANSITION_MESSAGES.length)]
        setTransitionMessage(msg)
        setProgress(0)
        setIsTransitioning(true)

        // プログレスバーを徐々に進める
        let p = 0
        const interval = setInterval(() => {
            p += Math.random() * 25 + 10
            if (p > 90) p = 90
            setProgress(p)
        }, 150)

        const timer = setTimeout(() => {
            clearInterval(interval)
            setProgress(100)
            setDisplayLocation(location)
            setTimeout(() => setIsTransitioning(false), 300)
        }, 900)

        return () => {
            clearInterval(interval)
            clearTimeout(timer)
        }
    }, [location, displayLocation])

    return (
        <>
            {/* 画面遷移オーバーレイ */}
            <div className={`transition-overlay ${isTransitioning ? 'active' : ''}`}>
                <div className="transition-overlay__grid" />
                <div className="transition-overlay__scanline" />
                <div className="transition-overlay__content">
                    {/* スピナー */}
                    <div className="transition-spinner">
                        <div className="transition-spinner__ring transition-spinner__ring--1" />
                        <div className="transition-spinner__ring transition-spinner__ring--2" />
                        <div className="transition-spinner__core" />
                    </div>
                    {/* タイトル */}
                    <h2 className="transition-overlay__title">DISASTER LOGIC</h2>
                    {/* メッセージ（点滅） */}
                    <p className="transition-overlay__message">{transitionMessage}...</p>
                    {/* プログレスバー */}
                    <div className="transition-overlay__progressbar">
                        <div
                            className="transition-overlay__progressbar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="transition-overlay__percent">{Math.round(progress)}%</p>
                </div>
            </div>

            <Routes location={displayLocation}>
                {/* 起動画面 */}
                <Route path="/" element={<LauncherPage />} />
                <Route path="/role-select" element={<RoleSelectionPage />} />

                {/* 訓練系ルート（/training/ プレフィックス） */}
                <Route path="/training" element={<QRScannerPage />} />
                <Route path="/training/patient/:id" element={<PatientDetailPage />} />
                <Route path="/training/treatment-scan/:patientId" element={<TreatmentScanPage />} />
                <Route path="/training/actor" element={<PatientActorListPage />} />
                <Route path="/training/actor/:id" element={<PatientActorPage />} />
                <Route path="/training/radiology" element={<RadiologyScanPage />} />
                <Route path="/training/lab" element={<LabScanPage />} />

                {/* 管理系ルート */}
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/qr-generator" element={<QRGeneratorPage />} />
            </Routes>
        </>
    )
}
