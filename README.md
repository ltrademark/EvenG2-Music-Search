# MUSE: Music Search

Ambient music identification for the [Even Realities G2](https://hub.evenrealities.com) smart
glasses. Tap the touchpad, MUSE listens for a few seconds, identifies the track, and shows the
cover art, title, artist, and album — right on the glasses.

It runs at **net-zero cost** — no paid recognition API and no API key:

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
canvas over Bluetooth. MUSE has two coordinated surfaces:

### On the glasses
- **Splash** — branded loading screen.
- **Menu** — *Start Search* / *View History*, navigated with the touchpad (scroll to move the
  selection, tap to choose).
- **Listening** — a live "▶ Listening" indicator with an animated waveform; double-tap to cancel.
- **Result** — 130×130 album art, track title, artist, and album (year). Tap to search again,
  double-tap to go back. Falls back to a placeholder when art isn't available.
- **History** — a scrollable list of past identifications; tap a row for a detail view with the
  art and the date it was identified.

### On the phone
- One-tap **Identify** with live status, a result card (cover art + year), a **History** list, a
  **Settings** screen (listen duration + microphone source), and a **Debug** tab that traces each
  step (mic level, signature, recognition result).

### Under the hood
- On-device audio-**signature** generation (WebAssembly) — no raw audio leaves the device.
- A stateless **Cloudflare Worker** relay adds CORS so the webview can reach the recognition
  endpoint; the service returns title/artist/album/year and cover art directly.
- Recognition **history** persisted on-device via the Even Hub local storage bridge.

---

## Tech stack

- **[Even Hub SDK](https://www.npmjs.com/package/@evenrealities/even_hub_sdk)** — glasses
  rendering, microphone capture, input events, local storage.
- **Vue 3 (Options API)** + **SCSS** (themed with CSS custom properties) — the phone webview UI.
- On-device audio-signature generation in the browser.
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

### Recognition relay (required for recognition to work)

The recognition endpoint doesn't send CORS headers, and the webview enforces CORS, so requests
are routed through a free Cloudflare Worker relay:

1. Deploy the worker in [`proxy/`](proxy/) (see its header for steps) — free tier, no secrets.
2. Create a `.env` with the worker URL:
   ```
   VITE_RECOGNITION_PROXY=https://<your-worker>.workers.dev
   ```
3. Add the worker host to `app.json`'s `network` whitelist.

### Run in the desktop simulator

```bash
yarn simulate                 # opens the G2 simulator against http://localhost:5173
```

The simulator renders the 576×288 glasses display and exposes an automation API on port 9898
(`/api/input`, `/api/screenshot/glasses`, `/api/console`). Note: it can't inject real microphone
audio, so end-to-end identification is only testable on hardware.

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

`VITE_RECOGNITION_PROXY` is inlined at build time — build with `.env` present.

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
    glasses/           # screen router, image (PNG→gray) + waveform rendering
    storage/           # settings + history (Even Hub local storage)
  styles/              # theme.scss (CSS variables) + global.scss
proxy/                 # Cloudflare Worker CORS relay
```

---

## Notes & limitations

- **Ambient accuracy** is good in practice, but depends on a clear, loud-enough capture.
- **BLE image cadence:** the glasses draw images over Bluetooth at ~0.5–2s per frame, so the
  listening waveform animates slowly on real hardware and album art takes a moment to appear.
- Album art / year are best-effort — the app degrades gracefully when they're missing.
- The recognition endpoint is unofficial and could change without notice.
