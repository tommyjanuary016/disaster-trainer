import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { subscribeToAllPatients } from '../lib/firestore'
import { Patient } from '../types/patient'

interface Notification {
    id: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    progress: number // 0〜100 残り時間を表すプログレス
}

interface NotificationContextType {
    addNotification: (message: string, type?: Notification['type']) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
    const context = useContext(NotificationContext)
    if (!context) throw new Error('useNotification must be used within NotificationProvider')
    return context
}

// 通知タイプ別のアイコンと色定義
const TOAST_STYLES: Record<Notification['type'], { icon: string; className: string }> = {
    info:    { icon: 'ℹ', className: 'toast--info' },
    success: { icon: '✓', className: 'toast--success' },
    warning: { icon: '⚠', className: 'toast--warning' },
    error:   { icon: '✕', className: 'toast--error' },
}

const TOAST_DURATION_MS = 5000

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const prevPatientsRef = useRef<Map<number, Patient>>(new Map())
    const intervalsRef = useRef<Map<string, number>>(new Map())

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        const interval = intervalsRef.current.get(id)
        if (interval) {
            clearInterval(interval)
            intervalsRef.current.delete(id)
        }
    }, [])

    // グローバルな通知追加関数
    const addNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
        const id = Math.random().toString(36).substr(2, 9)
        setNotifications((prev) => [...prev, { id, message, type, progress: 100 }])

        // プログレスバーを減らしていく
        const startTime = Date.now()
        const intervalId = window.setInterval(() => {
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION_MS) * 100)
            setNotifications((prev) =>
                prev.map((n) => n.id === id ? { ...n, progress: remaining } : n)
            )
            if (remaining <= 0) {
                removeNotification(id)
            }
        }, 50)

        intervalsRef.current.set(id, intervalId)

        // 安全装置：5.5秒後に強制削除
        setTimeout(() => removeNotification(id), TOAST_DURATION_MS + 500)
    }, [removeNotification])

    // セッション内の全患者を監視し、変化に応じて通知を出す
    useEffect(() => {
        const unsub = subscribeToAllPatients((patients) => {
            const currentMap = new Map(patients.map((p) => [p.id, p]))
            const prevMap = prevPatientsRef.current

            // 変化の検知
            currentMap.forEach((patient, id) => {
                const prevPatient = prevMap.get(id)
                if (prevPatient) {
                    // 1. 検査結果の解放 (tests_completed が false -> true)
                    if (!prevPatient.tests_completed && patient.tests_completed) {
                        addNotification(`【${patient.name} 様】の検査結果（画像・採血など）が到着しました`, 'success')
                    }

                    // 2. 状態の悪化 (status が '急変' になった)
                    if (prevPatient.status !== '急変' && patient.status === '急変') {
                        addNotification(`【${patient.name} 様】の容体が急変しました！`, 'error')
                    }

                    // 3. タイマーの終了を検知 (timer_started_at が number -> null)
                    // かつ completed_treatments の数が増えている場合
                    const prevLen = prevPatient.completed_treatments?.length || 0
                    const curLen = patient.completed_treatments?.length || 0
                    if (prevPatient.timer_started_at != null && patient.timer_started_at == null && curLen > prevLen) {
                        // 何の処置が終わったかは applied_treatment_id に入っていたもの
                        const finishedTreatment = prevPatient.applied_treatment_id
                        if (finishedTreatment) {
                            addNotification(`【${patient.name} 様】の処置/検査タイマーが完了しました`, 'info')
                        }
                    }
                }
            })

            prevPatientsRef.current = currentMap
        })

        return () => unsub()
    }, [addNotification])

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            {/* トースト表示領域 */}
            <div className="toast-container">
                {notifications.map((notif) => {
                    const style = TOAST_STYLES[notif.type]
                    return (
                        <div
                            key={notif.id}
                            className={`toast ${style.className}`}
                            onClick={() => removeNotification(notif.id)}
                        >
                            {/* アイコン */}
                            <div className="toast__icon">{style.icon}</div>
                            {/* メッセージ */}
                            <p className="toast__message">{notif.message}</p>
                            {/* 閉じるボタン */}
                            <button className="toast__close" onClick={() => removeNotification(notif.id)}>✕</button>
                            {/* プログレスバー */}
                            <div
                                className="toast__progress"
                                style={{ width: `${notif.progress}%` }}
                            />
                        </div>
                    )
                })}
            </div>
        </NotificationContext.Provider>
    )
}
