// Export / import the history as a JSON file. Webviews can be finicky about
// downloads, so exportHistory falls back to copying JSON to the clipboard and
// returns which path it took, letting the UI show the right feedback.
import type { TrackMatch } from './types'

const FILENAME = 'muse-history.json'

export type ExportResult = 'downloaded' | 'copied' | 'failed'

export async function exportHistory(items: TrackMatch[]): Promise<ExportResult> {
  const json = JSON.stringify(items, null, 2)

  // Preferred path: trigger a file download.
  try {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = FILENAME
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return 'downloaded'
  } catch {
    // Fallback: clipboard.
  }

  try {
    await navigator.clipboard.writeText(json)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** Parse + validate imported JSON into TrackMatch[]. Throws on bad input. */
export function parseImport(text: string): TrackMatch[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  if (!Array.isArray(data)) throw new Error('Expected a list of songs.')

  const items: TrackMatch[] = []
  for (const raw of data) {
    if (raw && typeof raw === 'object' && typeof (raw as any).title === 'string') {
      const m = raw as TrackMatch
      // Backfill a stable id and a required score if an older/edited file lacks them.
      items.push({
        ...m,
        acoustId: m.acoustId || `${m.title} - ${m.artist ?? ''}`,
        score: typeof m.score === 'number' ? m.score : 1,
      })
    }
  }
  if (!items.length) throw new Error('No songs found in that file.')
  return items
}
