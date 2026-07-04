import { waitForEvenAppBridge, type EvenAppBridge } from '@evenrealities/even_hub_sdk'

// Single shared bridge instance. `waitForEvenAppBridge` already returns the
// SDK singleton, but we memoize the promise so every module awaits the same
// initialization instead of racing separate calls.
let bridgePromise: Promise<EvenAppBridge> | null = null

export function getBridge(): Promise<EvenAppBridge> {
  if (!bridgePromise) {
    bridgePromise = waitForEvenAppBridge()
  }
  return bridgePromise
}
