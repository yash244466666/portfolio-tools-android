import type { GifWorkerRequest, GifWorkerResponse } from "./gif-conversion"

/**
 * Client half of the Video to GIF Worker pipeline, following the Regex
 * Tester's terminable-worker pattern: the conversion is driven frame by frame
 * from the main thread, the Worker posts progress and the finished bytes, and
 * cancel/dispose terminate the Worker outright so a wedged or oversized
 * conversion can never outlive the tool.
 *
 * Backpressure: the Worker acknowledges every encoded frame through its
 * progress message, and the client keeps at most {@link
 * maximumInFlightFrames} frames in flight, queueing decoded bitmaps so a fast
 * producer cannot accumulate an unbounded Worker-side queue. Terminal
 * responses (complete/failed), Worker crashes, and an inactivity deadline all
 * settle the run exactly once, drain the queue (closing bitmaps), and
 * terminate the Worker.
 */

/** Wall clock without a Worker response after which the run is declared wedged. */
export const workerInactivityTimeoutMs = 30_000

/** Decoded frames allowed in flight to the Worker at once. */
export const maximumInFlightFrames = 2

/** Minimal Worker surface the client needs; tests inject a fake. */
export interface GifWorkerLike {
  postMessage(message: GifWorkerRequest, transfer?: Transferable[]): void
  terminate(): void
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
}

export type GifWorkerFactory = () => GifWorkerLike | null

function createDefaultWorker(): GifWorkerLike | null {
  if (typeof Worker === "undefined") return null
  try {
    // Classic Worker (no module type) so the oldest supported packaged
    // WebViews can run it.
    return new Worker(new URL("./gif-worker.ts", import.meta.url)) as GifWorkerLike
  } catch {
    return null
  }
}

export interface GifConversionStart {
  width: number
  height: number
  frameCount: number
  frameIntervalMs: number
  maximumOutputBytes: number
}

export interface GifConversionResult {
  bytes: Uint8Array<ArrayBuffer>
  width: number
  height: number
  frameCount: number
}

export interface GifConversionHandlers {
  onProgress?: (framesDone: number, frameCount: number) => void
  onEncoding?: () => void
  onComplete?: (result: GifConversionResult) => void
  onFailure?: (code: "encoder-failure" | "over-limit-output", message: string) => void
}

export interface GifConversion {
  /** Starts a conversion; false when no Worker stack exists on this device. */
  start(startRequest: GifConversionStart, handlers: GifConversionHandlers): boolean
  /**
   * Hands one decoded frame to the pipeline. The bitmap is transferred once
   * an in-flight slot opens; it is closed and dropped when no run is active.
   */
  addFrame(bitmap: ImageBitmap): void
  /** Signals that the last frame has been handed over. */
  finish(): void
  /** Cancels the in-flight conversion and terminates the Worker. */
  cancel(): void
  /** Cancels and permanently stops the conversion pipeline. */
  dispose(): void
}

interface ActiveRun {
  handlers: GifConversionHandlers
  queued: ImageBitmap[]
  inFlight: number
  finishing: boolean
  finishSent: boolean
}

