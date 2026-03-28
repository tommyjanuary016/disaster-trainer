import React, { useEffect, useRef } from 'react'

interface BreathingAnimationProps {
    cpm: number // Cycles per minute
    onClose: () => void
}

const BreathingAnimation: React.FC<BreathingAnimationProps> = ({ cpm, onClose }) => {
    const audioCtxRef = useRef<AudioContext | null>(null)
    const intervalRef = useRef<number | null>(null)

    useEffect(() => {
        // AudioContextの初期化
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        audioCtxRef.current = new AudioContext()

        // 呼吸サイクル1回の長さ（秒）
        const cycleDuration = 60 / cpm
        const halfCycle = cycleDuration / 2

        const playBreathingSound = () => {
            if (!audioCtxRef.current) return
            const ctx = audioCtxRef.current

            // ホワイトノイズ生成関数
            const bufferSize = ctx.sampleRate * cycleDuration 
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
            const data = buffer.getChannelData(0)
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1
            }

            const noiseSource = ctx.createBufferSource()
            noiseSource.buffer = buffer

            // バンドパスフィルターで風の音（呼吸音）っぽくする
            const filter = ctx.createBiquadFilter()
            filter.type = 'bandpass'
            filter.frequency.value = 800 // 低めの周波数帯を通過
            filter.Q.value = 1.0

            const gain = ctx.createGain()

            // 吸気と呼気の音量エンベロープ（スーー、ハーー）
            // 吸気 (0 ~ halfCycle)
            gain.gain.setValueAtTime(0, ctx.currentTime)
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + halfCycle * 0.4) // 徐々に吸う
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + halfCycle) // 吸い終わり

            // 呼気 (halfCycle ~ cycleDuration)
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + halfCycle + halfCycle * 0.3) // 吐き始め
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + cycleDuration) // 吐き終わり

            filter.frequency.setValueAtTime(800, ctx.currentTime)
            // 呼気の時は少し周波数を下げる
            filter.frequency.linearRampToValueAtTime(600, ctx.currentTime + halfCycle)

            noiseSource.connect(filter)
            filter.connect(gain)
            gain.connect(ctx.destination)

            noiseSource.start(ctx.currentTime)
            noiseSource.stop(ctx.currentTime + cycleDuration)
        }

        playBreathingSound()

        const intervalMs = cycleDuration * 1000
        intervalRef.current = window.setInterval(playBreathingSound, intervalMs)

        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current)
            }
            if (audioCtxRef.current) {
                audioCtxRef.current.close()
            }
        }
    }, [cpm])

    const durationSeconds = 60 / cpm

    return (
        <div className="actor-animation-overlay">
            <button className="actor-animation-overlay__close" onClick={onClose}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="breathing-container" style={{ animationDuration: `${durationSeconds}s` }}>
                <div className="wind-wave wind-wave--left" style={{ animationDuration: `${durationSeconds}s` }}></div>
                <div className="wind-wave wind-wave--right" style={{ animationDuration: `${durationSeconds}s` }}></div>
                
                <div className="breathing-particles" style={{ animationDuration: `${durationSeconds}s` }}>
                    {/* 小さな空気のパーティクル（CSSで表現）*/}
                    <div className="particle"></div>
                    <div className="particle"></div>
                    <div className="particle"></div>
                    <div className="particle"></div>
                    <div className="particle"></div>
                </div>

                <div className="breathing-text">RR: {cpm} 回/分</div>
            </div>
        </div>
    )
}

export default BreathingAnimation
