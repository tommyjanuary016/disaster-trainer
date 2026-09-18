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

        const playPulseSound = (isSecondBeat: boolean = false) => {
            if (!audioCtxRef.current) return
            
            const ctx = audioCtxRef.current
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            // スマホスピーカーでも明瞭に聞こえる周波数帯（第1音: 150Hz->90Hz, 第2音: 180Hz->120Hz）
            osc.type = 'triangle' // サイン波より倍音を含み聞き取りやすい波形
            const startFreq = isSecondBeat ? 180 : 150
            const endFreq = isSecondBeat ? 120 : 90
            const volume = isSecondBeat ? 1.2 : 1.5

            osc.frequency.setValueAtTime(startFreq, ctx.currentTime)
            osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.12)

            // アタックとエンベロープ
            gain.gain.setValueAtTime(0, ctx.currentTime)
            gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.015)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.2)
        }

        // 初回再生
        playPulseSound(false)
        setTimeout(() => playPulseSound(true), 160)

        // BPMから間隔(ms)を計算してループ再生
        const intervalMs = (60 / bpm) * 1000
        intervalRef.current = window.setInterval(() => {
            playPulseSound(false)
            // ドクン・ドクンの2音目を少し遅れて鳴らす
            setTimeout(() => playPulseSound(true), 160)
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
