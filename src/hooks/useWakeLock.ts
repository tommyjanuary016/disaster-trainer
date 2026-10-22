// ======================================================
// Screen Wake Lock API カスタムフック
// 模擬患者のQR待機中、処置タイマー動作中、本部コマンドセンター表示中に
// スマートフォンやタブレットの画面スリープ（自動消灯）を防止する
// ======================================================
import { useEffect, useState, useRef } from 'react'

export function useWakeLock(enabled: boolean = true) {
    const [isWakeLockActive, setIsWakeLockActive] = useState(false)
    const wakeLockRef = useRef< any >(null)

    useEffect(() => {
        if (!enabled) {
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {})
                wakeLockRef.current = null
                setIsWakeLockActive(false)
            }
            return
        }

        let isMounted = true

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && (navigator as any).wakeLock) {
                    const sentinel = await (navigator as any).wakeLock.request('screen')
                    if (!isMounted) {
                        sentinel.release().catch(() => {})
                        return
                    }
                    wakeLockRef.current = sentinel
                    setIsWakeLockActive(true)

                    sentinel.addEventListener('release', () => {
                        if (isMounted) {
                            setIsWakeLockActive(false)
                        }
                    })
                }
            } catch {
                // バッテリーセーバー中や非対応ブラウザでは静かにフォールバック
                if (isMounted) setIsWakeLockActive(false)
            }
        }

        requestWakeLock()

        // タブ再表示時にもWakeLockを再取得する
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled) {
                requestWakeLock()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            isMounted = false
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {})
                wakeLockRef.current = null
            }
        }
    }, [enabled])

    return { isWakeLockActive }
}
