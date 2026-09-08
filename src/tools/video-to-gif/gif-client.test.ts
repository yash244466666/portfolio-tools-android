import { describe, expect, it, vi } from "vitest"
import {
  createGifConversion,
  maximumInFlightFrames,
  workerInactivityTimeoutMs,
  type GifWorkerLike,
} from "./gif-client"
import type { GifWorkerRequest, GifWorkerResponse } from "./gif-conversion"

class FakeWorker implements GifWorkerLike {
  posted: Array<{ message: GifWorkerRequest; transfer: Transferable[] }> = []
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  terminated = false

  postMessage(message: GifWorkerRequest, transfer: Transferable[] = []): void {
    this.posted.push({ message, transfer })
  }

  terminate(): void {
    this.terminated = true
  }

  respond(response: GifWorkerResponse): void {
    this.onmessage?.({ data: response })
  }

  fail(): void {
    this.onerror?.(new Error("worker error"))
  }
}

const startRequest = {
  width: 4,
  height: 4,
  frameCount: 3,
  frameIntervalMs: 200,
  maximumOutputBytes: 32 * 1024 * 1024,
}

function makeBitmap(): ImageBitmap {
  return { width: 8, height: 8, close: () => undefined }
}

function makeConversion(worker: FakeWorker, inactivityTimeoutMs = workerInactivityTimeoutMs) {
  const conversion = createGifConversion({ workerFactory: () => worker, inactivityTimeoutMs })
  return conversion
}

describe("createGifConversion", () => {
  it("reports unsupported when no Worker stack exists", () => {
    const conversion = createGifConversion({ workerFactory: () => null })
    expect(conversion.start(startRequest, {})).toBe(false)
  })

  it("posts start, then frames under the in-flight window, and finish after the queue drains", () => {
    const worker = new FakeWorker()
    const conversion = makeConversion(worker)
    const onProgress = vi.fn()
    expect(conversion.start(startRequest, { onProgress })).toBe(true)

    const bitmaps = [makeBitmap(), makeBitmap(), makeBitmap(), makeBitmap()]
    for (const bitmap of bitmaps) conversion.addFrame(bitmap)
    // Backpressure: only the window size travels before any ack.
    expect(worker.posted).toHaveLength(1 + maximumInFlightFrames)
    expect(worker.posted[0]?.message).toEqual({ type: "start", ...startRequest })

    conversion.finish()
    // finish is deferred until every queued frame has been posted.
    expect(worker.posted).toHaveLength(1 + maximumInFlightFrames)

    // One progress ack per frame frees one slot and drains the queue; the
    // finish message follows the last frame as soon as the queue empties.
    worker.respond({ type: "progress", framesDone: 1, frameCount: 3 })
    worker.respond({ type: "progress", framesDone: 2, frameCount: 3 })
    expect(worker.posted).toHaveLength(1 + 4 + 1)
    expect(worker.posted.at(-1)?.message).toEqual({ type: "finish" })
    worker.respond({ type: "progress", framesDone: 3, frameCount: 3 })
    expect(worker.posted).toHaveLength(1 + 4 + 1)
    expect(onProgress).toHaveBeenCalledTimes(3)
  })

  it("routes progress, encoding, and completion responses and terminates on completion", () => {
    const worker = new FakeWorker()
    const conversion = makeConversion(worker)
    const onProgress = vi.fn()
    const onEncoding = vi.fn()
    const onComplete = vi.fn()
    const onFailure = vi.fn()
    conversion.start(startRequest, { onProgress, onEncoding, onComplete, onFailure })

    worker.respond({ type: "progress", framesDone: 1, frameCount: 3 })
    worker.respond({ type: "encoding" })
    const buffer = new Uint8Array([1, 2, 3]).buffer
    worker.respond({ type: "complete", bytes: buffer, width: 4, height: 4, frameCount: 3 })

    expect(onProgress).toHaveBeenCalledWith(1, 3)
    expect(onEncoding).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith({
      bytes: new Uint8Array([1, 2, 3]),
      width: 4,
      height: 4,
      frameCount: 3,
    })
    expect(worker.terminated).toBe(true)
  })

  it("settles exactly once: a failure after completion is ignored", () => {
    const worker = new FakeWorker()
    const conversion = makeConversion(worker)
    const onComplete = vi.fn()
    const onFailure = vi.fn()
    conversion.start(startRequest, { onComplete, onFailure })

    worker.respond({
      type: "complete",
      bytes: new ArrayBuffer(4),
      width: 4,
      height: 4,
      frameCount: 1,
    })
    worker.respond({ type: "failed", code: "encoder-failure", message: "late" })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onFailure).not.toHaveBeenCalled()
  })

  it("surfaces failures and terminates the Worker on the failed path", () => {
    const worker = new FakeWorker()
    const conversion = makeConversion(worker)
    const onFailure = vi.fn()
    conversion.start(startRequest, { onFailure })

    worker.respond({ type: "failed", code: "over-limit-output", message: "too large" })
    expect(onFailure).toHaveBeenCalledWith("over-limit-output", "too large")
    expect(worker.terminated).toBe(true)
  })

  it("reports a Worker crash as an encoder failure, closes queued bitmaps, and terminates", () => {
    const worker = new FakeWorker()
    const conversion = makeConversion(worker)
    const onFailure = vi.fn()
    const onClose = vi.fn()
    conversion.start(startRequest, { onFailure })
    // Two frames fill the in-flight window; the third stays queued locally.
    for (let index = 0; index < maximumInFlightFrames + 1; index += 1) {
      conversion.addFrame({ close: onClose } as unknown as ImageBitmap)
    }

    worker.fail()
    expect(onFailure).toHaveBeenCalledWith(
      "encoder-failure",
      "The GIF conversion Worker failed on this device.",
    )
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(worker.terminated).toBe(true)
  })

  it("declares a wedged Worker failed after the inactivity deadline", async () => {
    vi.useFakeTimers()
    try {
      const worker = new FakeWorker()
      const conversion = makeConversion(worker, 50)
      const onFailure = vi.fn()
      conversion.start(startRequest, { onFailure })

      vi.advanceTimersByTime(60)
      expect(onFailure).toHaveBeenCalledWith(
        "encoder-failure",
        "The GIF conversion Worker stopped responding.",
      )
      expect(worker.terminated).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it("cancel posts the cancel message, closes queued bitmaps, and terminates the Worker", () => {
    const worker = new FakeWorker()
    const conversion = makeConversion(worker)
    conversion.start(startRequest, {})

    const close = vi.fn()
    for (let index = 0; index < maximumInFlightFrames + 1; index += 1) {
      conversion.addFrame({ close } as unknown as ImageBitmap)
    }
    conversion.cancel()
    conversion.addFrame(makeBitmap())

    expect(worker.terminated).toBe(true)
    expect(worker.posted.at(-1)?.message).toEqual({ type: "cancel" })
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("dispose permanently stops the pipeline", () => {
    const worker = new FakeWorker()
    const conversion = makeConversion(worker)
    conversion.start(startRequest, {})
    conversion.dispose()

    expect(worker.terminated).toBe(true)
    expect(conversion.start(startRequest, {})).toBe(false)
  })
})
