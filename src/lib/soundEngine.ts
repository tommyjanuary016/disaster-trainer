// ======================================================
// マルチモーダル音響（Web Audio SE）＆ ハプティクス（振動）エンジン
// 外部音声ファイル不要・Web Audio APIによる医療機器シンセサイザー
// ======================================================

const MUTE_STORAGE_KEY = 'disaster_logic_sound_muted'

class MultimodalEngine {
    private ctx: AudioContext | null = null
    private muted: boolean = false

    constructor() {
        try {
            this.muted = localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
        } catch {
            this.muted = false
        }
    }

    /** ミュート状態の取得 */
    public isMuted(): boolean {
        return this.muted
    }

    /** ミュート状態の切り替え */
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

    /** AudioContext の安全な取得・再開 */
    private getContext(): AudioContext | null {
        if (this.muted) return null
        try {
            if (!this.ctx || this.ctx.state === 'closed') {
                const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
                if (!AudioCtx) return null
                this.ctx = new AudioCtx()
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {})
            }
            return this.ctx
        } catch {
            return null
        }
    }

    /** ハプティクス（バイブレーション）実行 */
    public vibrate(pattern: number | number[]): void {
        if (this.muted) return
        try {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(pattern)
            }
        } catch {
            // iOS Safari 等非対応環境では無視
        }
    }

    /** 軽い確認クリック音 */
    public playClickBeep(): void {
        const ctx = this.getContext()
        if (!ctx) return
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1046.5, now) // C6
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.065)
    }

    /**
     * ① QRコード読み取り成功音（ピピッ！というシャープな医療スキャナー音 ＋ 短振動）
     */
    public playScanSuccess(): void {
        this.vibrate([35, 30, 55])
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        // 第1音 (1760Hz A6 -> 2093Hz C7)
        const playTone = (startOffset: number, freq: number, duration: number) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(freq, now + startOffset)
            gain.gain.setValueAtTime(0.001, now + startOffset)
            gain.gain.linearRampToValueAtTime(0.22, now + startOffset + 0.01)
            gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now + startOffset)
            osc.stop(now + startOffset + duration + 0.01)
        }

        playTone(0, 1760, 0.065)
        playTone(0.075, 2349.32, 0.09) // D7
    }

    /**
     * ② バイタルサイン解禁・測定完了音（生体情報モニターのパルスビープ音）
     */
    public playVitalMonitorBeep(): void {
        this.vibrate(40)
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(987.77, now) // B5 (Nihon Kohden / Philips 風 SpO2 正常音)
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(0.2, now + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.17)
    }

    /**
     * ③ 処置・検査完了ファンファーレ（クリアで心地よい医療機器完了チャイム）
     */
    public playTreatmentComplete(): void {
        this.vibrate([50, 40, 90])
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sine'
            const start = now + idx * 0.075
            const dur = idx === notes.length - 1 ? 0.28 : 0.12
            osc.frequency.setValueAtTime(freq, start)
            gain.gain.setValueAtTime(0.001, start)
            gain.gain.linearRampToValueAtTime(0.18, start + 0.015)
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(start)
            osc.stop(start + dur + 0.01)
        })
    }

    /**
     * ④ 患者急変・悪化アラーム音（IEC 60601-1-8 高優先度医療アラーム風 3連パルス＋強振動）
     */
    public playCriticalAlert(): void {
        this.vibrate([120, 60, 120, 60, 200])
        const ctx = this.getContext()
        if (!ctx) return

        const now = ctx.currentTime
        // C6 - A5 - F5 の緊迫感ある3連パルス
        const pulses = [
            { offset: 0.0, freq: 1046.5, dur: 0.11 },
            { offset: 0.14, freq: 880.0, dur: 0.11 },
            { offset: 0.28, freq: 1046.5, dur: 0.16 },
        ]
        pulses.forEach(p => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'sawtooth'
            // ローパスフィルタで耳障りすぎない医療警報音に整形
            const filter = ctx.createBiquadFilter()
            filter.type = 'lowpass'
            filter.frequency.setValueAtTime(2200, now + p.offset)

            osc.frequency.setValueAtTime(p.freq, now + p.offset)
            gain.gain.setValueAtTime(0.001, now + p.offset)
            gain.gain.linearRampToValueAtTime(0.22, now + p.offset + 0.015)
            gain.gain.exponentialRampToValueAtTime(0.001, now + p.offset + p.dur)

            osc.connect(filter)
            filter.connect(gain)
            gain.connect(ctx.destination)
            osc.start(now + p.offset)
            osc.stop(now + p.offset + p.dur + 0.01)
        })
    }

    /**
     * ⑤ 模擬患者の心拍（Lub-Dub）ハプティクス振動
     * 画面に触れているスタッフにリアルな脈動を伝える
     */
    public triggerHeartbeatHaptics(): void {
        // 第1音（収縮期: 45ms振動）→ 115ms休止 → 第2音（拡張期: 30ms振動）
        this.vibrate([45, 115, 30])
    }
}

export const soundEngine = new MultimodalEngine()
