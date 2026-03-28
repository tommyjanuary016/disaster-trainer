import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import QRScannerPage from '../pages/QRScannerPage'
import PatientDetailPage from '../pages/PatientDetailPage'
import TreatmentScanPage from '../pages/TreatmentScanPage'
import AdminPage from '../pages/AdminPage'
import PatientActorListPage from '../pages/PatientActorListPage'
import PatientActorPage from '../pages/PatientActorPage'

const PREFIX = '/@fs/Users/tominaganaoki/.gemini/antigravity/brain/bf741cb1-4338-4192-8b2a-3b615d890951'

// AI生成画像のパスリスト
const TRANSITION_IMAGES = [
    `${PREFIX}/ambulance_arrival_1774248316337.png`,
    `${PREFIX}/vitals_monitor_1774248410493.png`,
    `${PREFIX}/medical_procedure_1774248435337.png`,
    `${PREFIX}/er_examination_1774248470389.png`
]

export const TransitionRoutes: React.FC = () => {
    const location = useLocation()
    const [displayLocation, setDisplayLocation] = useState(location)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [bgImage, setBgImage] = useState('')

    useEffect(() => {
        // 現在表示している画面と、ルーターの実際の場所が違う場合＝画面遷移が発生した
        if (location.pathname !== displayLocation.pathname) {
            setIsTransitioning(true)

            // ランダムに画像を1枚選ぶ
            const randomImage = TRANSITION_IMAGES[Math.floor(Math.random() * TRANSITION_IMAGES.length)]
            setBgImage(randomImage)

            // 1.2秒間オーバーレイを表示した後に、内部のコンポーネントを本命のルーティングに切り替える
            const timer = setTimeout(() => {
                setDisplayLocation(location)
                
                // フェードアウト用の少しの遅延
                setTimeout(() => {
                    setIsTransitioning(false)
                }, 300)
            }, 1200)

            return () => clearTimeout(timer)
        }
    }, [location, displayLocation])

    return (
        <>
            <div className={`transition-overlay ${isTransitioning ? 'active' : ''}`} style={{ backgroundImage: `url(${bgImage})` }}>
                <div className="transition-overlay__content">
                    <div className="spinner"></div>
                    <h2>SYSTEM LOADING...</h2>
                </div>
            </div>

            {/* displayLocationに指定したルートのみを描画することで、遷移前の画面を維持する */}
            <Routes location={displayLocation}>
                <Route path="/" element={<QRScannerPage />} />
                <Route path="/patient/:id" element={<PatientDetailPage />} />
                <Route path="/treatment-scan/:patientId" element={<TreatmentScanPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/actor" element={<PatientActorListPage />} />
                <Route path="/actor/:id" element={<PatientActorPage />} />
            </Routes>
        </>
    )
}
