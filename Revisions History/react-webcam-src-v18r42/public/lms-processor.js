/**
 * NLMS adaptive echo cancellation — mic on input 0, music reference on input 1.
 * No FFT / clap detection here (main thread AnalyserNode on output).
 */
class LmsProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this.L = 128
        this.w = new Float32Array(this.L)
        this.rDelay = new Float32Array(this.L)
        this.mu = 0.15
        this.eps = 1e-5
    }

    process(inputs, outputs) {
        const micIn = inputs[0]
        const refIn = inputs[1]
        const out = outputs[0]
        if (!out || !out[0]) return true

        const mic = micIn && micIn[0]
        const ref = refIn && refIn[0] ? refIn[0] : null
        const ch = out[0]
        const n = ch.length

        if (!mic) {
            ch.fill(0)
            return true
        }

        for (let i = 0; i < n; i++) {
            const x = mic[i]
            const r = ref ? ref[i] : 0

            // shift delay line (oldest at end)
            for (let k = this.L - 1; k > 0; k--) {
                this.rDelay[k] = this.rDelay[k - 1]
            }
            this.rDelay[0] = r

            let y = 0
            for (let k = 0; k < this.L; k++) {
                y += this.w[k] * this.rDelay[k]
            }
            const e = x - y

            let norm = this.eps
            for (let k = 0; k < this.L; k++) {
                norm += this.rDelay[k] * this.rDelay[k]
            }
            const scale = (this.mu * e) / norm
            for (let k = 0; k < this.L; k++) {
                this.w[k] += scale * this.rDelay[k]
            }

            ch[i] = e
        }

        return true
    }
}

registerProcessor('lms-processor', LmsProcessor)
