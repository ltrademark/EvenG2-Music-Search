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

- Identify the music playing around you with a tap.
- See the cover art, title, artist, and album for each song you find.
- Browse a history of everything you've identified.
- Open any song on Spotify, Apple Music, SoundCloud, or the web.
- Export and import your history, or clear it whenever you like.
- Choose how long it listens and which microphone it uses.
- Runs at no cost, with no account or API key required.

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

**Versioning:** bump `version` in `package.json` only — a `prebuild` step
(`scripts/sync-version.mjs`) copies it into `app.json`, and Vite inlines it as
`__APP_VERSION__` for the UI. Record user-facing changes in `CHANGELOG.md` and mirror the latest
in `src/changelog.ts` (shown in the What's New modal).

---

## How it works

1. A tap on the glasses touchpad starts a fixed listening window.
2. `bridge.audioControl` streams 16-bit PCM chunks, buffered into an `Int16Array`.
3. An acoustic signature is generated on-device and POSTed (via the relay) to the recognition
   service.
4. The service returns the best match — title, artist, album, year, and cover art.
5. The result is shown on the glasses and saved to history (browsable on the phone).

The phone view and the glasses screen are driven by a small state machine in `src/App.vue`.

```
src/
  App.vue              # orchestrator: pipeline + phone view + glasses nav state machine
  version.ts           # app name/description (version comes from package.json)
  changelog.ts         # latest highlights, shown in the What's New modal
  views/               # phone screens: History, Settings
  components/          # HistoryEntry, ServiceLinks, WhatsNew, DebugPanel
  lib/
    audio/             # mic capture
    api/               # recognition client + cover-art base64 caching
    glasses/           # screen router, image (PNG→gray4), text + image waveform
    storage/           # settings + history (Even Hub local storage)
  styles/              # theme.scss (CSS variables) + global.scss
scripts/               # sync-version.mjs (package.json → app.json on build)
proxy/                 # Cloudflare Worker CORS relay
```

---

## Notes & limitations

- **Ambient accuracy** is good in practice, but depends on a clear, loud-enough capture.
- **BLE image cadence:** the glasses draw over Bluetooth at ~0.5–2s per update, so the listening
  waveform animates slowly on real hardware and album art takes a moment to appear.
- Album art / year are best-effort — the app degrades gracefully when they're missing.
- The recognition endpoint is unofficial and could change without notice.
