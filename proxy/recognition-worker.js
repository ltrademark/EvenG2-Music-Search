/**
 * MUSE — recognition CORS relay (Cloudflare Worker)
 *
 * The Even Hub webview enforces CORS, and the recognition endpoint sends no
 * CORS headers, so a direct browser call fails ("Failed to fetch"). This worker
 * is a transparent reverse proxy that adds permissive CORS headers. It holds no
 * secrets (the endpoint needs no API key) and runs free on Cloudflare's Workers
 * free tier (100k requests/day).
 *
 * Deploy (one-time, free):
 *   1. Create a free Cloudflare account.
 *   2. `npm i -g wrangler` (or use the dashboard's code editor).
 *   3. `cd proxy && npx wrangler login && npx wrangler deploy`
 *      (or paste this into a new Worker in the Cloudflare dashboard).
 *   4. Copy the deployed URL, e.g. https://szm-prx.<you>.workers.dev
 *   5. In the app's .env:  VITE_RECOGNITION_PROXY=https://szm-prx.<you>.workers.dev
 *   6. Ensure app.json's network whitelist includes the worker host.
 *
 * The app calls this worker at the same path the endpoint expects
 * (/discovery/v5/...), so no app code changes are needed.
 */

const UPSTREAM_ORIGIN = 'https://amp.shazam.com'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const incoming = new URL(request.url)
    const target = UPSTREAM_ORIGIN + incoming.pathname + incoming.search

    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        'X-Shazam-Platform': request.headers.get('X-Shazam-Platform') || 'IPHONE',
        'X-Shazam-AppVersion': request.headers.get('X-Shazam-AppVersion') || '14.1.0',
        Accept: '*/*',
        'Content-Type': 'application/json',
        'Accept-Language': 'en',
      },
      body: request.method === 'POST' ? await request.text() : undefined,
    })

    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  },
}
