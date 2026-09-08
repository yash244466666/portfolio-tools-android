import type { GifWorkerRequest, GifWorkerResponse } from "./gif-conversion"

/**
 * Client half of the Video to GIF Worker pipeline, following the Regex
 * Tester's terminable-worker pattern: the conversion is driven frame by frame
 * from the main thread, the Worker posts progress and the finished bytes, and
 * cancel/dispose terminate the Worker outright so a wedged or oversized
 * conversion can never outlive the tool. Tests inject a fake with the same
 * shape.
 */

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
  /** Hands one decoded frame to the Worker; the bitmap is transferred. */
  addFrame(bitmap: ImageBitmap): void
  /** Signals that the last frame has been handed over. */
  finish(): void
  /** Cancels the in-flight conversion and terminates the Worker. */
  cancel(): void
  /** Cancels and permanently stops the conversion pipeline. */
  dispose(): void
}

export function createGifConversion(
  options: { workerFactory?: GifWorkerFactory } = {},
): GifConversion {
  const workerFactory = options.workerFactory ?? createDefaultWorker
  let worker: GifWorkerLike | null = null
  let disposed = false

  function terminateWorker(): void {
    worker?.terminate()
    worker = null
  }

  function ensureWorker(): GifWorkerLike | null {
    if (worker) return worker
    const created = workerFactory()
    if (!created) return null
    worker = created
    return created
  }

  function handleResponse(data: unknown, handlers: GifConversionHandlers): void {
    const response = data as Partial<GifWorkerResponse> | null
    if (!response || typeof response.type !== "string") return
    if (response.type === "progress") {
      handlers.onProgress?.(response.framesDone ?? 0, response.frameCount ?? 0)
      return
    }
    if (response.type === "encoding") {
      handlers.onEncoding?.()
      return
    }
    if (response.type === "complete") {
      handlers.onComplete?.({
        bytes: new Uint8Array(response.bytes ?? new ArrayBuffer(0)),
        width: response.width ?? 0,
        height: response.height ?? 0,
        frameCount: response.frameCount ?? 0,
      })
      return
    }
    if (response.type === "failed") {
      handlers.onFailure?.(response.code ?? "encoder-failure", response.message ?? "")
    }
  }

  return {
    start(startRequest, handlers) {
      if (disposed) return false
      terminateWorker()
      const activeWorker = ensureWorker()
      if (!activeWorker) return false
      activeWorker.onmessage = (event: { data: unknown }) => {
        handleResponse(event.data, handlers)
      }
      activeWorker.onerror = () => {
        handlers.onFailure?.("encoder-failure", "The GIF conversion Worker failed on this device.")
        terminateWorker()
      }
      activeWorker.postMessage({ type: "start", ...startRequest })
      return true
    },
    addFrame(bitmap) {
      const activeWorker = worker
      if (!activeWorker) {
        bitmap.close()
        return
      }
      activeWorker.postMessage({ type: "frame", bitmap }, [bitmap])
    },
    finish() {
      worker?.postMessage({ type: "finish" })
    },
    cancel() {
      worker?.postMessage({ type: "cancel" })
      terminateWorker()
    },
    dispose() {
      disposed = true
      terminateWorker()
    },
  }
}
