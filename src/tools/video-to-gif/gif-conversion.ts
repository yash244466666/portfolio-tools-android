/**
 * Message contract and pure helpers for the Video to GIF Worker pipeline.
 *
 * Architecture note (per the approved dossier's "where verified, otherwise
 * sequenced off the UI thread" clause): a `<video>` element is a DOM node and
 * cannot exist inside a Worker, so the element's seeks and per-frame
 * `createImageBitmap` calls run on the main thread. The Worker owns everything
 * that is CPU- or memory-heavy: pixel extraction from each transferred
 * `ImageBitmap` through an `OffscreenCanvas`, quantization, the incremental
 * LZW encode, the output byte cap, and progress reporting. The main thread
 * never holds a raw pixel buffer.
 */

export type GifWorkerRequest =
  | {
      type: "start"
      width: number
      height: number
      frameCount: number
      frameIntervalMs: number
      maximumOutputBytes: number
    }
  | { type: "frame"; bitmap: ImageBitmap }
  | { type: "finish" }
  | { type: "cancel" }

export type GifWorkerResponse =
  | { type: "progress"; framesDone: number; frameCount: number }
  | { type: "encoding" }
  | {
      type: "complete"
      bytes: ArrayBuffer
      width: number
      height: number
      frameCount: number
    }
  | { type: "failed"; code: "encoder-failure" | "over-limit-output"; message: string }

/** Seek timestamps, in seconds, for every frame of a validated plan. */
export function frameSeekTimestamps(frameCount: number, frameIntervalSeconds: number): number[] {
  const timestamps: number[] = []
  for (let index = 0; index < frameCount; index += 1) {
    timestamps.push(index * frameIntervalSeconds)
  }
  return timestamps
}
