import { AudioInputSource } from '@evenrealities/even_hub_sdk'
import { getBridge } from '../bridge'

const SETTINGS_KEY = 'musicid.settings'

export interface Settings {
  /** AcoustID application API key. */
  acoustIdKey: string
  /** How many seconds to listen before fingerprinting. */
  captureSeconds: number
  /** Which microphone to capture from. */
  micSource: AudioInputSource
}

export const DEFAULT_SETTINGS: Settings = {
  // Dev convenience: fall back to a build-time key if present. In production
  // the user enters their own key in the Settings screen.
  acoustIdKey: import.meta.env.VITE_ACOUSTID_KEY ?? '',
  captureSeconds: 10,
  micSource: AudioInputSource.Glasses,
}

export async function loadSettings(): Promise<Settings> {
  const bridge = await getBridge()
  const raw = await bridge.getLocalStorage(SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      acoustIdKey: parsed.acoustIdKey || DEFAULT_SETTINGS.acoustIdKey,
      captureSeconds: clampSeconds(parsed.captureSeconds),
      micSource:
        parsed.micSource === AudioInputSource.Phone
          ? AudioInputSource.Phone
          : AudioInputSource.Glasses,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const bridge = await getBridge()
  await bridge.setLocalStorage(SETTINGS_KEY, JSON.stringify(settings))
}

/** Keep the capture window within a sane, AcoustID-usable range. */
function clampSeconds(value: unknown): number {
  const n = typeof value === 'number' ? value : DEFAULT_SETTINGS.captureSeconds
  return Math.min(20, Math.max(5, Math.round(n)))
}
