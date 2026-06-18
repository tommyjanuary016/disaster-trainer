import { useState, useEffect } from 'react'

export type Role = '未設定' | '医師' | '看護師' | '放射線技師' | '臨床検査技師' | '管理者'

const ROLE_STORAGE_KEY = 'disaster_training_user_role'

export function useRole() {
    const [role, setRoleState] = useState<Role>('未設定')

    useEffect(() => {
        const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as Role
        if (storedRole) {
            setRoleState(storedRole)
        }
    }, [])

    const setRole = (newRole: Role) => {
        localStorage.setItem(ROLE_STORAGE_KEY, newRole)
        setRoleState(newRole)
    }

    return { role, setRole }
}
