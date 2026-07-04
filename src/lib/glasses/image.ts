import { ImageRawDataUpdate } from '@evenrealities/even_hub_sdk'
import { getBridge } from '../bridge'

// updateImageRawData expects *encoded image bytes* (PNG) — the host decodes and
// converts to the display's 4-bit grayscale. We pre-render to grayscale (with
// optional ordered dithering) at the container's exact size, then encode PNG.

// 4x4 Bayer matrix (normalized) for ordered dithering of photographic art.
const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

export interface RenderOptions {
  /** Ordered-dither for smoother tone on photos (album art). Default true. */
  dither?: boolean
}

/** Draw a source into a w×h canvas as dithered 4-bit-quantized grayscale. */
function toGrayCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  dither: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0, width, height)
  const img = ctx.getImageData(0, 0, width, height)
  const d = img.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = d[i + 3] / 255
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * a
      let level = (lum / 255) * 15
      if (dither) level += BAYER_4[y & 3][x & 3] - 0.5
      // Quantize to 16 levels, expand back to 0..255 for the PNG.
      const v = Math.max(0, Math.min(15, Math.round(level))) * 17
      d[i] = d[i + 1] = d[i + 2] = v
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('PNG encode failed'))
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject)
    }, 'image/png')
  })
}

/** Encode any image source to grayscale PNG bytes at w×h. */
export function imageToPng(
  source: CanvasImageSource,
  width: number,
  height: number,
  opts: RenderOptions = {},
): Promise<Uint8Array> {
  return canvasToPng(toGrayCanvas(source, width, height, opts.dither ?? true))
}

/**
 * Fetch a remote image and encode it as grayscale PNG bytes at w×h.
 * Returns null on any failure (network, CORS, decode) → caller shows a
 * placeholder. CAA/archive.org send CORS headers, so the blob decodes cleanly.
 */
export async function loadImagePng(
  url: string,
  width: number,
  height: number,
  opts?: RenderOptions,
): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bitmap = await createImageBitmap(await res.blob())
    try {
      return await imageToPng(bitmap, width, height, opts)
    } finally {
      bitmap.close()
    }
  } catch {
    return null
  }
}

/** A "no art" placeholder: a hollow box outline, as PNG bytes. */
export function placeholderPng(width: number, height: number): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, width - 2, height - 2)
  return canvasToPng(canvas)
}

/** Push encoded image bytes to an existing image container. */
export async function pushImage(
  containerID: number,
  containerName: string,
  imageData: Uint8Array,
): Promise<void> {
  const bridge = await getBridge()
  await bridge.updateImageRawData(
    new ImageRawDataUpdate({ containerID, containerName, imageData }),
  )
}