export function createGifConversion(
  options: { workerFactory?: GifWorkerFactory; inactivityTimeoutMs?: number } = {},
): GifConversion {
  const workerFactory = options.workerFactory ?? createDefaultWorker
  const inactivityTimeoutMs = options.inactivityTimeoutMs ?? workerInactivityTimeoutMs
  let worker: GifWorkerLike | null = null
  let disposed = false
  let active: ActiveRun | null = null
  let settled = true
  let inactivityTimer: number | null = null

  function terminateWorker(): void {
    worker?.terminate()
    worker = null
  }

  function stopInactivityTimer(): void {
    if (inactivityTimer !== null) {
      window.clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
  }

  function armInactivityTimer(): void {
    stopInactivityTimer()
    inactivityTimer = window.setTimeout(() => {
      // The Worker stopped responding: surface a typed failure instead of a
      // frozen progress bar.
      settle({
        type: "failed",
        code: "encoder-failure",
        message: "The GIF conversion Worker stopped responding.",
      })
    }, inactivityTimeoutMs)
  }

  function closeQueued(): void {
    if (!active) return
    for (const bitmap of active.queued) bitmap.close()
    active = null
  }

  /** Settles the active run exactly once and tears the Worker down. */
  function settle(
    response:
      | Extract<GifWorkerResponse, { type: "failed" }>
      | Extract<GifWorkerResponse, { type: "complete" }>,
  ): void {
    if (settled) return
    settled = true
    stopInactivityTimer()
    const handlers = active?.handlers
    closeQueued()
    terminateWorker()
    if (!handlers) return
    if (response.type === "complete") {
      const complete = response
      handlers.onComplete?.({
        bytes: new Uint8Array(complete.bytes ?? new ArrayBuffer(0)),
        width: complete.width ?? 0,
        height: complete.height ?? 0,
        frameCount: complete.frameCount ?? 0,
      })
      return
    }
    const failure = response
    handlers.onFailure?.(failure.code ?? "encoder-failure", failure.message ?? "")
  }

  function pump(): void {
    const run = active
    const activeWorker = worker
    if (!run || !activeWorker) return
    while (run.inFlight < maximumInFlightFrames && run.queued.length > 0) {
      const bitmap = run.queued.shift()
      if (!bitmap) break
      run.inFlight += 1
      activeWorker.postMessage({ type: "frame", bitmap }, [bitmap])
    }
    if (run.finishing && run.queued.length === 0 && !run.finishSent) {
      run.finishSent = true
      activeWorker.postMessage({ type: "finish" })
    }
  }

  function handleResponse(data: unknown): void {
    if (settled || !active) return
    armInactivityTimer()
    const response = data as Partial<GifWorkerResponse> | null
    if (!response || typeof response.type !== "string") return
    if (response.type === "progress") {
      active.inFlight = Math.max(0, active.inFlight - 1)
      active.handlers.onProgress?.(response.framesDone ?? 0, response.frameCount ?? 0)
      pump()
      return
    }
    if (response.type === "encoding") {
      active.handlers.onEncoding?.()
      return
    }
    if (response.type === "complete") {
      settle(response as Extract<GifWorkerResponse, { type: "complete" }>)
      return
    }
    if (response.type === "failed") {
      settle(response as Extract<GifWorkerResponse, { type: "failed" }>)
    }
  }

  function cancelRun(): void {
    if (active) closeQueued()
    settled = true
    stopInactivityTimer()
    worker?.postMessage({ type: "cancel" })
    terminateWorker()
  }

  return {
    start(startRequest, handlers) {
      if (disposed) return false
      // Any previous run is abandoned: its Worker cannot be reused, and its
      // stale responses must never reach the new run's handlers.
      if (active) closeQueued()
      terminateWorker()
      const created = workerFactory()
      if (!created) return false
      worker = created
      active = { handlers, queued: [], inFlight: 0, finishing: false, finishSent: false }
      settled = false
      created.onmessage = (event: { data: unknown }) => {
        handleResponse(event.data)
      }
      created.onerror = () => {
        settle({
          type: "failed",
          code: "encoder-failure",
          message: "The GIF conversion Worker failed on this device.",
        })
      }
      armInactivityTimer()
      created.postMessage({ type: "start", ...startRequest })
      return true
    },
    addFrame(bitmap) {
      const run = active
      if (settled || !run || !worker || run.finishSent) {
        bitmap.close()
        return
      }
      run.queued.push(bitmap)
      pump()
    },
    finish() {
      if (active) {
        active.finishing = true
        pump()
      }
    },
    cancel() {
      cancelRun()
    },
    dispose() {
      disposed = true
      cancelRun()
    },
  }
}
