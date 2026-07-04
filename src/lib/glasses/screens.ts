import {
  CreateStartUpPageContainer,
  StartUpPageCreateResult,
  TextContainerProperty,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk'
import { getBridge } from '../bridge'
import type { TrackMatch } from '../types'

// The G2 canvas. We use a single full-screen text container that both renders
// content and captures input events, and update it in place (flicker-free).
const CANVAS_WIDTH = 576
const CANVAS_HEIGHT = 288
const MAIN_ID = 1
const MAIN_NAME = 'main'

let created = false

/** Create the start-up page once. Must run before `audioControl`. */
export async function initGlasses(initialContent: string): Promise<void> {
  if (created) return
  const bridge = await getBridge()

  const main = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 8,
    containerID: MAIN_ID,
    containerName: MAIN_NAME,
    content: initialContent,
    isEventCapture: 1,
  })

  const result = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [main] }),
  )
  if (result !== StartUpPageCreateResult.success) {
    throw new Error(`Failed to create glasses page (code ${result}).`)
  }
  created = true
}

/** Update the glasses text in place. */
export async function setGlassesText(content: string): Promise<void> {
  const bridge = await getBridge()
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: MAIN_ID,
      containerName: MAIN_NAME,
      content: content.slice(0, 2000),
    }),
  )
}

// ---- Per-phase glasses copy -------------------------------------------------

export const glassesIdle = () => 'Music ID\n\nTap to identify\nthe music playing'

export const glassesListening = (remainingSec: number) =>
  `Listening...\n\n${'●'.repeat(Math.max(0, Math.min(10, Math.ceil(remainingSec))))}\n${Math.ceil(
    remainingSec,
  )}s`

export const glassesIdentifying = () => 'Identifying...'

export const glassesResult = (m: TrackMatch) =>
  [m.title, m.artist, m.album ?? '', '', 'Tap to identify again'].filter(Boolean).join('\n')

export const glassesNoMatch = () => 'No match found\n\nTap to try again'

export const glassesError = (message: string) => `Error\n\n${message}\n\nTap to try again`

export const glassesHistory = (history: TrackMatch[]) =>
  history.length === 0
    ? 'History\n\nNo songs yet'
    : 'History\n\n' + history.map((m, i) => `${i + 1}. ${m.title} - ${m.artist}`).join('\n')
