# MUSE: Music Search

Shazam-style music identification for the [Even Realities G2](https://hub.evenrealities.com)
smart glasses. Tap the touchpad, MUSE listens for a few seconds, identifies the track, and
shows the cover art, title, artist, and album — right on the glasses.

It runs on a **fully free identification stack** — no commercial recognition API:

```
G2 mic (16kHz mono PCM) → Chromaprint fingerprint (WASM) → AcoustID → MusicBrainz / Cover Art Archive
```

> **Accuracy note:** AcoustID/Chromaprint were built to fingerprint clean digital audio files,
> not ambient audio captured through a microphone. Recognition of music playing over speakers is
> best-effort and works best when the audio is clean and loud.

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
- One-tap **Identify** with live status, a result card (cover art + year), a **History** list,
  and a **Settings** screen for the AcoustID key, listen duration, and microphone source.

### Under the hood
- On-device **Chromaprint** fingerprinting via WebAssembly — no audio leaves the device, only a
  compact fingerprint.
- **AcoustID** lookup, enriched with the **MusicBrainz** release year and **Cover Art Archive**
  album art. All fetched client-side (every endpoint sends permissive CORS headers) — no backend.
- Recognition **history** persisted on-device via the Even Hub local storage bridge.

---

## Tech stack

- **[Even Hub SDK](https://www.npmjs.com/package/@evenrealities/even_hub_sdk)** — glasses
  rendering, microphone capture, input events, local storage.
- **Vue 3 (Options API)** + **SCSS** (themed with CSS custom properties) — the phone webview UI.
- **[rusty-chromaprint-wasm](https://www.npmjs.com/package/rusty-chromaprint-wasm)** —
  AcoustID/fpcalc-compatible fingerprints in the browser.
- **[@evenrealities/pretext](https://www.npmjs.com/package/@evenrealities/pretext)** — pixel-accurate
  text measurement for glasses layout.
- **Vite** + **TypeScript**, packaged with the **Even Hub CLI**.

---

## Getting started

**Prerequisites:** Node 20+, [Yarn](https://classic.yarnpkg.com/) (classic), and a free AcoustID
application key from [acoustid.org/new-application](https://acoustid.org/new-application).

```bash
yarn install
cp .env.example .env          # optional: set VITE_ACOUSTID_KEY for a dev default
yarn dev                      # Vite dev server → http://localhost:5173
```

The AcoustID key can also be entered at runtime in the app's **Settings** screen — it's stored
on-device and never committed.

### Run in the desktop simulator

With the dev server running on port 5173:

```bash
yarn simulate                 # opens the G2 simulator against http://localhost:5173
```

The simulator renders the 576×288 glasses display and exposes an automation API on port 9898
(`/api/input`, `/api/screenshot/glasses`, `/api/console`). Note: it can't inject real microphone
audio, so end-to-end identification is only testable on hardware.

### Run on real glasses

Make sure your computer and glasses are on the same Wi-Fi network, then:

```bash
yarn qr                       # prints a QR code to sideload the app
```

The dev-server URL is configured in the `qr` script in `package.json` — update the IP there to
match your machine.

### Build & package

```bash
yarn build                    # type-check + production bundle → dist/
yarn package                  # build, then pack into muse.ehpk for submission
```

---

## How it works

1. A tap (glasses touchpad or the phone button) starts a fixed listening window.
2. `bridge.audioControl` streams 16-bit PCM chunks, buffered into an `Int16Array`.
3. The samples are fingerprinted with Chromaprint (WASM) → compressed base64.
4. The fingerprint + duration are looked up against AcoustID; the best match is enriched with the
   MusicBrainz year and a Cover Art Archive image.
5. The result is shown on both the phone UI and the glasses, and saved to history.

The phone view and the glasses screen are driven by a small state machine in `src/App.vue`.

```
src/
  App.vue              # orchestrator: pipeline + phone view + glasses nav state machine
  views/               # phone screens: Identify / History / Settings
  components/           # ResultCard, StatusIndicator
  lib/
    audio/             # mic capture + Chromaprint fingerprinting
    api/               # AcoustID + MusicBrainz clients
    glasses/           # screen router, image (PNG→gray) + waveform rendering
    storage/           # settings + history (Even Hub local storage)
  styles/              # theme.scss (CSS variables) + global.scss
```

---

## Notes & limitations

- **Ambient accuracy** is inherently limited by the free Chromaprint/AcoustID stack (see above).
- **BLE image cadence:** the glasses draw images over Bluetooth at ~0.5–2s per frame, so the
  listening waveform animates slowly on real hardware and album art takes a moment to appear.
- Album art / year are best-effort — the app degrades gracefully when they're missing.
