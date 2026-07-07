// The latest release's user-facing highlights, shown in the What's New modal.
// The full history lives in CHANGELOG.md (docs only); keep this curated summary
// in sync with the newest entry there on each bump.
export interface ChangelogEntry {
  version: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry = {
  version: '0.2.4',
  changes: [
    'Album art now shows on your glasses, using the copy saved with each song',
    "Tidied up this What's New card so it reads more comfortably",
  ],
}
