// Best-effort MusicBrainz enrichment. Only used to fetch a release year;
// any failure is swallowed by the caller so identification still succeeds.

const WS_URL = 'https://musicbrainz.org/ws/2'

// MusicBrainz asks every client to identify itself.
const USER_AGENT = 'MUSE/0.1 (https://github.com/ltrademark)'

interface ReleaseGroupResponse {
  'first-release-date'?: string
}

/**
 * Look up a release group's first-release year (e.g. "1996").
 * Returns undefined if unavailable. MusicBrainz sends CORS headers, so this
 * runs directly from the webview. Rate limit is 1 req/sec — fine for the one
 * call we make per identification.
 */
export async function fetchYear(
  releaseGroupId: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  try {
    const res = await fetch(`${WS_URL}/release-group/${releaseGroupId}?fmt=json`, {
      headers: { 'User-Agent': USER_AGENT },
      signal,
    })
    if (!res.ok) return undefined

    const data = (await res.json()) as ReleaseGroupResponse
    const date = data['first-release-date']
    const year = date?.slice(0, 4)
    return year && /^\d{4}$/.test(year) ? year : undefined
  } catch {
    return undefined
  }
}
