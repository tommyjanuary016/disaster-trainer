// ======================================================
// マルチモーダル音響（Web Audio SE）エンジン
// ・モバイル端末（iOS Safari / Chrome・Android）での自動AudioContextアンロック対応
// ・スマホの小型スピーカーでも聞き取りやすいクリアな医療機器・スキャナー効果音合成
// ・Android等の Web Vibration API 対応端末では標準の触覚振動も自然に連動
// ======================================================

const MUTE_STORAGE_KEY = 'disaster_logic_sound_muted'

class MultimodalEngine {
    private ctx: AudioContext | null = null
    private compressor: DynamicsCompressorNode | null = null
    private muted: boolean = false
    private unlocked: boolean = false

    constructor() {
        try {
            this.muted = localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
        } catch {
            this.muted = false
        }
        this.setupGlobalTouchUnlock()
    }

    /**
     * iOS / Android ブラウザ対策：
     * 画面上の最初のタップ・クリック操作時に AudioContext を同期的に生成・resume して音声ロックを解除する
     */
    private setupGlobalTouchUnlock(): void {
        if (typeof window === 'undefined') return

        const unlockHandler = () => {
            if (this.unlocked && this.ctx && this.ctx.state === 'running') return
            try {
                const ctx = this.ensureContext()
                if (!ctx) return
                if (ctx.state === 'suspended') {
                    ctx.resume().catch(() => {})
                }
                // 無音の極短バッファを再生してモバイルブラウザのWebAudioロックを解除
                const buffer = ctx.createBuffer(1, 1, 22050)
                const source = ctx.createBufferSource()
                source.buffer = buffer
                source.connect(ctx.destination)
                source.start(0)
                this.unlocked = true
            } catch {
                // ignore
            }
        }

        window.addEventListener('touchstart', unlockHandler, { passive: true })
        window.addEventListener('touchend', unlockHandler, { passive: true })
        window.addEventListener('click', unlockHandler, { passive: true })
        window.addEventListener('keydown', unlockHandler, { passive: true })
    }

    /** ミュート状態の取得 */
    public isMuted(): boolean {
        return this.muted
    }

    /** ミュート状態の切り替え（ON時は確認音を鳴らす） */
    public toggleMute(): boolean {
        this.muted = !this.muted
        try {
            localStorage.setItem(MUTE_STORAGE_KEY, String(this.muted))
        } catch {
            // ignore storage errors
        }
        if (!this.muted) {
            this.playClickBeep()
        }
        return this.muted
    }

