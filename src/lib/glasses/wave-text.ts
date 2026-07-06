// Text-based listening waveform. The G2 firmware font has no free-floating
// up/mid/down line glyphs (block sextants U+1FB0x, scan-lines U+23BA-BD, macron,
// braille all render as tofu — verified in the simulator). The only wave-capable
// glyphs it *does* render are the bottom-anchored block bars U+2581-2588
// (▁▂▃▄▅▆▇█). So the wave is a bouncing "equalizer": each cell is a bar whose
// height oscillates mid → tall → mid → short, and adjacent cells are offset by
// one phase, so the row reads as a wave rippling across "▶ Listening".
//
// Cheaper per frame than the image wave (a tiny text update vs. a PNG), though
// on real hardware every frame is still one ~0.5-2s BLE round-trip.
import { TextContainerUpgrade } from '@evenrealities/even_hub_sdk'
import { getBridge } from '../bridge'

// One cell's height cycle: a smooth bounce centered on ▄, up to ▆, down to ▂.
// Offsetting each cell into it by its index makes the wave travel.
const PHASES = ['▄', '▅', '▆', '▅', '▄', '▃', '▂', '▃']
const MID = '▄'

export const WAVE_CELLS = 6
export const WAVE_FRAME_MS = 140

/** Resting waveform (all mid-height), shown before the animation loop starts. */
export const REST = MID.repeat(WAVE_CELLS)

let running = false

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** The strip at animation step `t` — each cell offset one phase from the last. */
function frame(t: number): string {
  let s = ''
  for (let i = 0; i < WAVE_CELLS; i++) s += PHASES[(t + i) % PHASES.length]
  return s
}

/**
 * Loop the text wave into `containerID` until stop() is called. Serial upgrades
 * (SDK requirement). The container should already hold REST from screen build.
 */
export async function start(containerID: number, containerName: string): Promise<void> {
  running = true
  const bridge = await getBridge()
  let t = 0
  while (running) {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID, containerName, content: frame(t) }),
    )
    t++
    if (!running) break
    await sleep(WAVE_FRAME_MS)
  }
}

export function stop(): void {
  running = false
}
