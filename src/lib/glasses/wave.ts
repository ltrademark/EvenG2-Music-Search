import { imageToPng, pushImage } from './image'

// The listening waveform. Sprite sheet is 49 frames of 80x20 laid horizontally
// (wave_sprites.png, 3920x20). Over BLE each image push costs ~0.5-2s, so we
// subsample to a handful of frames and loop them. Tunable below.
export const WAVE_W = 80
export const WAVE_H = 20
const SHEET_URL = '/wave_sprites.png'
const STATIC_URL = '/wave-full.png'

/** How many frames to sample from the 49-frame sheet, and the per-frame delay. */
export const WAVE_FRAMES = 8
export const WAVE_FRAME_MS = 120

let framesPromise: Promise<Uint8Array[]> | null = null
let running = false

/** Load + slice + encode the wave frames once (cached). */
function loadFrames(): Promise<Uint8Array[]> {
  if (!framesPromise) framesPromise = buildFrames()
  return framesPromise
}

async function buildFrames(): Promise<Uint8Array[]> {
  const res = await fetch(SHEET_URL)
  const bitmap = await createImageBitmap(await res.blob())
  try {
    const total = Math.max(1, Math.floor(bitmap.width / WAVE_W))
    const canvas = document.createElement('canvas')
    canvas.width = WAVE_W
    canvas.height = WAVE_H
    const ctx = canvas.getContext('2d')!

    const frames: Uint8Array[] = []
    for (let f = 0; f < WAVE_FRAMES; f++) {
      const srcIndex = Math.floor((f * total) / WAVE_FRAMES)
      ctx.clearRect(0, 0, WAVE_W, WAVE_H)
      ctx.drawImage(bitmap, srcIndex * WAVE_W, 0, WAVE_W, WAVE_H, 0, 0, WAVE_W, WAVE_H)
      // Crisp line art → no dithering.
      frames.push(await imageToPng(canvas, WAVE_W, WAVE_H, { dither: false }))
    }
    return frames
  } finally {
    bitmap.close()
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Loop the wave animation into an image container until stop() is called.
 * Serial pushes (SDK requirement). Falls back to a single static wave frame
 * if the sprite sheet can't be loaded.
 */
export async function start(containerID: number, containerName: string): Promise<void> {
  running = true
  let frames: Uint8Array[]
  try {
    frames = await loadFrames()
  } catch {
    await renderStatic(containerID, containerName)
    return
  }

  let i = 0
  while (running) {
    await pushImage(containerID, containerName, frames[i % frames.length])
    i++
    if (!running) break
    await sleep(WAVE_FRAME_MS)
  }
}

export function stop(): void {
  running = false
}

/** Render a single static wave (fallback when animation can't run). */
async function renderStatic(containerID: number, containerName: string): Promise<void> {
  try {
    const res = await fetch(STATIC_URL)
    const bitmap = await createImageBitmap(await res.blob())
    try {
      await pushImage(containerID, containerName, await imageToPng(bitmap, WAVE_W, WAVE_H, { dither: false }))
    } finally {
      bitmap.close()
    }
  } catch {
    // give up quietly; the "Listening" text still conveys state
  }
}