    /** AudioContext とマスターコンプレッサーの初期化・取得 */
    private ensureContext(): AudioContext | null {
        try {
            if (!this.ctx || this.ctx.state === 'closed') {
                const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
                if (!AudioCtx) return null
                this.ctx = new AudioCtx()

                // スマホスピーカーで音割れを防ぎつつ聞き取りやすい音圧に整えるコンプレッサー
                this.compressor = this.ctx.createDynamicsCompressor()
                this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime)
                this.compressor.knee.setValueAtTime(10, this.ctx.currentTime)
                this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime)
                this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime)
                this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime)
                this.compressor.connect(this.ctx.destination)
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {})
            }
            return this.ctx
        } catch {
            return null
        }
    }

    private getContext(): AudioContext | null {
        if (this.muted) return null
        return this.ensureContext()
    }

    private getDestination(ctx: AudioContext): AudioNode {
        return this.compressor || ctx.destination
    }

    /**
     * 標準 Web Vibration API 対応端末（Android等）でのみ自然なバイブレーションを実行
     */
    public vibrate(pattern: number | number[]): void {
        if (this.muted) return
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(pattern)
            }
        } catch {
            // ignore
        }
    }

    /** 確認クリック音（ボタン操作時の軽快な医療機器タッチ音） */
    public playClickBeep(): void {
        this.vibrate(40)
        const ctx = this.getContext()
        if (!ctx) return
        const now = ctx.currentTime
        const dest = this.getDestination(ctx)

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(1318.5, now) // E6
        osc.frequency.setValueAtTime(1760.0, now + 0.03) // A6
        gain.gain.setValueAtTime(0.5, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085)
        osc.connect(gain)
        gain.connect(dest)
        osc.start(now)
        osc.stop(now + 0.09)
    }

    /**
     * ① QRコード読み取り成功音（明快な「ピ・ピッ！」バーコードスキャナー音）
     */
    public playScanSuccess(): void {
        this.vibrate([70, 40, 100])
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        const dest = this.getDestination(ctx)

        const playScannerBeep = (startOffset: number, freq: number, duration: number) => {
            const oscMain = ctx.createOscillator()
            const oscSub = ctx.createOscillator()
            const filter = ctx.createBiquadFilter()
            const gain = ctx.createGain()

            oscMain.type = 'square'
            oscSub.type = 'triangle'
            oscMain.frequency.setValueAtTime(freq, now + startOffset)
            oscSub.frequency.setValueAtTime(freq * 0.5, now + startOffset)

            filter.type = 'bandpass'
            filter.frequency.setValueAtTime(freq, now + startOffset)
            filter.Q.setValueAtTime(1.2, now + startOffset)

            gain.gain.setValueAtTime(0.001, now + startOffset)
            gain.gain.linearRampToValueAtTime(0.85, now + startOffset + 0.008)
            gain.gain.setValueAtTime(0.8, now + startOffset + duration - 0.02)
            gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration)

            oscMain.connect(filter)
            oscSub.connect(filter)
            filter.connect(gain)
            gain.connect(dest)

            oscMain.start(now + startOffset)
            oscSub.start(now + startOffset)
            oscMain.stop(now + startOffset + duration + 0.01)
            oscSub.stop(now + startOffset + duration + 0.01)
        }

        // 「ピ・ピッ！」（2000Hz → 2637Hz E7）の2段スキャン音
        playScannerBeep(0.0, 2000, 0.085)
        playScannerBeep(0.105, 2637, 0.13)
    }

    /**
     * ② バイタルサイン解禁・測定完了音（生体情報モニターのクリアなパルスビープ2連音）
     */
    public playVitalMonitorBeep(): void {
        this.vibrate([60, 40, 60])
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        const dest = this.getDestination(ctx)

        const playMonitorTone = (offset: number, freq: number, dur: number) => {
            const osc = ctx.createOscillator()
            const oscHarm = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            oscHarm.type = 'sine'
            osc.frequency.setValueAtTime(freq, now + offset)
            oscHarm.frequency.setValueAtTime(freq * 2, now + offset)

            gain.gain.setValueAtTime(0.001, now + offset)
            gain.gain.linearRampToValueAtTime(0.75, now + offset + 0.012)
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur)

            osc.connect(gain)
            oscHarm.connect(gain)
            gain.connect(dest)
            osc.start(now + offset)
            oscHarm.start(now + offset)
            osc.stop(now + offset + dur + 0.01)
            oscHarm.stop(now + offset + dur + 0.01)
        }

        playMonitorTone(0.0, 1046.5, 0.14) // C6
        playMonitorTone(0.16, 1318.5, 0.18) // E6
    }

    /**
     * ③ 処置・検査完了ファンファーレ（医療機器コンプリートチャイム）
     */
    public playTreatmentComplete(): void {
        this.vibrate([80, 50, 80, 50, 140])
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        const dest = this.getDestination(ctx)
        const notes = [587.33, 880.0, 1174.66, 1760.0] // D5, A5, D6, A6

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator()
            const oscSub = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            oscSub.type = 'sine'
            const start = now + idx * 0.09
            const dur = idx === notes.length - 1 ? 0.38 : 0.14

            osc.frequency.setValueAtTime(freq, start)
            oscSub.frequency.setValueAtTime(freq * 0.5, start)

            gain.gain.setValueAtTime(0.001, start)
            gain.gain.linearRampToValueAtTime(0.8, start + 0.012)
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur)

            osc.connect(gain)
            oscSub.connect(gain)
            gain.connect(dest)
            osc.start(start)
            oscSub.start(start)
            osc.stop(start + dur + 0.01)
            oscSub.stop(start + dur + 0.01)
        })
    }

    /**
     * ④ 患者急変・悪化アラーム音（ICU高優先度アラーム風 3連パルス）
     */
    public playCriticalAlert(): void {
        this.vibrate([160, 70, 160, 70, 260])
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        const dest = this.getDestination(ctx)
        const pulses = [
            { offset: 0.0, freq: 1174.66, dur: 0.14 },  // D6
            { offset: 0.17, freq: 932.33, dur: 0.14 },  // Bb5
            { offset: 0.34, freq: 1174.66, dur: 0.22 }, // D6
        ]

        pulses.forEach(p => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sawtooth'

            const filter = ctx.createBiquadFilter()
            filter.type = 'lowpass'
            filter.frequency.setValueAtTime(2600, now + p.offset)

            osc.frequency.setValueAtTime(p.freq, now + p.offset)
            gain.gain.setValueAtTime(0.001, now + p.offset)
            gain.gain.linearRampToValueAtTime(0.85, now + p.offset + 0.012)
            gain.gain.exponentialRampToValueAtTime(0.001, now + p.offset + p.dur)

            osc.connect(filter)
            filter.connect(gain)
            gain.connect(dest)
            osc.start(now + p.offset)
            osc.stop(now + p.offset + p.dur + 0.01)
        })
    }

    /**
     * ⑤ 模擬患者の心拍（Lub-Dub）補助（Android等の対応端末のみ振動）
     */
    public triggerHeartbeatHaptics(): void {
        this.vibrate([80, 110, 60])
    }
}

export const soundEngine = new MultimodalEngine()
