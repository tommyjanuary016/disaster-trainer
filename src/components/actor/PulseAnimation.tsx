import React, { useEffect, useRef } from 'react'

interface PulseAnimationProps {
    bpm: number
    onClose: () => void
}

const PulseAnimation: React.FC<PulseAnimationProps> = ({ bpm, onClose }) => {
    const audioCtxRef = useRef<AudioContext | null>(null)
    const intervalRef = useRef<number | null>(null)

    useEffect(() => {
        // AudioContextの初期化
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        audioCtxRef.current = new AudioContext()

        const playPulseSound = () => {
            if (!audioCtxRef.current) return
            
            const ctx = audioCtxRef.current
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            // 低音のサイン波で心拍音を模倣（ドクン、という音）
            osc.type = 'sine'
            osc.frequency.setValueAtTime(60, ctx.currentTime) // ベースの周波数を低く設定
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1) // 減衰させる

            // 音量エンベロープ（アタック早く、ディケイも早め）
            gain.gain.setValueAtTime(0, ctx.currentTime)
            gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.2)
        }

        // 初回再生
        playPulseSound()

        // BPMから間隔(ms)を計算してループ再生
        const intervalMs = (60 / bpm) * 1000
        intervalRef.current = window.setInterval(() => {
            playPulseSound()
            // ドクン・ドクンの2音目を少し遅れて鳴らす
            setTimeout(playPulseSound, 200)
        }, intervalMs)

        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current)
            }
            if (audioCtxRef.current) {
                audioCtxRef.current.close()
            }
        }
    }, [bpm])

    // CSSのanimation-durationをBPMに合わせて計算
    const durationSeconds = 60 / bpm

    return (
        <div className="actor-animation-overlay">
            <button className="actor-animation-overlay__close" onClick={onClose}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="pulse-container">
                <div 
                    className="pulse-circle pulse-circle--1"
                    style={{ animationDuration: `${durationSeconds}s` }}
                ></div>
                <div 
                    className="pulse-circle pulse-circle--2"
                    style={{ animationDuration: `${durationSeconds}s` }}
                ></div>
                <div 
                    className="pulse-circle pulse-circle--3"
                    style={{ animationDuration: `${durationSeconds}s` }}
                ></div>
                <div 
                    className="pulse-circle pulse-circle--core"
                    style={{ animationDuration: `${durationSeconds}s` }}
                ></div>
                <div className="pulse-text">HR: {bpm} bpm</div>
            </div>
        </div>
    )
}

export default PulseAnimation
