import { getBridge } from '../bridge'
import type { TrackMatch } from '../types'

const HISTORY_KEY = 'musicid.history'
// Higher than the glasses' short list — entries now carry base64 art, so watch
// the localStorage footprint if this grows much further.
const MAX_ENTRIES = 50

export async function loadHistory(): Promise<TrackMatch[]> {
  const bridge = await getBridge()
  const raw = await bridge.getLocalStorage(HISTORY_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as TrackMatch[]) : []
  } catch {
    return []
  }
}

/**
 * Prepend a match to the history, drop an immediately-repeated track, and cap
 * the list. Returns the updated list so callers can reuse it without re-reading.
 */
export async function addToHistory(match: TrackMatch): Promise<TrackMatch[]> {
  const existing = await loadHistory()
  const deduped = existing.filter((m) => m.acoustId !== match.acoustId)
  const updated = [match, ...deduped].slice(0, MAX_ENTRIES)

  const bridge = await getBridge()
  await bridge.setLocalStorage(HISTORY_KEY, JSON.stringify(updated))
  return updated
}

export async function clearHistory(): Promise<void> {
  const bridge = await getBridge()
  await bridge.setLocalStorage(HISTORY_KEY, JSON.stringify([]))
}

/**
 * Merge an imported list into the existing history: imported entries win on
 * `acoustId` collisions, order is newest-first by `identifiedAt`, and the whole
 * thing is capped. Returns the persisted list.
 */
export async function importHistory(incoming: TrackMatch[]): Promise<TrackMatch[]> {
  const existing = await loadHistory()
  const byId = new Map<string, TrackMatch>()
  for (const m of existing) byId.set(m.acoustId, m)
  for (const m of incoming) byId.set(m.acoustId, m) // imported wins

  const merged = [...byId.values()]
    .sort((a, b) => (b.identifiedAt ?? 0) - (a.identifiedAt ?? 0))
    .slice(0, MAX_ENTRIES)

  const bridge = await getBridge()
  await bridge.setLocalStorage(HISTORY_KEY, JSON.stringify(merged))
  return merged
}
