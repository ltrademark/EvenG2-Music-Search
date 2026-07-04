import type { Fingerprint } from '../audio/fingerprint'
import type { TrackMatch } from '../types'

const LOOKUP_URL = 'https://api.acoustid.org/v2/lookup'

// Shape of the parts of the AcoustID lookup response we consume.
interface AcoustIdArtist {
  id?: string
  name?: string
}
interface AcoustIdRecording {
  id?: string
  title?: string
  artists?: AcoustIdArtist[]
  releasegroups?: { id?: string; title?: string }[]
}
interface AcoustIdResult {
  id: string
  score: number
  recordings?: AcoustIdRecording[]
}
interface AcoustIdResponse {
  status: string
  error?: { message: string }
  results?: AcoustIdResult[]
}

export class AcoustIdError extends Error {}

/**
 * Look up a fingerprint against AcoustID and return the best match, or `null`
 * if nothing was recognized.
 *
 * AcoustID sends `Access-Control-Allow-Origin: *`, so this runs directly from
 * the webview with no proxy (verified during setup).
 */
export async function lookupFingerprint(
  fp: Fingerprint,
  clientKey: string,
  signal?: AbortSignal,
): Promise<TrackMatch | null> {
  if (!clientKey) {
    throw new AcoustIdError('No AcoustID API key configured. Add one in Settings.')
  }

  const params = new URLSearchParams({
    client: clientKey,
    duration: String(fp.durationSec),
    fingerprint: fp.fingerprint,
    meta: 'recordings+releasegroups+compress',
  })

  let res: Response
  try {
    res = await fetch(`${LOOKUP_URL}?${params.toString()}`, { signal })
  } catch (err) {
    throw new AcoustIdError(`Network error contacting AcoustID: ${(err as Error).message}`)
  }

  const data = (await res.json()) as AcoustIdResponse
  if (data.status !== 'ok') {
    throw new AcoustIdError(data.error?.message ?? `AcoustID returned status "${data.status}".`)
  }

  return pickBestMatch(data.results ?? [])
}

/** Choose the highest-scoring result that carries usable recording metadata. */
function pickBestMatch(results: AcoustIdResult[]): TrackMatch | null {
  const ranked = [...results].sort((a, b) => b.score - a.score)

  for (const result of ranked) {
    const recording = result.recordings?.find((r) => r.title && r.artists?.length)
    if (!recording) continue

    const releaseGroup = recording.releasegroups?.[0]
    return {
      acoustId: result.id,
      recordingId: recording.id,
      releaseGroupId: releaseGroup?.id,
      title: recording.title!,
      artist: (recording.artists ?? [])
        .map((a) => a.name)
        .filter(Boolean)
        .join(', '),
      album: releaseGroup?.title,
      coverArtUrl: releaseGroup?.id ? coverArtUrl(releaseGroup.id) : undefined,
      score: result.score,
    }
  }

  return null
}

/** Cover Art Archive front cover (250px) for a release group. */
export function coverArtUrl(releaseGroupId: string): string {
  return `https://coverartarchive.org/release-group/${releaseGroupId}/front-250`
}
