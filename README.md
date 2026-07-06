<!-- Add a hero banner image here -->

<div align="center">
  <img src="public/icon_large.png" width="144" height="144" alt="MuSe" />
  <h1>MuSe</h1>
  <p>Ambient music identification for Even Realities G2 smart glasses. MuSe listens to whatever is playing around you, identifies the song, and shows its cover art, title, artist, and album right on the glasses. Every match is saved to a history you can revisit and act on from your phone, and it all runs at no cost with no account or API key.</p>
</div>

---

## Glasses display

- **Listening indicator** with an animated waveform while it captures a few seconds of audio
- **Result screen** with album art, title, artist, and album (year)
- **Menu** with Start Search and View History, navigated by touchpad (scroll to move, tap to select, double-tap to go back)
- **History browser** of past finds; tap any entry for its detail view
- Optional **auto-listen on open** so it starts identifying the moment you launch it
- Remembers your history between launches

|    |    |
| -- | -- |
|    |    |

## Phone app

- **History home screen**: every song you have found, newest first
- Tap an entry to expand its album art, album (year), the date, and quick links
- **Quick links** to Spotify, Apple Music, SoundCloud, and a web search
- **Export, import, or clear** your history
- **Settings** for listening duration, microphone (G2 or phone), and auto-listen on open
- A **What's New** modal behind the version number

|    |    |    |
| -- | -- | -- |
|    |    |    |

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Yarn](https://yarnpkg.com) 1.x
- [Even Hub](https://evenrealities.com) installed on your phone and paired with your G2 glasses
- No API key or account is needed

## Setup

```bash
git clone https://github.com/ltrademark/EvenG2-Music-Search
cd EvenG2-Music-Search
yarn install
```

> Recognition runs through a free Cloudflare Worker relay whose URL is baked into the app, so there is no `.env` to configure. The relay forwards to an unofficial third-party recognition endpoint; it is not an official API and could change. See [`proxy/`](proxy/) to deploy your own.

## Running

Start the dev server and simulator in two terminals:

```bash
# Terminal 1
yarn dev

# Terminal 2
yarn simulate
```

The simulator renders both the phone UI and the 576x288 glasses display. It cannot inject microphone audio, so end-to-end identification is only testable on hardware; use `VITE_DEMO=1 yarn dev` to seed sample screens for layout checks.

To test on your phone and glasses, run `yarn dev --host 0.0.0.0` and load it via Even Hub's QR code (`yarn qr`; update the IP in the `qr` script to match your machine).

## Project structure

```
src/
├── App.vue              Orchestrator: recognition pipeline, phone views, glasses nav state machine
├── version.ts           App name and description (version comes from package.json)
├── changelog.ts         Latest highlights, shown in the What's New modal
├── views/
│   ├── HistoryView.vue    History list with collapsible entries and export/import
│   └── SettingsView.vue   Duration, mic, auto-listen, and the hidden Debug panel
├── components/
│   ├── HistoryEntry.vue   One collapsible history row (art, album, links, date)
│   ├── ServiceLinks.vue   Spotify / Apple Music / SoundCloud / web-search buttons
│   ├── WhatsNew.vue       App info and changelog modal
│   └── DebugPanel.vue     Pipeline-trace terminal (unlocked from the modal)
├── lib/
│   ├── audio/           Microphone capture
│   ├── api/             Recognition client and cover-art base64 caching
│   ├── glasses/         Screen router, image (PNG to gray4), waveform
│   └── storage/         Settings and history (Even Hub local storage)
└── styles/             theme.scss (CSS variables) and global.scss
scripts/                sync-version.mjs (copies package.json version into app.json on build)
proxy/                  Cloudflare Worker CORS relay
```

## Scripts

| Command | Description |
|---|---|
| `yarn dev` | Start the Vite dev server on `:5173` |
| `yarn simulate` | Launch the Even Hub simulator pointed at the dev server |
| `yarn build` | Production build to `dist/` |
| `yarn preview` | Preview the production build locally |
| `yarn qr` | Print a QR code to sideload the app onto your glasses |
| `yarn package` | Build and pack into `com.ltrademark.muse.ehpk` for submission |

## License

[CC BY-NC-SA 4.0](LICENSE) © 2026 Leo Herrera
