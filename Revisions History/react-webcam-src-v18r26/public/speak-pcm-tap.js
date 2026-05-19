/**
 * PCM tap for Speak ASR: resample to 16 kHz mono (integer ratio accumulator), aggregate ~30 ms chunks, post RMS + PCM.
 */
class SpeakPcmTapProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super()
        this.inputSampleRate = options.processorOptions?.inputSampleRate || sampleRate
        this.targetRate = 16000
        this.decimAcc = 0
        this.chunkSamples = 480
        /** @type {Float32Array} */
        this._buf = new Float32Array(this.chunkSamples)
        this.bufIdx = 0
    }

    process(inputs, outputs) {
        const out0 = outputs[0]?.[0]
        if (out0) out0.fill(0)

        const ch0 = inputs[0]?.[0]
        if (!ch0 || ch0.length === 0) return true

        for (let i = 0; i < ch0.length; i++) {
            this.decimAcc += this.targetRate
            while (this.decimAcc >= this.inputSampleRate) {
                this.decimAcc -= this.inputSampleRate
                const s = ch0[i]
                this._buf[this.bufIdx++] = s
                if (this.bufIdx >= this.chunkSamples) {
                    let sumSq = 0
                    for (let j = 0; j < this.chunkSamples; j++) {
                        const v = this._buf[j]
                        sumSq += v * v
                    }
                    const rms = Math.sqrt(sumSq / this.chunkSamples)
                    const out = this._buf
                    this._buf = new Float32Array(this.chunkSamples)
                    this.bufIdx = 0
                    this.port.postMessage({ pcm: out, rms }, [out.buffer])
                }
                break
            }
        }
        return true
    }
}

registerProcessor('speak-pcm-tap', SpeakPcmTapProcessor)
