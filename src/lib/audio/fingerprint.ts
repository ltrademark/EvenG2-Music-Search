import { fingerprintFromSamples } from 'rusty-chromaprint-wasm'
import type { CapturedAudio } from '../types'

export interface Fingerprint {
  /** Compressed base64 fingerprint in AcoustID/fpcalc format. */
  fingerprint: string
  /** Integer audio duration in seconds (AcoustID lookup parameter). */
  durationSec: number
}

/**
 * Compute an AcoustID-compatible Chromaprint fingerprint from captured PCM.
 *
 * Uses `rusty-chromaprint-wasm` (preset test2, AcoustID/fpcalc-compatible).
 * The WASM module is instantiated at import time via vite-plugin-wasm +
 * top-level-await, so the synchronous call here is safe.
 */
export async function computeFingerprint(audio: CapturedAudio): Promise<Fingerprint> {
  if (audio.samples.length === 0) {
    throw new Error('No audio was captured.')
  }

  const result = fingerprintFromSamples(audio.sampleRate, audio.channels, audio.samples)
  try {
    return {
      fingerprint: result.compressed,
      durationSec: Math.max(1, Math.round(audio.durationSec)),
    }
  } finally {
    // Release the WASM-owned result to avoid leaking linear memory.
    result.free()
  }
}
