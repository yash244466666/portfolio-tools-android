/**
 * Pure Image Compressor planning and formatting logic.
 *
 * Decoding, drawing, and encoding live in `image-io.ts` so this module stays testable
 * without a canvas; every limit the tool enforces is defined and decided here.
 */

/** Input bound; matches the content-read bridge cap so oversized picks are rejected early. */
export const maximumInputBytes = 16 * 1024 * 1024

/** Decoded-pixel bound; larger images are rejected instead of being drawn or re-encoded. */
export const maximumDecodedPixels = 24_000_000

/** Discrete maximum-width options; images are only ever downscaled, never enlarged. */
export const imageWidthOptions = [800, 1280, 1920, 2560] as const
export type ImageWidthOption = (typeof imageWidthOptions)[number]

export const minimumQuality = 0.1
export const maximumQuality = 1
export const defaultQuality = 0.8
export const defaultMaxWidth: ImageWidthOption = 1920

export const supportedImageMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const
export type SupportedImageMimeType = (typeof supportedImageMimeTypes)[number]

export function isSupportedImageMimeType(mimeType: string): mimeType is SupportedImageMimeType {
  return (supportedImageMimeTypes as readonly string[]).includes(mimeType)
}

export function clampQuality(value: number): number {
  if (!Number.isFinite(value)) return defaultQuality
  return Math.min(maximumQuality, Math.max(minimumQuality, value))
}

export interface ResizePlan {
  width: number
  height: number
  /** True when the plan actually downscales. */
  resized: boolean
}

/**
 * Downscales to the maximum width while preserving aspect ratio; smaller images keep
 * their dimensions (never upscaled) and at least one pixel per side.
 */
export function planResize(width: number, height: number, maxWidth: number): ResizePlan {
  if (width <= maxWidth || width <= 0 || height <= 0) {
    return { width, height, resized: false }
  }
  const scaledWidth = Math.max(1, Math.min(width, maxWidth))
  const scaledHeight = Math.max(1, Math.round((height * scaledWidth) / width))
  return { width: scaledWidth, height: scaledHeight, resized: width !== scaledWidth }
}

export interface OutputFormat {
  mimeType: SupportedImageMimeType
  /** True for JPEG output, where the quality slider applies. */
  useQuality: boolean
  extension: string
}

/**
 * PNG stays PNG (lossless re-encode); JPEG and WebP both re-encode as JPEG so the
 * quality slider has an effect. Output bytes are the same ones previewed.
 */
export function planOutputFormat(inputMimeType: SupportedImageMimeType): OutputFormat {
  if (inputMimeType === "image/png") {
    return { mimeType: "image/png", useQuality: false, extension: "png" }
  }
  return { mimeType: "image/jpeg", useQuality: true, extension: "jpg" }
}

/** Output file name derived from the picked name; adapters sanitize it again. */
export function compressedFileName(originalName: string, extension: string): string {
  const stem = originalName.replace(/\.[^.]*$/, "") || "image"
  return `compressed-${stem}.${extension}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function savingsPercent(originalBytes: number, compressedBytes: number): number {
  if (originalBytes <= 0) return 0
  return Math.round((1 - compressedBytes / originalBytes) * 100)
}

export function isValidInputSize(bytes: number): boolean {
  return bytes > 0 && bytes <= maximumInputBytes
}

export function isValidDecodedPixels(width: number, height: number): boolean {
  return width > 0 && height > 0 && width * height <= maximumDecodedPixels
}
