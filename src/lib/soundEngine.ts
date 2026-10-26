// ======================================================
// マルチモーダル音響（Web Audio SE）＆ ハプティクス（振動）エンジン v2
// ・モバイル端末（iOS Safari / Android Chrome）での自動AudioContextアンロック対応
// ・スマホの小型スピーカーでも確実に響く「大音量＋ダイナミクスコンプレッサー＋低音レイヤー」合成
// ・iOS等の navigator.vibrate 非対応端末でもスピーカーの超低周波パルスで指先に振動感を伝える疑似ハプティクス搭載
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
     * iOS Safari / Android Chrome 対策：
     * 画面上の最初のタップ・クリック操作時に AudioContext を同期的に生成・resume してロックを解除する
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
                // 無音の極短バッファを再生してiOSのWebAudioロックを完全解除
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

    /** ミュート状態の切り替え（ON時は即座に力強い確認音＋バイブを鳴らす） */
    public toggleMute(): boolean {
        this.muted = !this.muted
        try {
            localStorage.setItem(MUTE_STORAGE_KEY, String(this.muted))
        } catch {
            // ignore storage errors
        }
        if (!this.muted) {
            this.playScanSuccess()
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

                // スマホスピーカーで音割れを防ぎつつ音圧を最大化するコンプレッサー
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
     * ハプティクス（バイブレーション）実行
     * Android 等では navigator.vibrate を強く駆動し、
     * iOS Safari 等でもスピーカーの低周波アタック（95Hz サブベースパルス）で本体筐体を微振動させる
     */
    public vibrate(pattern: number | number[], withSubBassThump: boolean = true): void {
        if (this.muted) return
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(pattern)
            }
        } catch {
            // ignore
        }

        if (withSubBassThump) {
            const ctx = this.getContext()
            if (!ctx) return
            const now = ctx.currentTime
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(115, now)
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.055)
            gain.gain.setValueAtTime(0.65, now)
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
            osc.connect(gain)
            gain.connect(this.getDestination(ctx))
            osc.start(now)
            osc.stop(now + 0.065)
        }
    }

    /** 確認クリック音（ボタン操作時にもはっきり分かる医療タッチ音） */
    public playClickBeep(): void {
        this.vibrate(60, true)
        const ctx = this.getContext()
        if (!ctx) return
        const now = ctx.currentTime
        const dest = this.getDestination(ctx)

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(1318.5, now) // E6
        osc.frequency.setValueAtTime(1760.0, now + 0.03) // A6
        gain.gain.setValueAtTime(0.55, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085)
        osc.connect(gain)
        gain.connect(dest)
        osc.start(now)
        osc.stop(now + 0.09)
    }

    /**
     * ① QRコード読み取り成功音（誰でも一発で気づく「ピピッ！」高輝度バーコードスキャナー音 ＋ 2連強バイブ）
     */
    public playScanSuccess(): void {
        // スマホで明確に感じる2連バイブレーション (100ms - 50ms休止 - 140ms)
        this.vibrate([100, 50, 140], true)
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        const dest = this.getDestination(ctx)

        // 倍音が豊富でスマホスピーカーで最も通りやすい square + triangle デュアルオシレーター
        const playScannerBeep = (startOffset: number, freq: number, duration: number) => {
            const oscMain = ctx.createOscillator()
            const oscSub = ctx.createOscillator()
            const filter = ctx.createBiquadFilter()
            const gain = ctx.createGain()

            oscMain.type = 'square'
            oscSub.type = 'triangle'
            oscMain.frequency.setValueAtTime(freq, now + startOffset)
            oscSub.frequency.setValueAtTime(freq * 0.5, now + startOffset) // 1オクターブ下の厚み

            filter.type = 'bandpass'
            filter.frequency.setValueAtTime(freq, now + startOffset)
            filter.Q.setValueAtTime(1.2, now + startOffset)

            gain.gain.setValueAtTime(0.001, now + startOffset)
            gain.gain.linearRampToValueAtTime(0.95, now + startOffset + 0.008)
            gain.gain.setValueAtTime(0.9, now + startOffset + duration - 0.02)
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

        // 「ピ・ピッ！」（2000Hz → 2637Hz E7）の明快な2段スキャン音
        playScannerBeep(0.0, 2000, 0.085)
        playScannerBeep(0.105, 2637, 0.13)
    }

    /**
     * ② バイタルサイン解禁・測定完了音（生体情報モニターの明瞭なパルスビープ2連音）
     */
    public playVitalMonitorBeep(): void {
        this.vibrate([90, 40, 90], true)
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
            gain.gain.linearRampToValueAtTime(0.8, now + offset + 0.012)
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
     * ③ 処置・検査完了ファンファーレ（はっきり響く医療機器コンプリートチャイム ＋ 3連振動）
     */
    public playTreatmentComplete(): void {
        this.vibrate([100, 50, 100, 50, 180], true)
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
            gain.gain.linearRampToValueAtTime(0.85, start + 0.012)
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
     * ④ 患者急変・悪化アラーム音（ICU高優先度アラーム風 強力3連パルス＋長振動）
     */
    public playCriticalAlert(): void {
        this.vibrate([200, 80, 200, 80, 320], true)
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
            gain.gain.linearRampToValueAtTime(0.9, now + p.offset + 0.012)
            gain.gain.exponentialRampToValueAtTime(0.001, now + p.offset + p.dur)

            osc.connect(filter)
            filter.connect(gain)
            gain.connect(dest)
            osc.start(now + p.offset)
            osc.stop(now + p.offset + p.dur + 0.01)
        })
    }

    /**
     * ⑤ 模擬患者の心拍（Lub-Dub）ハプティクス振動
     * 画面に触れているスタッフにリアルな脈動を伝える
     */
    public triggerHeartbeatHaptics(): void {
        // 第1音（収縮期: 90ms強振動）→ 110ms休止 → 第2音（拡張期: 65ms振動）
        this.vibrate([90, 110, 65], true)
    }
}

export const soundEngine = new MultimodalEngine()
