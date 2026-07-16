import React from 'react'

interface LoadingScreenProps {
    message?: string
    subMessage?: string
}

/**
 * アプリ全体で使えるローディング画面コンポーネント。
 * ダーク・インパクト系デザイン。
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = 'Loading...',
    subMessage,
}) => {
    return (
        <div className="loading-screen">
            <div className="loading-screen__inner">
                {/* アニメーション付きスピナー */}
                <div className="loading-screen__spinner-wrapper">
                    <div className="loading-screen__ring loading-screen__ring--outer" />
                    <div className="loading-screen__ring loading-screen__ring--middle" />
                    <div className="loading-screen__ring loading-screen__ring--inner" />
                    <div className="loading-screen__dot" />
                </div>
                {/* テキスト */}
                <p className="loading-screen__message">{message}</p>
                {subMessage && (
                    <p className="loading-screen__sub">{subMessage}</p>
                )}
                {/* スキャンラインアニメーション */}
                <div className="loading-screen__scanline" />
            </div>
        </div>
    )
}

export default LoadingScreen
