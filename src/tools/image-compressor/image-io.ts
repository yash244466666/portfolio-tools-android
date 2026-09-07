/**
 * Canvas-backed decode/encode for the Image Compressor. Kept separate from the pure
 * planning module so component tests can stub these paths without a real canvas.
 */
import type { ResizePlan, SupportedImageMimeType } from "./image"

/** Decodes bytes as Base64 from the content-read bridge into raw binary bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/**
 * Decodes image bytes into a bitmap with EXIF orientation applied, so the tool never
 * draws a rotated image. `createImageBitmap` streams the decode; the caller enforces
 * the decoded-pixel bound before drawing.
 */
export async function decodeImage(bytes: Uint8Array): Promise<ImageBitmap> {
  const blob = new Blob([bytes.buffer as ArrayBuffer])
  return createImageBitmap(blob, { imageOrientation: "from-image" })
}

/**
 * Draws the bitmap at the planned size and encodes it. The returned bytes are the exact
 * bytes the preview shows and the share/save handoff delivers. Canvas re-encoding
 * strips EXIF metadata (including any location data) as a side effect.
 */
export async function encodeImage(
  bitmap: ImageBitmap,
  plan: ResizePlan,
  mimeType: SupportedImageMimeType,
  quality: number | undefined,
): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = plan.width
  canvas.height = plan.height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is unavailable on this device.")
  context.drawImage(bitmap, 0, 0, plan.width, plan.height)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("The image could not be encoded."))
      },
      mimeType,
      quality,
    )
  })
}

export async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}
