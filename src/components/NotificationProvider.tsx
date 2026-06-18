import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { subscribeToAllPatients } from '../lib/firestore'
import { Patient } from '../types/patient'

interface Notification {
    id: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const prevPatientsRef = useRef<Map<number, Patient>>(new Map())

    // グローバルな通知追加関数
    const addNotification = (message: string, type: Notification['type'] = 'info') => {
        const id = Math.random().toString(36).substr(2, 9)
        setNotifications((prev) => [...prev, { id, message, type }])

        // 5秒後に自動消去
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id))
        }, 5000)
    }

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
                        addNotification(`🚨 【${patient.name} 様】の容体が急変しました！`, 'error')
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
    }, [])

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            {/* トースト表示領域 */}
            <div style={{
                position: 'fixed',
                top: '60px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {notifications.map((notif) => (
                    <div key={notif.id} style={{
                        background: notif.type === 'error' ? '#ef4444' : notif.type === 'success' ? '#10b981' : '#3b82f6',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        {notif.message}
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </NotificationContext.Provider>
    )
}
