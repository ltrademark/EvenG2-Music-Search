// Shared domain types for the Music ID app.

/** Identification pipeline state, mirrored on both the phone UI and glasses. */
export type AppPhase = 'idle' | 'listening' | 'identifying' | 'result' | 'nomatch' | 'error'

/** Which phone-side screen is showing. */
export type PhoneView = 'identify' | 'history' | 'settings'

/** Which screen the glasses are showing (independent of the phone view). */
export type GlassesScreen =
  | 'splash'
  | 'menu'
  | 'listening'
  | 'result'
  | 'nomatch'
  | 'historyList'
  | 'historyEmpty'
  | 'historyDetail'

/** A single identified track (normalized from AcoustID's response). */
export interface TrackMatch {
  /** AcoustID track id (stable across recordings). */
  acoustId: string
  /** MusicBrainz recording id, when available. */
  recordingId?: string
  /** MusicBrainz release-group id — used for the year and cover art. */
  releaseGroupId?: string
  title: string
  artist: string
  album?: string
  /** 4-digit release year, enriched from MusicBrainz when available. */
  year?: string
  /** Cover Art Archive URL (front-250) derived from the release group. */
  coverArtUrl?: string
  /** AcoustID match confidence, 0..1. */
  score: number
  /** Epoch millis when this match was recorded (stamped by the caller). */
  identifiedAt?: number
}

/** Captured audio ready for fingerprinting. */
export interface CapturedAudio {
  /** Interleaved 16-bit PCM samples (mono → single channel). */
  samples: Int16Array
  /** Source sample rate in Hz (G2 mic = 16000). */
  sampleRate: number
  /** Channel count (G2 mic = 1). */
  channels: number
  /** Capture length in seconds. */
  durationSec: number
}
