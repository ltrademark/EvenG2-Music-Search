import { getBridge } from '../bridge'
import type { TrackMatch } from '../types'

const HISTORY_KEY = 'musicid.history'
const MAX_ENTRIES = 10

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
