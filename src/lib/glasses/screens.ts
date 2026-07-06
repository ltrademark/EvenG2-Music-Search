import {
  CreateStartUpPageContainer,
  ImageContainerProperty,
  ListContainerProperty,
  ListItemContainerProperty,
  RebuildPageContainer,
  StartUpPageCreateResult,
  TextContainerProperty,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk'
import { getTextWidth, pxTruncate } from '@evenrealities/pretext'
import { getBridge } from '../bridge'
import { loadImagePng, placeholderPng, pushImage } from './image'
import * as wave from './wave-text'
import type { TrackMatch } from '../types'

const CANVAS_W = 576
const CANVAS_H = 288
const LINE_H = 27
const PAD = 8

// ---- Page commit -----------------------------------------------------------

interface PageSpec {
  text?: TextContainerProperty[]
  images?: ImageContainerProperty[]
  list?: ListContainerProperty[]
}

let created = false

/** Commit a page: create once at startup, rebuild thereafter. */
async function commit(spec: PageSpec): Promise<void> {
  const bridge = await getBridge()
  const total =
    (spec.text?.length ?? 0) + (spec.images?.length ?? 0) + (spec.list?.length ?? 0)

  if (!created) {
    const result = await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: total,
        textObject: spec.text,
        imageObject: spec.images,
        listObject: spec.list,
      }),
    )
    if (result !== StartUpPageCreateResult.success) {
      throw new Error(`Failed to create glasses page (code ${result}).`)
    }
    created = true
  } else {
    await bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: total,
        textObject: spec.text,
        imageObject: spec.images,
        listObject: spec.list,
      }),
    )
  }
}

// ---- Text container helpers -------------------------------------------------

interface TextOpts {
  x: number
  y: number
  w: number
  h?: number
  content: string
  capture?: boolean
  border?: number
  radius?: number
}

let nextId = 1
const textC = (name: string, o: TextOpts) =>
  new TextContainerProperty({
    xPosition: o.x,
    yPosition: o.y,
    width: o.w,
    height: o.h ?? LINE_H,
    borderWidth: o.border ?? 0,
    borderColor: 12,
    borderRadius: o.radius ?? 0,
    paddingLength: o.border ? 6 : 0,
    containerID: nextId++,
    containerName: name,
    content: o.content,
    isEventCapture: o.capture ? 1 : 0,
  })

/** A horizontally-centered single line of text. */
const centered = (name: string, content: string, y: number, capture = false) => {
  const w = Math.ceil(getTextWidth(content)) + 8
  return textC(name, { x: Math.max(0, Math.round((CANVAS_W - w) / 2)), y, w, content, capture })
}

/** Bottom-left hint, e.g. "●● Go Back" / "●● Cancel". */
const bottomLeft = (name: string, content: string, capture = false) =>
  textC(name, { x: PAD, y: CANVAS_H - LINE_H - 4, w: 320, content, capture })

// ---- Track formatting -------------------------------------------------------

const albumLine = (m: TrackMatch): string =>
  m.album ? `${m.album}${m.year ? ` (${m.year})` : ''}` : m.year ? `(${m.year})` : ''

/**
 * Title (caps) / artist / album(year) as up-to-3 lines, each truncated to the
 * container's inner pixel width so a long value can't overflow or wrap.
 */
const trackLines = (m: TrackMatch, maxPx: number): string =>
  [m.title.toUpperCase(), m.artist, albumLine(m)]
    .filter(Boolean)
    .map((line) => pxTruncate(line, maxPx))
    .join('\n')

/**
 * One-line history row: "■ TITLE • Artist • Album (year)". The ■ prefix is a
 * list-only art marker — it is NOT part of the stored track, so it never
 * appears in the single-entry detail view.
 */
