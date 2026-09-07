import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

/**
 * iPhone SE / iPad mini / Android等の端末差分に強く、高速かつ連続でQRコードをスキャンする高耐久スキャナーヘルパー
 */
export function startRobustQRScanner(
    elementId: string,
    onSuccess: (decodedText: string) => void,
    onError?: (error: any) => void
): () => void {
    const container = document.getElementById(elementId)
    if (!container) {
        return () => {}
    }

    // 以前の残骸を完全にクリーンアップ
    container.innerHTML = ''

    let isStopped = false
    let html5Qrcode: Html5Qrcode | null = null

    try {
        html5Qrcode = new Html5Qrcode(elementId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
        })
    } catch (e) {
        console.error('[QRScanner] Failed to create Html5Qrcode instance:', e)
        if (onError) onError(e)
        return () => {}
    }

    const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
        const qrboxSize = Math.floor(minEdge * 0.75)
        return {
            width: Math.max(qrboxSize, 160),
            height: Math.max(qrboxSize, 160)
        }
    }

    const config = {
        fps: 15,
        qrbox: qrboxFunction,
        aspectRatio: 1.0,
    }

    const handleSuccess = (decodedText: string) => {
        if (isStopped) return
        onSuccess(decodedText)
    }

    const handleFailure = () => {
        // フレームエラーは無視
    }

    // iPadOS / iOS Safari / Android 対策: video要素に playsinline と muted を付与
    const enforcePlaysInline = () => {
        setTimeout(() => {
            const videoElem = container.querySelector('video')
            if (videoElem) {
                videoElem.setAttribute('playsinline', 'true')
                videoElem.setAttribute('webkit-playsinline', 'true')
                videoElem.setAttribute('muted', 'true')
                videoElem.play().catch(() => {})
            }
        }, 100)
    }

    // 高精度のカメラ標準設定（Android focus/resolution対策）
    const highResConstraint = {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        advanced: [{ focusMode: "continuous" }]
    } as unknown as MediaTrackConstraints

    // 段階的カメラ起動
    const attemptStart = async () => {
        if (!html5Qrcode || isStopped) return

        // 第1優先: 高解像度・オートフォーカス指定の背面カメラ
        try {
            await html5Qrcode.start(highResConstraint, config, handleSuccess, handleFailure)
            enforcePlaysInline()
            return
        } catch (e1) {
            console.warn('[QRScanner] High-res facingMode environment failed, trying standard environment...', e1)
        }

        if (isStopped) return

        // 第2優先: { facingMode: "environment" } (標準背面カメラ)
        try {
            await html5Qrcode.start({ facingMode: "environment" }, config, handleSuccess, handleFailure)
            enforcePlaysInline()
            return
        } catch (e2) {
            console.warn('[QRScanner] facingMode environment failed, trying fallback...', e2)
        }

        if (isStopped) return

        // 第3優先: getCameras() によるデバイス特定
        try {
            const cameras = await Html5Qrcode.getCameras()
            if (isStopped) return
            if (cameras && cameras.length > 0) {
                const rearCam = cameras.find(c => {
                    const label = c.label.toLowerCase()
                    return label.includes('back') || label.includes('rear') || label.includes('環境') || label.includes('背面') || label.includes('0')
                }) || cameras[cameras.length - 1]

                await html5Qrcode.start(rearCam.id, config, handleSuccess, handleFailure)
                enforcePlaysInline()
                return
            }
        } catch (e3) {
            console.warn('[QRScanner] getCameras fallback failed:', e3)
        }

        if (isStopped) return

        // 第4優先: 指定なし (標準カメラ)
        try {
            await html5Qrcode.start({ facingMode: "user" }, config, handleSuccess, handleFailure)
            enforcePlaysInline()
            return
        } catch (e4) {
            console.error('[QRScanner] All camera start attempts failed:', e4)
    