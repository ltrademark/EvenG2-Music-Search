// On-device audio recognition. We generate a compact acoustic signature
// locally with the `shazam-api` library's browser-safe pieces, then POST it to
// the recognition endpoint ourselves so we control the request (and can route
// it through a CORS relay when the webview blocks the direct call).
//
// Deep imports avoid the package index, which pulls in node-fetch and would
// break the browser build.
import { SignatureGenerator } from 'shazam-api/dist/algorithm'
import { s16LEToSamplesArray } from 'shazam-api/dist/utils'
import type { CapturedAudio, TrackMatch } from '../types'

// Direct by default; set VITE_RECOGNITION_PROXY to a CORS-relay base URL
// (e.g. a free Cloudflare Worker) if the webview blocks the direct call.
const BASE = import.meta.env.VITE_RECOGNITION_PROXY || 'https://amp.shazam.com'

// Sample roughly the last ~12s; cap to keep the signature reasonable.
const MAX_SAMPLES = 16000 * 12

const PARAMS: Record<string, string> = {
  sync: 'true',
  webv3: 'true',
  sampling: 'true',
  connected: '',
  shazamapiversion: 'v3',
  sharehub: 'true',
  video: 'v3',
}

export interface RecognitionResult {
  match: TrackMatch | null
  /** Whether the service returned a match. */
  matched: boolean
  /** Signature length in ms (for debugging). */
  sampleMs: number
}

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
    .toUpperCase()

/**
 * Recognize the captured audio. Returns the best match (or null), plus
 * signature info for the debug panel. Throws on network/CORS failure.
 */
export async function recognize(
  audio: CapturedAudio,
  signal?: AbortSignal,
): Promise<RecognitionResult> {
  // Raw 16-bit LE PCM bytes → int16 sample array (the format the encoder wants).
  const bytes = new Uint8Array(
    audio.samples.buffer,
    audio.samples.byteOffset,
    Math.min(audio.samples.byteLength, MAX_SAMPLES * 2),
  )
  const samples = s16LEToSamplesArray(bytes)

  const signature = new SignatureGenerator().getSignature(samples)
  if (!signature) throw new Error('Failed to generate the audio signature.')

  const sampleMs = Math.round((signature.numberSamples / signature.sampleRateHz) * 1000)
  const body = JSON.stringify({
    timezone: 'Europe/Paris',
    signature: { uri: signature.encodeToUri(), samplems: sampleMs },
    timestamp: Date.now(),
    context: {},
    geolocation: {},
  })

  const url = new URL(`${BASE}/discovery/v5/en/US/android/-/tag/${uuid()}/${uuid()}`)
  for (const [k, v] of Object.entries(PARAMS)) url.searchParams.append(k, v)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: 'POST',
      // User-Agent / Accept-Encoding are set by the browser and can't be overridden.
      headers: {
        'X-Shazam-Platform': 'IPHONE',
        'X-Shazam-AppVersion': '14.1.0',
        Accept: '*/*',
        'Content-Type': 'application/json',
        'Accept-Language': 'en',
      },
      body,
      signal,
    })
  } catch (err) {
    // A cross-origin fetch that's blocked surfaces only as a generic TypeError.
    const host = new URL(BASE).host
    throw new Error(
      `Could not reach ${host} (${(err as Error).message}). ` +
        (import.meta.env.VITE_RECOGNITION_PROXY
          ? 'Check the proxy is deployed and whitelisted.'
          : 'Likely CORS — set VITE_RECOGNITION_PROXY to a relay.'),
    )
  }

  const data = await res.json()
  return { match: toTrackMatch(data), matched: !!data?.matches?.length, sampleMs }
}

/** Map a recognition response to our TrackMatch, or null if no usable match. */
function toTrackMatch(data: any): TrackMatch | null {
  if (!data?.matches?.length || !data.track) return null
  const track = data.track
  const song = (track.sections ?? []).find((s: any) => s.type === 'SONG')
  const meta: any[] = song?.metadata ?? []
  const field = (title: string) => meta.find((m) => m.title === title)?.text

  return {
    acoustId: track.key ?? `${track.title} - ${track.subtitle}`,
    title: track.title,
    artist: track.subtitle,
    album: field('Album'),
    year: field('Released'),
    coverArtUrl: track.images?.coverarthq ?? track.images?.coverart,
    score: 1,
  }
}
