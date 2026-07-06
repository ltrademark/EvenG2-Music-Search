// Single source of truth for the app version = package.json. This runs on
// `prebuild` (yarn classic runs it before `build`) and copies that version into
// app.json, so a version bump is a one-line edit to package.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const appPath = join(root, 'app.json')
const app = JSON.parse(readFileSync(appPath, 'utf8'))

if (app.version !== pkg.version) {
  app.version = pkg.version
  writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n')
  console.log(`[sync-version] app.json → ${pkg.version}`)
} else {
  console.log(`[sync-version] app.json already at ${pkg.version}`)
}
