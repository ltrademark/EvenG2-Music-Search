// Fetch a cover-art URL and return it as a base64 data URI, so we can persist
// the image with the history entry (offline-friendly + travels with an export).
// The mzstatic host is already whitelisted and proven fetchable on device (see
// glasses/image.ts loadImagePng). Best-effort: returns null on any failure.
export async function toDataUrl(url?: string, signal?: AbortSignal): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
