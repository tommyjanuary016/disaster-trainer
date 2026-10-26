import React, { useEffect, useRef } from 'react'
import { soundEngine } from '../../lib/soundEngine'
import { useWakeLock } from '../../hooks/useWakeLock'

interface PulseAnimationProps {
    bpm: number
    onClose: () => void
}

const PulseAnimation: React.FC<PulseAnimationProps> = ({ bpm, onClose }) => {
    const audioCtxRef = useRef<AudioContext | null>(null)
    const intervalRef = useRef<number | null>(null)
    // 脈拍表示中のスリープ自動防止
    useWakeLock(true)

    useEffect(() => {
        // AudioContextの初期化（マスターコンプレッサー付きでスマホでの音圧を増強）
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        const ctx: AudioContext = new AudioContext()
        audioCtxRef.current = ctx
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {})
        }

        const compressor = ctx.createDynamicsCompressor()
        compressor.threshold.setValueAtTime(-20, ctx.currentTime)
        compressor.knee.setValueAtTime(10, ctx.currentTime)
        compressor.ratio.setValueAtTime(6, ctx.currentTime)
        compressor.connect(ctx.destination)

        const playPulseSound = (isSecondBeat: boolean = false) => {
            if (!audioCtxRef.current || soundEngine.isMuted()) return

            const currentCtx = audioCtxRef.current
            if (currentCtx.state === 'suspended') {
                currentCtx.resume().catch(() => {})
            }

            // 低域（ドクンという筐体共振）＋ 中域倍音（スピーカーで明瞭に聞こえる鼓動音）の2オシレーター合成
            const oscLow = currentCtx.createOscillator()
            const oscMid = currentCtx.createOscillator()
            const gain = currentCtx.createGain()

            oscLow.type = 'triangle'
            oscMid.type = 'sine'

            const startFreq = isSecondBeat ? 210 : 170
            const endFreq = isSecondBeat ? 110 : 80
            const volume = isSecondBeat ? 1.5 : 1.9

            oscLow.frequency.setValueAtTime(startFreq, currentCtx.currentTime)
            oscLow.frequency.exponentialRampToValueAtTime(endFreq, currentCtx.currentTime + 0.14)

            oscMid.frequency.setValueAtTime(startFreq * 1.8, currentCtx.currentTime)
            oscMid.frequency.exponentialRampToValueAtTime(endFreq * 1.5, currentCtx.currentTime + 0.12)

            // アタックとエンベロープ
            gain.gain.setValueAtTime(0.0001, currentCtx.currentTime)
            gain.gain.linearRampToValueAtTime(volume, currentCtx.currentTime + 0.012)
            gain.gain.exponentialRampToValueAtTime(0.001, currentCtx.currentTime + 0.19)

            oscLow.connect(gain)
            oscMid.connect(gain)
            gain.connect(compressor)

            oscLow.start(currentCtx.currentTime)
            oscMid.start(currentCtx.currentTime)
            oscLow.stop(currentCtx.currentTime + 0.2)
            oscMid.stop(currentCtx.currentTime + 0.2)
        }

        // 初回再生 ＋ 心拍ハプティクス振動
        playPulseSound(false)
        soundEngine.triggerHeartbeatHaptics()
        setTimeout(() => playPulseSound(true), 160)

        // BPMから間隔(ms)を計算してループ再生
        const intervalMs = (60 / bpm) * 1000
        intervalRef.current = window.setInterval(() => {
            playPulseSound(false)
            soundEngine.triggerHeartbeatHaptics()
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

    useEffect(() => {
        // 表示時にスクロール位置を最上部に固定
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="actor-animation-overlay">
            <button className="actor-animation-overlay__close" onClick={onClose} aria-label="閉じる">
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
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.06em' }}>
                    🔊 心拍音と画面の脈動で脈拍（HR）を提示中
                </div>
            </div>
            <button
                onClick={onClose}
                className="button button--secondary"
                style={{
                    position: 'absolute',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'auto',
                    padding: '0.6rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10000
                }}
            >
                ✕ 画面を閉じる
            </button>
        </div>
    )
}

export default PulseAnimation
