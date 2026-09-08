/**
 * Pure limits and validation for the Video to GIF tool.
 *
 * The limits follow the approved release dossier (`docs/release-reviews/
 * video-to-gif-review.md`): the per-file input budget is the 16 MiB
 * `FileService.readContent` bridge bound (the PDF Converter precedent — the
 * upstream's 50 MiB dropzone promise is not honorable over the bridge),
 * output dimensions cap at 640 px width with even dimensions, FPS spans 1-15
 * with a default of 5, takes cap at 30 seconds and 100 frames, and the GIF
 * output caps at 32 MiB with a distinct over-limit state. Exports are
 * additionally bounded by the 5 MiB Save As bridge.
 */
import { maximumBridgeGeneratedFileBytes, sanitizeGeneratedFileName } from "@/platform/shared/files"

export const maximumInputBytes = 16 * 1024 * 1024
export const maximumOutputWidth = 640
export const minimumFps = 1
export const maximumFps = 15
export const defaultFps = 5
export const defaultOutputWidth = 320
export const maximumDurationSeconds = 30
export const maximumFrames = 100
export const maximumOutputBytes = 32 * 1024 * 1024
/** The Save As bridge cap exports are measured against. */
export const maximumExportBytes = maximumBridgeGeneratedFileBytes
/** Wall-clock deadline for one video seek before the decode is declared failed. */
export const seekTimeoutMs = 10_000
/** Wall-clock deadline for loading the video metadata. */
export const metadataTimeoutMs = 10_000

export type VideoPickErrorCode = "invalid-mime" | "over-size"

export class GifPolicyError extends Error {
  readonly code: VideoPickErrorCode

  constructor(code: VideoPickErrorCode, message: string) {
    super(message)
    this.name = "GifPolicyError"
    this.code = code
  }
}

/** The over-size rejection message, shared with the picker's error mapping. */
export const overSizeMessage = `This video is larger than the ${formatMegabytes(maximumInputBytes)} input limit.`

/**
 * Validates a picked video before it is read. Returns the first problem so a
 * rejected pick never discards an already-selected source.
 */
export function validatePickedVideo(file: {
  mimeType: string
  size: number
  name?: string
}): GifPolicyError | null {
  const mimeType = file.mimeType.toLowerCase()
  const nameLooksVideo = /\.(mp4|webm|mov|m4v|3gp|mkv)$/i.test(file.name ?? "")
  if (!mimeType.startsWith("video/") && !nameLooksVideo) {
    return new GifPolicyError("invalid-mime", "Only video files are supported.")
  }
  if (file.size > maximumInputBytes) {
    return new GifPolicyError("over-size", overSizeMessage)
  }
  return null
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

/**
 * Validates a metadata duration read from the video element. NaN and
 * Infinity (streamed or unknown durations) and non-positive values are
 * rejected; durations above the take limit are rejected distinctly.
 */
export function validateDuration(durationSeconds: number): string | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "This video's duration could not be read, so no frames can be scheduled."
  }
  if (durationSeconds > maximumDurationSeconds) {
    return `This video runs ${Math.round(durationSeconds)} seconds; converts are limited to ${maximumDurationSeconds} seconds.`
  }
  return null
}

/** Validates a requested FPS against the 1-15 range. */
export function validateFps(fps: number): string | null {
  if (!Number.isFinite(fps) || fps < minimumFps || fps > maximumFps) {
    return `Frames per second must be between ${minimumFps} and ${maximumFps}.`
  }
  return null
}

export interface FramePlan {
  frameCount: number
  /** Seconds between frame starts; the seek schedule. */
  frameIntervalSeconds: number
  /** Milliseconds between frame starts; the GIF delay input. */
  frameIntervalMs: number
  /** True when the take was truncated at the 100-frame limit. */
  truncated: boolean
  /** Seconds of the source the plan actually includes. */
  includedSeconds: number
}

/**
 * Computes the frame schedule for a validated duration and FPS. Returns an
 * error when the plan would produce zero frames (a sub-1/fps take), which
 * upstream silently encoded as an invalid frameless GIF.
 */
export function computeFramePlan(durationSeconds: number, fps: number): FramePlan | string {
  const durationProblem = validateDuration(durationSeconds)
  if (durationProblem) return durationProblem
  const fpsProblem = validateFps(fps)
  if (fpsProblem) return fpsProblem

  const frameIntervalSeconds = 1 / fps
  const frameCount = Math.min(maximumFrames, Math.floor(durationSeconds * fps))
  if (frameCount < 1) {
    return "This video is too short for one frame at the chosen rate. Raise the frame rate and try again; very short clips may not contain a full frame even at 15 fps."
  }
  const includedSeconds = frameCount * frameIntervalSeconds
  return {
    frameCount,
    frameIntervalSeconds,
    frameIntervalMs: frameIntervalSeconds * 1000,
    truncated: frameCount < Math.floor(durationSeconds * fps),
    includedSeconds,
  }
}

/**
 * Validates a requested output width against the tool range. Returns the
 * problem message, or null when the width is usable.
 */
export function validateOutputWidth(requestedWidth: number): string | null {
  if (
    !Number.isFinite(requestedWidth) ||
    requestedWidth < 2 ||
    requestedWidth > maximumOutputWidth
  ) {
    return `Output width must be a number between 2 and ${maximumOutputWidth} pixels.`
  }
  return null
}

/**
 * Resolves the output dimensions: the requested width clamps to the tool
 * maximum, the aspect ratio is preserved, and both dimensions are made even
 * so chroma subsampling and codecs stay predictable.
 */
export function resolveOutputDimensions(
  videoWidth: number,
  videoHeight: number,
  requestedWidth: number,
): { width: number; height: number } | string {
  if (
    !Number.isFinite(videoWidth) ||
    !Number.isFinite(videoHeight) ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    return "This video's dimensions could not be read."
  }
  const requested = Number.isFinite(requestedWidth) ? requestedWidth : defaultOutputWidth
  const width = Math.max(2, Math.min(maximumOutputWidth, Math.round(requested)))
  const height = Math.max(2, Math.round((width * videoHeight) / videoWidth))
  return {
    width: width - (width % 2),
    height: height - (height % 2),
  }
}

/**
 * Returns the over-limit message when the finished GIF exceeds the hard
 * output cap, or null when the output is within the budget.
 */
export function validateOutputSize(outputBytes: number): string | null {
  if (outputBytes > maximumOutputBytes) {
    return `The GIF reached ${formatMegabytes(outputBytes)} of animated data, above the ${formatMegabytes(maximumOutputBytes)} limit. Use a lower frame rate, a shorter take, or a smaller width.`
  }
  return null
}

/** Whether the finished GIF fits the 5 MiB Save As bridge. */
export function canExportOutput(outputBytes: number): boolean {
  return outputBytes <= maximumExportBytes
}

export const exportCapNote = `Exports are capped at ${formatMegabytes(maximumExportBytes)} per file. Larger GIFs stay previewable here but cannot be exported in this version.`

/**
 * Builds a sanitized suggested export name from the source file name. The
 * extension is stripped, the base is run through the shared file-name
 * sanitizer, and `.gif` is appended.
 */
export function suggestedGifName(sourceName: string): string {
  const stripped = sourceName.replace(/\.[^.]+$/, "").trim()
  return `${sanitizeGeneratedFileName(stripped)}.gif`
}
