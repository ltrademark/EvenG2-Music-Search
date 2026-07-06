<div align="center">

<img src="public/icon_large.png" alt="MUSE logo" width="96" height="96" />

<h1>MUSE: Music Search</h1>

<p>
  <strong>Ambient music identification for the <a href="https://hub.evenrealities.com">Even Realities G2</a> smart glasses.</strong>
  <br />
  Tap the touchpad, MUSE listens for a few seconds, identifies the track, and shows the cover
  art, title, artist, and album — right on the glasses. It runs at <strong>net-zero cost</strong>:
  no paid recognition API and no API key.
</p>

</div>

```
G2 mic (16kHz mono PCM) → on-device audio signature → recognition service (via a free relay) → track + cover art
```

The signature is computed **on-device**; only a compact fingerprint leaves the glasses.

> **Note:** recognition goes through a free, unofficial third-party endpoint, relayed via a
> Cloudflare Worker (see [`proxy/`](proxy/)). It's ambient-robust in practice, but the endpoint is
> not an official/supported API and could change.

---

## Features

An Even Hub app is a web app running in a phone webview that also drives the 576×288 glasses
canvas over Bluetooth. MUSE has two coordinated surfaces plus a shared pipeline:

- **On the glasses** — a branded **splash**, a touchpad-driven **menu** (*Start Search* / *View
  History*), a live **▶ Listening** indicator with an animated waveform, a **result** screen with
  130×130 album art + title / artist / album (year), and a scrollable **history** browser with a
  per-entry detail view. Scroll to move the selection, tap to choose, double-tap to go back.
- **On the phone** — one-tap **Identify** with live status, a **result card** (cover art + year), a
  **History** list, a **Settings** screen (listen duration + microphone source), and a **Debug** tab
  that traces each step (mic level, signature, recognition result).
- **Net-zero cost** — no paid recognition API and no API key. The acoustic **signature is generated
  on-device** (FFT-based, in the browser), so no raw audio leaves the device — only a compact
  fingerprint is sent.
- **History on-device** — past identifications are persisted via the Even Hub local-storage bridge,
  so the glasses history survives restarts.
- **Graceful fallbacks** — a placeholder box when cover art is missing or blocked, and a static
  waveform if the animation can't run.

---

## Tech stack

- **[Even Hub SDK](https://www.npmjs.com/package/@evenrealities/even_hub_sdk)** — glasses
  rendering, microphone capture, input events, local storage.
- **Vue 3 (Options API)** + **SCSS** (themed with CSS custom properties) — the phone webview UI.
- **On-device audio-signature generation** in the browser (FFT-based, via `shazam-api`).
- **[@evenrealities/pretext](https://www.npmjs.com/package/@evenrealities/pretext)** — pixel-accurate
  text measurement for glasses layout.
- **Vite** + **TypeScript**, packaged with the **Even Hub CLI**.

---

## Getting started

**Prerequisites:** Node 20+ and [Yarn](https://classic.yarnpkg.com/) (classic).

```bash
yarn install
yarn dev                      # Vite dev server → http://localhost:5173
```

### Recognition relay

The recognition endpoint doesn't send CORS headers, and the webview enforces CORS, so requests
are routed through a free Cloudflare Worker relay (in [`proxy/`](proxy/)). A working relay URL is
**baked into `src/lib/api/recognition.ts`** (the `RECOGNITION_PROXY` constant), so no `.env` is
required.

To point at your own relay: deploy the worker (see its header for steps), then either edit that
constant or override it at build time with `VITE_RECOGNITION_PROXY=https://<your-worker>.workers.dev`.
Add the relay host to `app.json`'s `network` whitelist.

### Run in the desktop simulator

```bash
yarn simulate                 # opens the G2 simulator against http://localhost:5173
```

The simulator renders the 576×288 glasses display and exposes an automation API on port 9898
(`/api/input`, `/api/screenshot/glasses`, `/api/console`). Note: it can't inject real microphone
audio, so end-to-end identification is only testable on hardware. Use `VITE_DEMO=listening yarn dev`
(also `splash` / `1`) to seed a screen for layout checks.

### Run on real glasses

Same Wi-Fi network as your machine, then:

```bash
yarn qr                       # prints a QR code to sideload the app
```

The dev-server URL is configured in the `qr` script in `package.json` — update the IP to match
your machine.

### Build & package

```bash
yarn build                    # type-check + production bundle → dist/
yarn package                  # build, then pack into muse.ehpk for submission
```

The relay URL is baked in (see above), so the build needs no `.env`.

---

## How it works

1. A tap (glasses touchpad or the phone button) starts a fixed listening window.
2. `bridge.audioControl` streams 16-bit PCM chunks, buffered into an `Int16Array`.
3. An acoustic signature is generated on-device and POSTed (via the relay) to the recognition
   service.
4. The service returns the best match — title, artist, album, year, and cover art.
5. The result is shown on both the phone UI and the glasses, and saved to history.

The phone view and the glasses screen are driven by a small state machine in `src/App.vue`.

```
src/
  App.vue              # orchestrator: pipeline + phone view + glasses nav state machine
  views/               # phone screens: Identify / History / Settings / Debug
  components/           # ResultCard, StatusIndicator
  lib/
    audio/             # mic capture
    api/               # recognition client
    glasses/           # screen router, image (PNG→gray4), text + image waveform
    storage/           # settings + history (Even Hub local storage)
  styles/              # theme.scss (CSS variables) + global.scss
proxy/                 # Cloudflare Worker CORS relay
```

---

## Notes & limitations

- **Ambient accuracy** is good in practice, but depends on a clear, loud-enough capture.
- **BLE image cadence:** the glasses draw over Bluetooth at ~0.5–2s per update, so the listening
  waveform animates slowly on real hardware and album art takes a moment to appear.
- Album art / year are best-effort — the app degrades gracefully when they're missing.
- The recognition endpoint is unofficial and could change without notice.
