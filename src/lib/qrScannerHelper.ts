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

    // セキュアコンテキスト（HTTPS）および getUserMedia 対応チェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const envError = new Error(
            'カメラAPIが利用できません。HTTPS環境でアクセスしているか、ブラウザのカメラ権限をご確認ください。'
        )
        console.error('[QRScanner] mediaDevices.getUserMedia is unavailable')
        if (onError) onError(envError)
        return () => {}
    }

    // 以前の残骸を完全にクリーンアップ
    container.innerHTML = ''

    let isStopped = false
    let isStarting = false
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
        if (minEdge <= 0) {
            return { width: 160, height: 160 }
        }
        // viewfinder を超えない安全なサイズにクランプ（iPadOS / 小画面端末でのサイズエラー防止）
        const target = Math.floor(minEdge * 0.75)
        const safeSize = Math.min(minEdge - 8, Math.max(target, Math.min(160, minEdge - 8)))
        const finalSize = Math.max(50, safeSize)
        return {
            width: finalSize,
            height: finalSize,
        }
    }

    // aspectRatio を固定すると iPadOS や一部 Android で制約エラー・映像非表示になるため指定しない
    const config = {
        fps: 15,
        qrbox: qrboxFunction,
    }

    const handleSuccess = (decodedText: string) => {
        if (isStopped) return
        onSuccess(decodedText)
    }

    const handleFailure = () => {
        // フレームエラーは無視
    }

    // iPadOS / iOS Safari / Android 対策: video要素生成直後に playsinline と muted を確実に付与
    const applyVideoAttributes = (videoElem: HTMLVideoElement) => {
        videoElem.setAttribute('playsinline', 'true')
        videoElem.setAttribute('webkit-playsinline', 'true')
        videoElem.setAttribute('muted', 'true')
        videoElem.setAttribute('autoplay', 'true')
        videoElem.muted = true
        videoElem.playsInline = true
        videoElem.play().catch(() => {})
    }

    const videoObserver = new MutationObserver(() => {
        const videoElem = container.querySelector('video')
        if (videoElem) {
            applyVideoAttributes(videoElem)
        }
    })
    videoObserver.observe(container, { childList: true, subtree: true })

    const enforcePlaysInline = () => {
        const videoElem = container.querySelector('video')
        if (videoElem) {
            applyVideoAttributes(videoElem)
        }
    }

    const stopAndClear = async () => {
        videoObserver.disconnect()
        if (!html5Qrcode) return
        try {
            if (html5Qrcode.isScanning) {
                await html5Qrcode.stop()
            }
        } catch (e) {
            console.error('[QRScanner] Error during stop:', e)
        } finally {
            try {
                html5Qrcode.clear()
            } catch (_) {}
            if (container) container.innerHTML = ''
        }
    }

    const tryStart = async (cameraIdOrConfig: string | MediaTrackConstraints) => {
        if (!html5Qrcode || isStopped) return false
        isStarting = true
        try {
            await html5Qrcode.start(cameraIdOrConfig, config, handleSuccess, handleFailure)
            if (isStopped) {
                // 起動中にアンマウントされた場合は即座に停止・解放
                await stopAndClear()
                return true
            }
            enforcePlaysInline()
            return true
        } finally {
            isStarting = false
        }
    }

    // 段階的カメラ起動
    const attemptStart = async () => {
        if (!html5Qrcode || isStopped) return

        // 第1優先: { facingMode: "environment" } (iOS Safari / iPadOS / Android 共通標準背面カメラ)
        try {
            if (await tryStart({ facingMode: "environment" })) return
        } catch (e1) {
            console.warn('[QRScanner] Standard facingMode environment failed:', e1)
        }

        if (isStopped) return

        // 第2優先: { facingMode: { exact: "environment" } } (一部Android)
        try {
            if (await tryStart({ facingMode: { exact: "environment" } })) return
        } catch (e2) {
            console.warn('[QRScanner] Exact environment facingMode failed:', e2)
        }

        if (isStopped) return

        // 第3優先: getCameras() によるデバイス特定（カメラ一覧取得）
        try {
            const cameras = await Html5Qrcode.getCameras()
            if (isStopped) return
            if (cameras && cameras.length > 0) {
                const rearCam = cameras.find(c => {
                    const label = c.label.toLowerCase()
                    return label.includes('back') || label.includes('rear') || label.includes('環境') || label.includes('背面') || label.includes('アウト') || label.includes('広角')
                }) || cameras[cameras.length - 1]

                if (await tryStart(rearCam.id)) return
            }
        } catch (e3) {
            console.warn('[QRScanner] getCameras fallback failed:', e3)
        }

        if (isStopped) return

        // 第4優先: 空制約 {} （端末デフォルトカメラ）
        try {
            if (await tryStart({} as any)) return
        } catch (e4) {
            console.warn('[QRScanner] Empty constraints fallback failed:', e4)
        }

        if (isStopped) return

        // 第5優先: フォールバック（標準フロント/任意カメラ）
        try {
            if (await tryStart({ facingMode: "user" })) return
        } catch (e5) {
            console.error('[QRScanner] All camera start attempts failed:', e5)
            videoObserver.disconnect()
            if (onError) onError(e5)
        }
    }

    attemptStart()

    // クリーンアップ関数
    return () => {
        isStopped = true
        if (!isStarting) {
            void stopAndClear()
        }
    }
}
