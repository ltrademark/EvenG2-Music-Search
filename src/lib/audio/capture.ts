import { AudioInputSource } from '@evenrealities/even_hub_sdk'
import { getBridge } from '../bridge'
import type { CapturedAudio } from '../types'

// The G2 microphone streams mono PCM at a fixed format.
const SAMPLE_RATE = 16000
const CHANNELS = 1
const BYTES_PER_SAMPLE = 2 // 16-bit LE

export interface CaptureOptions {
  /** How long to listen, in seconds. */
  durationSec: number
  /** Which mic to open. Defaults to the glasses mic. */
  source?: AudioInputSource
  /** Called ~4x/sec with elapsed/remaining seconds, for a live countdown. */
  onProgress?: (elapsedSec: number, remainingSec: number) => void
  /** Optional abort signal to stop capture early. */
  signal?: AbortSignal
}

/**
 * Open the microphone, buffer PCM for `durationSec`, then stop and return the
 * captured samples as an interleaved Int16Array suitable for fingerprinting.
 *
 * Assumes the start-up page container has already been created (required
 * before `audioControl` per the SDK).
 */
export async function captureAudio(opts: CaptureOptions): Promise<CapturedAudio> {
  const { durationSec, source = AudioInputSource.Glasses, onProgress, signal } = opts
  const bridge = await getBridge()

  const chunks: Uint8Array[] = []
  let totalBytes = 0

  const unsubscribe = bridge.onEvenHubEvent((event) => {
    const pcm = event.audioEvent?.audioPcm
    if (pcm && pcm.length > 0) {
      chunks.push(pcm)
      totalBytes += pcm.length
    }
  })

  const opened = await bridge.audioControl(true, source)
  if (!opened) {
    unsubscribe()
    throw new Error('Could not open the microphone.')
  }

  try {
    await runTimer(durationSec, onProgress, signal)
  } finally {
    await bridge.audioControl(false)
    unsubscribe()
  }

  const samples = mergePcmChunks(chunks, totalBytes)
  const { peak, rms } = signalStats(samples)
  return {
    samples,
    sampleRate: SAMPLE_RATE,
    channels: CHANNELS,
    durationSec: totalBytes / BYTES_PER_SAMPLE / SAMPLE_RATE,
    chunkCount: chunks.length,
    byteCount: totalBytes,
    peak,
    rms,
  }
}

/** Peak absolute amplitude and RMS — used to tell silence from real audio. */
function signalStats(samples: Int16Array): { peak: number; rms: number } {
  let peak = 0
  let sumSq = 0
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i])
    if (a > peak) peak = a
    sumSq += samples[i] * samples[i]
  }
  const rms = samples.length ? Math.sqrt(sumSq / samples.length) : 0
  return { peak, rms: Math.round(rms) }
}

/** Wait `durationSec`, emitting progress, resolving early if aborted. */
function runTimer(
  durationSec: number,
  onProgress?: CaptureOptions['onProgress'],
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = performance.now()
    let interval: ReturnType<typeof setInterval> | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      if (interval) clearInterval(interval)
      if (timeout) clearTimeout(timeout)
      signal?.removeEventListener('abort', finish)
      resolve()
    }

    if (onProgress) {
      interval = setInterval(() => {
        const elapsed = (performance.now() - startedAt) / 1000
        onProgress(Math.min(elapsed, durationSec), Math.max(0, durationSec - elapsed))
      }, 250)
    }

    timeout = setTimeout(finish, durationSec * 1000)
    signal?.addEventListener('abort', finish, { once: true })
  })
}

/**
 * Concatenate PCM byte chunks and reinterpret as little-endian Int16 samples.
 * All target platforms are little-endian, matching the wire format.
 */
function mergePcmChunks(chunks: Uint8Array[], totalBytes: number): Int16Array {
  // Drop a trailing odd byte so the buffer is 16-bit aligned.
  const usableBytes = totalBytes - (totalBytes % BYTES_PER_SAMPLE)
  const merged = new Uint8Array(usableBytes)
  let offset = 0
  for (const chunk of chunks) {
    if (offset >= usableBytes) break
    const take = Math.min(chunk.length, usableBytes - offset)
    merged.set(take === chunk.length ? chunk : chunk.subarray(0, take), offset)
    offset += take
  }
  return new Int16Array(merged.buffer, 0, usableBytes / BYTES_PER_SAMPLE)
}
