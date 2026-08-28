import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

/**
 * iPhone SE / iPad mini / Android等の端末差分に強く、高速にQRコードをスキャンする高耐久スキャナーヘルパー
 */
export function startRobustQRScanner(
    elementId: string,
    onSuccess: (decodedText: string) => void,
    onError?: (error: any) => void
): () => void {
    const elem = document.getElementById(elementId)
    if (!elem) {
        return () => {}
    }

    let isStopped = false
    const html5Qrcode = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
    })

    const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
        const qrboxSize = Math.floor(minEdge * 0.75)
        return {
            width: Math.max(qrboxSize, 180),
            height: Math.max(qrboxSize, 180)
        }
    }

    const config = {
        fps: 12,
        qrbox: qrboxFunction,
        aspectRatio: 1.0,
    }

    const handleSuccess = (decodedText: string) => {
        if (isStopped) return
        onSuccess(decodedText)
    }

    const handleFailure = () => {
        // フレームごとの判定ミスは無視
    }

    // 第1優先: { facingMode: "environment" } (背面カメラ直接指定)
    html5Qrcode.start({ facingMode: "environment" }, config, handleSuccess, handleFailure)
        .catch(err => {
            console.warn('[QRScanner] facingMode environment failed, trying camera list fallback...', err)
            if (isStopped) return

            // 第2優先: カメラリスト取得からの背面カメラ（または最後のカメラ）フォールバック起動
            Html5Qrcode.getCameras().then(cameras => {
                if (isStopped || !cameras || cameras.length === 0) {
                    if (onError) onError(new Error('利用可能なカメラが見つかりません'))
                    return
                }

                // 背面カメラを示すキーワードを検索
                const rearCam = cameras.find(c => {
                    const label = c.label.toLowerCase()
                    return label.includes('back') || label.includes('rear') || label.includes('環境') || label.includes('背面') || label.includes('0')
                }) || cameras[cameras.length - 1]

                html5Qrcode.start(rearCam.id, config, handleSuccess, handleFailure).catch(e => {
                    console.error('[QRScanner] Fallback camera start failed:', e)
                    if (onError) onError(e)
                })
            }).catch(e => {
                console.error('[QRScanner] getCameras failed:', e)
                if (onError) onError(e)
            })
        })

    return () => {
        isStopped = true
        if (html5Qrcode.isScanning) {
            html5Qrcode.stop().then(() => {
                html5Qrcode.clear()
            }).catch(e => {
                console.error('[QRScanner] error during stop:', e)
                try { html5Qrcode.clear() } catch (_) {}
            })
        } else {
            try { html5Qrcode.clear() } catch (_) {}
        }
    }
}
