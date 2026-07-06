// App identity strings, shown in the What's New modal and (optionally) the
// glasses splash. The VERSION itself is NOT here — it comes from package.json,
// inlined at build time as `__APP_VERSION__` (see vite.config.ts) and synced
// into app.json by scripts/sync-version.mjs. Bump the version in ONE place:
// package.json.
export const APP_NAME = 'Music Search'
export const APP_DESCRIPTION = 'Ambient music identification for the EvenRealities G2'
