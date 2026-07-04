# Music ID — Even Realities G2

Shazam-style music identification for the [Even Realities G2](https://hub.evenrealities.com)
smart glasses. Tap the touchpad, the glasses listen for a few seconds, and the song
title + artist appear on the display.

Fully free identification stack — no commercial recognition API:

```
G2 mic (16kHz mono PCM) → Chromaprint fingerprint (WASM) → AcoustID → song metadata
```

> **Accuracy note:** AcoustID/Chromaprint were built to fingerprint clean digital audio
> files, not ambient audio captured through a microphone. Recognition of music playing
> over speakers is best-effort and works best when the audio is clean and loud.

## Stack

- **Even Hub SDK** (`@evenrealities/even_hub_sdk`) — glasses rendering + mic capture
- **Vue 3 (Options API)** + **SCSS** (CSS custom-property theming) — phone webview UI
- **rusty-chromaprint-wasm** — AcoustID/fpcalc-compatible fingerprints in the browser
- **AcoustID** `/v2/lookup` — free web service (sends `Access-Control-Allow-Origin: *`,
  so it runs client-side with no proxy)

## Setup

```bash
npm install
cp .env.example .env   # optional: add a dev AcoustID key (VITE_ACOUSTID_KEY)
npm run dev
```

Get a free AcoustID application key at
[acoustid.org/new-application](https://acoustid.org/new-application). You can also enter
it at runtime in the app's **Settings** screen (stored on-device, never committed).

## Develop

```bash
npm run dev                                    # Vite dev server (http://localhost:5173)
npx evenhub-simulator http://localhost:5173    # desktop G2 simulator
npx evenhub qr                                 # QR to sideload onto real glasses
```

## Build & package

```bash
npm run build                                  # type-check + bundle to dist/
npx evenhub pack app.json dist -o music-id.ehpk
```

## How it works

1. A tap (glasses touchpad or the phone button) starts a fixed listening window.
2. `bridge.audioControl` streams 16-bit PCM chunks, buffered into an `Int16Array`.
3. The samples are fingerprinted with Chromaprint (WASM) → compressed base64.
4. The fingerprint + duration are looked up against AcoustID.
5. The best match is shown on both the phone UI and the glasses, and saved to history.

The phone UI and the 576×288 glasses canvas are kept in sync by a small state machine
in `src/App.vue`; glasses rendering lives in `src/lib/glasses/`, the pipeline in
`src/lib/audio/` and `src/lib/api/`.
