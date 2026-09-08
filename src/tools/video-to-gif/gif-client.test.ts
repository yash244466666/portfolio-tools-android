import { describe, expect, it, vi } from "vitest"
import { createGifConversion, type GifWorkerLike } from "./gif-client"
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

describe("createGifConversion", () => {
  it("reports unsupported when no Worker stack exists", () => {
    const conversion = createGifConversion({ workerFactory: () => null })
    expect(conversion.start(startRequest, {})).toBe(false)
  })

  it("posts start, frames with transfer, and finish to the Worker", () => {
    const worker = new FakeWorker()
    const conversion = createGifConversion({ workerFactory: () => worker })
    const onProgress = vi.fn()
    expect(conversion.start(startRequest, { onProgress })).toBe(true)

    const bitmap = makeBitmap()
    conversion.addFrame(bitmap)
    conversion.finish()

    expect(worker.posted).toHaveLength(3)
    expect(worker.posted[0]?.message).toEqual({ type: "start", ...startRequest })
    expect(worker.posted[1]?.message).toEqual({ type: "frame", bitmap })
    expect(worker.posted[1]?.transfer).toEqual([bitmap])
    expect(worker.posted[2]?.message).toEqual({ type: "finish" })
  })

  it("routes progress, encoding, completion, and failure responses", () => {
    const worker = new FakeWorker()
    const conversion = createGifConversion({ workerFactory: () => worker })
    const onProgress = vi.fn()
    const onEncoding = vi.fn()
    const onComplete = vi.fn()
    const onFailure = vi.fn()
    conversion.start(startRequest, { onProgress, onEncoding, onComplete, onFailure })

    worker.respond({ type: "progress", framesDone: 1, frameCount: 3 })
    worker.respond({ type: "encoding" })
    const buffer = new Uint8Array([1, 2, 3]).buffer
    worker.respond({ type: "complete", bytes: buffer, width: 4, height: 4, frameCount: 3 })
    worker.respond({ type: "failed", code: "over-limit-output", message: "too large" })

    expect(onProgress).toHaveBeenCalledWith(1, 3)
    expect(onEncoding).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith({
      bytes: new Uint8Array([1, 2, 3]),
      width: 4,
      height: 4,
      frameCount: 3,
    })
    expect(onFailure).toHaveBeenCalledWith("over-limit-output", "too large")
  })

  it("reports a Worker crash as an encoder failure and terminates", () => {
    const worker = new FakeWorker()
    const conversion = createGifConversion({ workerFactory: () => worker })
    const onFailure = vi.fn()
    conversion.start(startRequest, { onFailure })

    worker.fail()
    expect(onFailure).toHaveBeenCalledWith(
      "encoder-failure",
      "The GIF conversion Worker failed on this device.",
    )
    expect(worker.terminated).toBe(true)
  })

  it("cancel posts the cancel message and terminates the Worker", () => {
    const worker = new FakeWorker()
    const conversion = createGifConversion({ workerFactory: () => worker })
    conversion.start(startRequest, {})

    const bitmap = makeBitmap()
    conversion.cancel()
    conversion.addFrame(bitmap)

    expect(worker.terminated).toBe(true)
    // A frame after cancellation is dropped and its bitmap closed.
    expect(worker.posted).toHaveLength(2)
    expect(worker.posted[1]?.message).toEqual({ type: "cancel" })
  })

  it("dispose permanently stops the pipeline", () => {
    const worker = new FakeWorker()
    const conversion = createGifConversion({ workerFactory: () => worker })
    conversion.start(startRequest, {})
    conversion.dispose()

    expect(worker.terminated).toBe(true)
    expect(conversion.start(startRequest, {})).toBe(false)
  })
})
