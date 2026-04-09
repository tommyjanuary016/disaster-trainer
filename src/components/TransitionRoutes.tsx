import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import LauncherPage from '../pages/LauncherPage'
import QRScannerPage from '../pages/QRScannerPage'
import PatientDetailPage from '../pages/PatientDetailPage'
import TreatmentScanPage from '../pages/TreatmentScanPage'
import AdminPage from '../pages/AdminPage'
import PatientActorListPage from '../pages/PatientActorListPage'
import PatientActorPage from '../pages/PatientActorPage'
import QRGeneratorPage from '../pages/QRGeneratorPage'
import RadiologyScanPage from '../pages/RadiologyScanPage'
import LabScanPage from '../pages/LabScanPage'

const PREFIX = '/@fs/Users/tominaganaoki/.gemini/antigravity/brain/bf741cb1-4338-4192-8b2a-3b615d890951'

// AI生成画像のパスリスト（画面遷移エフェクト用）
const TRANSITION_IMAGES = [
    `${PREFIX}/ambulance_arrival_1774248316337.png`,
    `${PREFIX}/vitals_monitor_1774248410493.png`,
    `${PREFIX}/medical_procedure_1774248435337.png`,
    `${PREFIX}/er_examination_1774248470389.png`
]

// 起動画面（ランチャー）は遷移エフェクトを出さない
const NO_TRANSITION_PATHS = ['/']

export const TransitionRoutes: React.FC = () => {
    const location = useLocation()
    const [displayLocation, setDisplayLocation] = useState(location)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [bgImage, setBgImage] = useState('')

    useEffect(() => {
        if (location.pathname === displayLocation.pathname) return

        // ランチャーへの遷移はエフェクトなし
        const skipTransition = NO_TRANSITION_PATHS.includes(location.pathname)
        if (skipTransition) {
            setDisplayLocation(location)
            return
        }

        setIsTransitioning(true)
        const randomImage = TRANSITION_IMAGES[Math.floor(Math.random() * TRANSITION_IMAGES.length)]
        setBgImage(randomImage)

        const timer = setTimeout(() => {
            setDisplayLocation(location)
            setTimeout(() => setIsTransitioning(false), 300)
        }, 1200)

        return () => clearTimeout(timer)
    }, [location, displayLocation])

    return (
        <>
            <div className={`transition-overlay ${isTransitioning ? 'active' : ''}`} style={{ backgroundImage: `url(${bgImage})` }}>
                <div className="transition-overlay__content">
                    <div className="spinner"></div>
                    <h2>SYSTEM LOADING...</h2>
                </div>
            </div>

            <Routes location={displayLocation}>
                {/* 起動画面 */}
                <Route path="/" element={<LauncherPage />} />

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
