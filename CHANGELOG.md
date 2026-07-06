# Changelog

A running log of notable changes, newest first. The latest entry's highlights
are mirrored (in friendlier wording) in the in-app **What's New** modal via
`src/changelog.ts`.

## v0.2.0

### Phone app
- Redesigned around the glasses: **History is now the home screen**; the phone
  no longer has a listen button (identification is triggered from the glasses).
- History rows are **collapsible** — tap one to reveal album art, album (year),
  quick links, and the date it was identified.
- **Service links** per song: Spotify, Apple Music, SoundCloud, and a web
  search, generated from the title + artist (search URLs, no extra APIs).
- **Export / Import** your history as a JSON file, and **Clear all**.
- Album art is now **cached as base64** with each entry, so history renders
  offline and travels with an export.
- Redesigned **Settings**: listening duration, **G2 / Phone** mic, and a new
  **Auto-Listen on Open** toggle.
- Added a **What's New** modal (tap the version) with a hidden Debug panel,
  unlocked by tapping the app icon 10×.

### Glasses
- Listening waveform is now drawn as animated text (block-bar equalizer).
- Splash logo renders at its native 72×72.

### Under the hood
- Centralized the app version: bump `package.json`; `app.json` and the UI sync
  automatically (`scripts/sync-version.mjs` + a Vite `__APP_VERSION__` define).

## v0.1.0

- Initial release: ambient music identification for the Even Realities G2 via a
  keyless recognition engine and a free Cloudflare Worker relay. Glasses UI
  (splash, menu, listening, result, history) plus a phone webview.