const historyRow = (m: TrackMatch, innerW: number): string => {
  const parts = [m.title.toUpperCase(), m.artist, albumLine(m)].filter(Boolean)
  // Trim to fit the row width, then hard-cap at 63 *bytes* (SDK list limit).
  return byteTruncate(pxTruncate(`■ ${parts.join('  •  ')}`, innerW), 63)
}

/** Truncate to at most maxBytes of UTF-8 without splitting a character. */
const byteTruncate = (s: string, maxBytes: number): string => {
  const enc = new TextEncoder()
  if (enc.encode(s).length <= maxBytes) return s
  let out = ''
  let bytes = 0
  for (const ch of s) {
    const b = enc.encode(ch).length
    if (bytes + b > maxBytes) break
    out += ch
    bytes += b
  }
  return out
}

const formatDate = (ms?: number): string => {
  if (!ms) return '—'
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getFullYear()}`
}

// ---- Screens ----------------------------------------------------------------

/** #1 Splash. First page → createStartUpPageContainer. */
export async function showSplash(): Promise<void> {
  nextId = 1
  const iconW = 96
  const icon = new ImageContainerProperty({
    xPosition: Math.round((CANVAS_W - iconW) / 2),
    yPosition: 44,
    width: iconW,
    height: iconW,
    containerID: 100,
    containerName: 'icon',
  })
  await commit({
    text: [
      centered('title', 'Music Search', 160, true),
      centered('init', 'Initializing...', 250),
    ],
    images: [icon],
  })
  const png = (await loadImagePng('/icon_large.png', iconW, iconW, { dither: false })) ??
    (await placeholderPng(iconW, iconW))
  await pushImage(100, 'icon', png)
}

/** #2 / #5 Home menu (Start Search / View History). */
export async function showMenu(): Promise<void> {
  nextId = 1
  const menu = new ListContainerProperty({
    xPosition: PAD,
    yPosition: 16,
    width: 320,
    height: 100,
    borderWidth: 0,
    paddingLength: 4,
    containerID: nextId++,
    containerName: 'menu',
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: 2,
      itemWidth: 0,
      isItemSelectBorderEn: 1,
      itemName: ['Start Search', 'View History'],
    }),
  })
  await commit({ list: [menu] })
}

/** #3 Listening — status + animated text wave + cancel hint. */
export async function showListening(): Promise<void> {
  nextId = 1
  const status = '▶ Listening'
  // The wave is a sibling text container sitting inline right after the status
  // text — same baseline, so no vertical-centering math needed. It starts at
  // rest (all-middle) and animates in place via textContainerUpgrade.
  const GAP = 10
  const waveX = PAD + Math.ceil(getTextWidth(status)) + GAP
  const statusId = nextId // 1 — the capture container updated by setListeningStatus
  const statusC = textC('status', { x: PAD, y: PAD, w: waveX - PAD, content: status, capture: true })
  const waveId = nextId
  const waveC = textC('wave', { x: waveX, y: PAD, w: CANVAS_W - waveX - PAD, content: wave.REST })
  void statusId
  await commit({
    text: [statusC, waveC, bottomLeft('cancel', '●● Cancel')],
  })
  // Fire-and-forget the animation loop; stopped when leaving this screen.
  void wave.start(waveId, 'wave')
}

/** Update the listening status line in place (e.g. "Searching..."). */
export async function setListeningStatus(content: string): Promise<void> {
  const bridge = await getBridge()
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({ containerID: 1, containerName: 'status', content }),
  )
}

/** Stop the listening wave animation. */
export const stopWave = () => wave.stop()

/** #4 Result — album art + track info + Go Back / Rerun. */
export async function showResult(match: TrackMatch): Promise<void> {
  nextId = 1
  const artSize = 130
  const art = new ImageContainerProperty({
    xPosition: PAD,
    yPosition: PAD,
    width: artSize,
    height: artSize,
    containerID: 100,
    containerName: 'art',
  })
  const rerun = 'Rerun ●'
  const infoW = CANVAS_W - 2 * PAD
  await commit({
    text: [
      textC('info', { x: PAD, y: 146, w: infoW, h: 110, content: trackLines(match, infoW), capture: true }),
      bottomLeft('goback', '●● Go Back'),
      textC('rerun', {
        x: CANVAS_W - Math.ceil(getTextWidth(rerun)) - PAD,
        y: CANVAS_H - LINE_H - 4,
        w: Math.ceil(getTextWidth(rerun)) + 8,
        content: rerun,
      }),
    ],
    images: [art],
  })
  await renderArt(match, 100, 'art', artSize)
}

/** #4 (no result / error) — simple retry prompt. */
export async function showNoMatch(message = 'no results found.'): Promise<void> {
  nextId = 1
  await commit({
    text: [
      textC('msg', {
        x: PAD,
        y: 110,
        w: CANVAS_W - 2 * PAD,
        h: 60,
        content: `${message}\nTap once to try again`,
        capture: true,
      }),
    ],
  })
}

/** #6 History list. */
const LIST_ITEM_H = 40 // fixed per firmware
const LIST_MAX_VISIBLE = 6 // rows that fit above the Go Back hint

export async function showHistoryList(items: TrackMatch[]): Promise<void> {
  nextId = 1
  const innerW = CANVAS_W - 2 * PAD - 24
  const rows = items.slice(0, 20)
  // Size the container to the visible rows so the firmware doesn't
  // vertically-center an underfilled list — this keeps rows pinned to the top.
  const visible = Math.min(rows.length, LIST_MAX_VISIBLE)
  const list = new ListContainerProperty({
    xPosition: PAD,
    yPosition: PAD,
    width: CANVAS_W - 2 * PAD,
    height: visible * LIST_ITEM_H,
    borderWidth: 0,
    paddingLength: 0,
    containerID: nextId++,
    containerName: 'history',
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: rows.length,
      itemWidth: 0,
      isItemSelectBorderEn: 1,
      itemName: rows.map((m) => historyRow(m, innerW)),
    }),
  })
  await commit({ list: [list], text: [bottomLeft('goback', '●● Go Back')] })
}

/** #6 (empty) History with no entries. */
export async function showHistoryEmpty(): Promise<void> {
  nextId = 1
  await commit({
    text: [
      textC('msg', { x: PAD, y: 24, w: CANVAS_W - 2 * PAD, h: 60, content: 'History\n\nNo songs yet', capture: true }),
      bottomLeft('goback', '●● Go Back'),
    ],
  })
}

/** #7 History detail — boxed art + info, date, Go Back. */
export async function showHistoryDetail(match: TrackMatch): Promise<void> {
  nextId = 1
  const artSize = 130
  const box = textC('box', { x: 4, y: 4, w: CANVAS_W - 8, h: 190, content: '', border: 1, radius: 6 })
  const infoW = CANVAS_W - 170 - 20
  const info = textC('info', { x: 170, y: 24, w: infoW, h: 120, content: trackLines(match, infoW), capture: true })
  const date = textC('date', { x: PAD, y: 205, w: CANVAS_W - 2 * PAD, content: `Identified on [ ${formatDate(match.identifiedAt)} ]` })
  const art = new ImageContainerProperty({
    xPosition: 20,
    yPosition: 24,
    width: artSize,
    height: artSize,
    containerID: 100,
    containerName: 'art',
  })
  await commit({ text: [box, info, date, bottomLeft('goback', '●● Go Back')], images: [art] })
  await renderArt(match, 100, 'art', artSize)
}

// ---- Album art helper -------------------------------------------------------

async function renderArt(
  match: TrackMatch,
  containerID: number,
  name: string,
  size: number,
): Promise<void> {
  const png = match.coverArtUrl ? await loadImagePng(match.coverArtUrl, size, size) : null
  await pushImage(containerID, name, png ?? (await placeholderPng(size, size)))
}
