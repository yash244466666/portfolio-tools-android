/**
 * Canvas-backed decode/sample for the Color Palette from Image tool, kept
 * separate from the pure module so component tests can stub these paths
 * without a real canvas.
 */

import { paletteSize } from "./palette"

/** Decodes bytes as Base64 from the content-read bridge into raw binary bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/** Decodes image bytes into a bitmap with EXIF orientation applied. */
export async function decodeImage(bytes: Uint8Array): Promise<ImageBitmap> {
  const blob = new Blob([bytes.buffer as ArrayBuffer])
  return createImageBitmap(blob, { imageOrientation: "from-image" })
}

/**
 * Downsamples the bitmap to a fixed small square and returns its RGBA bytes.
 * Drawing at `paletteSize` bounds the decode sampling cost regardless of the
 * source resolution.
 */
export function samplePixels(bitmap: ImageBitmap): Uint8ClampedArray {
  const canvas = document.createElement("canvas")
  canvas.width = paletteSize
  canvas.height = paletteSize
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is unavailable on this device.")
  context.drawImage(bitmap, 0, 0, paletteSize, paletteSize)
  bitmap.close()
  const imageData = context.getImageData(0, 0, paletteSize, paletteSize)
  return imageData.data
}
