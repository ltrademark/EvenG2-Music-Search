// Outbound music-service links for a matched track. These are generated on the
// front-end as *search* URLs (title + artist) — no extra APIs, no per-service
// IDs to store, and they self-heal if a service changes its URL scheme. The
// hosts must be whitelisted in app.json's network permission.
import type { TrackMatch } from './types'
import spotifyIcon from '../assets/img/social_icon--spotify.svg'
import appleIcon from '../assets/img/social_icon--applemusic.svg'
import soundcloudIcon from '../assets/img/social_icon--soundcloud.svg'
import websearchIcon from '../assets/img/social_icon--websearch.svg'

export interface ServiceLink {
  key: string
  label: string
  href: string
  icon: string
  /** 'open' navigates to href; 'copy' copies href to the clipboard instead
   *  (Spotify's link won't open from the Even Hub webview). */
  mode: 'open' | 'copy'
}

export function serviceLinks(match: TrackMatch): ServiceLink[] {
  const q = encodeURIComponent(`${match.title} ${match.artist}`.trim())
  return [
    { key: 'spotify', label: 'Copy Spotify search link', icon: spotifyIcon, mode: 'copy', href: `https://open.spotify.com/search/${q}` },
    { key: 'apple', label: 'Search on Apple Music', icon: appleIcon, mode: 'open', href: `https://music.apple.com/search?term=${q}` },
    { key: 'soundcloud', label: 'Search on SoundCloud', icon: soundcloudIcon, mode: 'open', href: `https://soundcloud.com/search?q=${q}` },
    { key: 'web', label: 'Search the web', icon: websearchIcon, mode: 'open', href: `https://www.google.com/search?q=${q}` },
  ]
}
