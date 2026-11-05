// 操作体験モード (他スマホと連動しないモード) 管理フック
import { useState, useEffect } from 'react'

const STORAGE_KEY_EXPERIENCE_MODE = 'disaster_experience_mode'

// イベント発行用
const EXPERIENCE_MODE_EVENT = 'experience_mode_change'

export function getIsExperienceMode(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY_EXPERIENCE_MODE) === 'true'
}

export function setIsExperienceMode(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_EXPERIENCE_MODE, enabled ? 'true' : 'false')
  window.dispatchEvent(new CustomEvent(EXPERIENCE_MODE_EVENT, { detail: enabled }))
}

export function useExperienceMode() {
  const [isExperienceMode, setMode] = useState<boolean>(getIsExperienceMode())

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>
      setMode(customEvent.detail)
    }
    window.addEventListener(EXPERIENCE_MODE_EVENT, handler)
    return () => window.removeEventListener(EXPERIENCE_MODE_EVENT, handler)
  }, [])

  const toggleExperienceMode = () => {
    const next = !isExperienceMode
    setIsExperienceMode(next)
    setMode(next)
  }

  return {
    isExperienceMode,
    toggleExperienceMode,
    setExperienceMode: (val: boolean) => {
      setIsExperienceMode(val)
      setMode(val)
    }
  }
}
