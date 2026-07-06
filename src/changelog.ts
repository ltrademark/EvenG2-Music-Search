// The latest release's user-facing highlights, shown in the What's New modal.
// The full history lives in CHANGELOG.md (docs only); keep this curated summary
// in sync with the newest entry there on each bump.
export interface ChangelogEntry {
  version: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry = {
  version: '0.2.0',
  changes: [
    'Redesigned around your glasses — History is now the home screen',
    'Tap any song to expand it: album art, album, year, and quick links',
    'Open a match on Spotify, Apple Music, SoundCloud, or the web',
    'Export and import your history as a file, or clear it all at once',
    'Album art is saved with each song, so your history works offline',
    'New Settings: listening duration, G2/Phone mic, and Auto-Listen on open',
    'Smoother listening waveform on the glasses',
    'Tap the version number anytime to see what changed',
  ],
}
