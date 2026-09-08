/**
 * Video to GIF conversion Worker.
 *
 * Owns the CPU- and memory-heavy half of the pipeline: drawing each
 * transferred `ImageBitmap` into an `OffscreenCanvas`, reading its pixels,
 * quantizing to the fixed palette, and running the incremental GIF/LZW encode
 * under the hard output-byte cap. Nothing here touches the DOM, nothing is
 * logged, and every buffer is released as soon as its frame is encoded.
 *
 * The Worker is terminated by the client on cancel, reset, unmount, and
 * over-limit, so a wedged or oversized conversion can never outlive the tool.
 */
import { GifEncoder } from "./gif-encoder"
import type { GifWorkerRequest, GifWorkerResponse } from "./gif-conversion"

/**
 * The Worker global typed for this file's use. The app's TypeScript program
 * uses the DOM lib for every entry (the bundler emits this file as a classic
 * Worker asset), so the dedicated WebWorker lib is not referenced here.
 */
const workerContext = self as unknown as {
  postMessage(message: GifWorkerResponse, transfer?: Transferable[]): void
  onmessage: ((event: MessageEvent<GifWorkerRequest>) => void) | null
}

interface WorkerState {
  encoder: GifEncoder
  frameCount: number
  frameIntervalMs: number
  maximumOutputBytes: number
  canvas: OffscreenCanvas
  context: OffscreenCanvasRenderingContext2D
  cancelled: boolean
}

let state: WorkerState | null = null

function post(response: GifWorkerResponse, transfer?: Transferable[]): void {
  workerContext.postMessage(response, transfer ?? [])
}

function fail(message: string): void {
  state = null
  post({ type: "failed", code: "encoder-failure", message })
}

function start(request: Extract<GifWorkerRequest, { type: "start" }>): void {
  if (state) {
    post({
      type: "failed",
      code: "encoder-failure",
      message: "A conversion is already running in this Worker.",
    })
    return
  }
  try {
    const canvas = new OffscreenCanvas(request.width, request.height)
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) {
      post({
        type: "failed",
        code: "encoder-failure",
        message: "This device cannot prepare the GIF drawing surface.",
      })
      return
    }
    state = {
      encoder: new GifEncoder(request.width, request.height),
      frameCount: request.frameCount,
      frameIntervalMs: request.frameIntervalMs,
      maximumOutputBytes: request.maximumOutputBytes,
      canvas,
      context,
      cancelled: false,
    }
  } catch {
    state = null
    post({
      type: "failed",
      code: "encoder-failure",
      message: "This device cannot prepare the GIF drawing surface.",
    })
  }
}

function addFrame(bitmap: ImageBitmap): void {
  const current = state
  if (!current || current.cancelled) {
    bitmap.close()
    return
  }
  try {
    const { context } = current
    context.drawImage(bitmap, 0, 0, current.canvas.width, current.canvas.height)
    bitmap.close()
    const imageData = context.getImageData(0, 0, current.canvas.width, current.canvas.height)
    current.encoder.addFrame(imageData.data, current.frameIntervalMs)
    const framesDone = current.encoder.frameCount
    post({ type: "progress", framesDone, frameCount: current.frameCount })

    // Enforce the hard output cap per frame so an over-limit take stops at
    // the frame that crosses it instead of ballooning to completion.
    if (current.encoder.byteLength > current.maximumOutputBytes) {
      state = null
      post({
        type: "failed",
        code: "over-limit-output",
        message: "The GIF exceeded the output size limit.",
      })
    }
  } catch {
    bitmap.close()
    fail("The GIF encoding failed on this device.")
  }
}

function finish(): void {
  const current = state
  if (!current || current.cancelled) {
    state = null
    return
  }
  try {
    post({ type: "encoding" })
    const bytes = current.encoder.finish()
    const width = current.canvas.width
    const height = current.canvas.height
    const frameCount = current.encoder.frameCount
    state = null
    post(
      {
        type: "complete",
        bytes: bytes.buffer,
        width,
        height,
        frameCount,
      },
      [bytes.buffer],
    )
  } catch {
    fail("The GIF encoding failed on this device.")
  }
}

workerContext.onmessage = (event: MessageEvent<GifWorkerRequest>) => {
  const request = event.data
  if (request.type === "start") {
    start(request)
    return
  }
  if (request.type === "frame") {
    addFrame(request.bitmap)
    return
  }
  if (request.type === "finish") {
    finish()
    return
  }
  if (request.type === "cancel") {
    // Mark cancelled so frames still queued behind this message are dropped;
    // the client terminates the Worker right after posting.
    if (state) state.cancelled = true
  }
}
