import React, { useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface CameraFallbackUIProps {
    error: any
    onScanSuccess: (decodedText: string) => void
    onRetry?: () => void
}

/**
 * カメラが各種理由（権限拒否、WebView制約、HTTPS非適用、ハード未検知など）で起動しない場合に
 * アラート／パーミッション案内／静止画・静止画キャプチャによるファイル読み取りを提供するUI
 */
export const CameraFallbackUI: React.FC<CameraFallbackUIProps> = ({ error, onScanSuccess, onRetry }) => {
    const fileInputRef = useRef<HTMLInputElement>(null)

    // UserAgentなどからインアプリブラウザ（LINE / X / Yahoo等）か確認
    const ua = navigator.userAgent.toLowerCase()
    const isWebView = ua.includes('line') || ua.includes('twitter') || ua.includes('fbav') || ua.includes('instagram') || ua.includes('fban') || ua.includes('webview') || (ua.includes('iphone') && !ua.includes('safari'))

    const isSecureContext = window.isSecureContext

    // エラーメッセージの解析
    const errorString = String(error?.message || error || '')
    const isPermissionDenied = errorString.includes('NotAllowedError') || errorString.includes('Permission denied') || errorString.includes('PermissionDeniedError')
    const isNotFound = errorString.includes('NotFoundError') || errorString.includes('DevicesNotFoundError')
    const isNotReadable = errorString.includes('NotReadableError') || errorString.includes('TrackStartError')

    // 静止画・カメラ画像ファイルをQRデコードする
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const html5Qrcode = new Html5Qrcode('fallback-file-scanner-temp', false)
            const result = await html5Qrcode.scanFile(file, true)
            onScanSuccess(result)
            try { html5Qrcode.clear() } catch (_) {}
        } catch (err) {
            console.error('[CameraFallback] File scan failed:', err)
            alert('選択した画像からQRコードを読み取ることができませんでした。鮮明なQRコード画像をお試しください。')
        }
    }

    return (
        <div className="camera-fallback-card" style={{
            background: '#fff',
            border: '2px dashed var(--danger, #ef4444)',
            borderRadius: '12px',
            padding: '1.25rem',
            margin: '1rem 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#b91c1c', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                <span>カメラを起動できませんでした</span>
            </div>

            {/* ① Secure Context エラー (HTTP問題) */}
            {!isSecureContext && (
                <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#991b1b' }}>
                    <strong>セキュリティ保護エラー:</strong><br />
                    カメラは暗号化された通信（HTTPS）でのみ利用可能です。https:// のURLでアクセスしているか確認してください。
                </div>
            )}

            {/* ② WebView / アプリ内ブラウザ判定 */}
            {isWebView && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#92400e' }}>
                    <strong>アプリ内ブラウザ（LINE / X 等）をお使いです:</strong><br />
                    アプリ内ブラウザではカメラへのアクセスがブロックされる場合があります。画面右上のメニューから<strong>「Safariで開く」</strong>または<strong>「Chromeで開く」</strong>を選択してください。
                </div>
            )}

            {/* ③ 権限拒否 (NotAllowedError) */}
            {isPermissionDenied && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#1e40af' }}>
                    <strong>カメラのアクセス権限が拒否されています:</strong>
                    <ol style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.2rem', lineHeight: '1.4' }}>
                        <li>iOS (iPhone/iPad): 「設定」＞「Safari (またはChrome)」＞「カメラ」で許可に変更</li>
                        <li>Android: アドレスバー左側の「鍵アイコン」または「設定」＞「権限」＞「カメラ」を許可に変更</li>
                    </ol>
                </div>
            )}

            {/* ④ カメラ競合 / 読み込み失敗 (NotReadableError / NotFoundError) */}
            {(isNotReadable || isNotFound) && (
                <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#374151' }}>
                    <strong>カメラが別のアプリで占有されているか、検出されません:</strong><br />
                    Zoomや標準カメラアプリ、LINEなどの他アプリを完全に終了させてから再度お試しください。
                </div>
            )}

            {/* 代替手段1: 写真撮影・ファイルからQR読み取り (Native Capture fallback) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
                <div id="fallback-file-scanner-temp" style={{ display: 'none' }}></div>
                
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="button button--primary"
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#2563eb'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    📸 写真を撮影 / 画像からQRを読み込む
                </button>

                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="button button--secondary"
                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                        🔄 カメラの起動を再試行する
                    </button>
                )}
            </div>
        </div>
    )
}
