/**
 * Pure QR Code generation for the QR Generator tool.
 *
 * The pinned `qrcode` library (MIT) provides the spec implementation; this module wraps
 * it with typed results, explicit input limits, and a deterministic render plan so the
 * canvas output dimensions are testable separately from the on-screen CSS size.
 */
import { create as createQrCode } from "qrcode"

/**
 * Hard input cap. The QR byte-mode maximum is 2 953 bytes at version 40 / level L; this
 * bound keeps generation cost and the rendered matrix small without rejecting realistic
 * URLs, Wi-Fi strings, or vCard payloads.
 */
export const maximumQrInputBytes = 4000

/** Quiet zone required around the symbol, in modules (QR specification recommends 4). */
export const qrQuietZoneModules = 4

/** Discrete output sizes; the PNG is exactly this many pixels wide and tall. */
export const qrPixelSizes = [128, 256, 512] as const
export type QrPixelSize = (typeof qrPixelSizes)[number]

export const qrErrorCorrectionLevels = ["L", "M", "Q", "H"] as const
export type QrErrorCorrectionLevel = (typeof qrErrorCorrectionLevels)[number]

export const qrPngMimeType = "image/png"
export const qrPngFileName = "qr-code.png"

export interface QrMatrix {
  /** QR version (1–40). */
  version: number
  /** Modules per side, excluding the quiet zone (21 + 4 × (version − 1)). */
  size: number
  /** Row-major module colors; 1 = dark, 0 = light. */
  dark: Uint8Array
}

export type QrMatrixResult =
  | { status: "ok"; matrix: QrMatrix }
  | { status: "invalid"; message: string }
  | { status: "over-limit"; message: string }

export function isValidQrInputSize(text: string): boolean {
  return new TextEncoder().encode(text).byteLength <= maximumQrInputBytes
}

export function qrInputBytes(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

/**
 * Encodes text into a QR symbol as a typed result. The library is only consulted after
 * the byte cap; capacity failures per error-correction level become typed invalid
 * results, never thrown exceptions.
 */
export function createQrMatrix(text: string, level: QrErrorCorrectionLevel): QrMatrixResult {
  if (!text) return { status: "invalid", message: "Enter text to encode." }
  if (!isValidQrInputSize(text)) {
    return {
      status: "over-limit",
      message: `QR text is limited to ${maximumQrInputBytes} bytes. Shorten the text.`,
    }
  }
  try {
    const code = createQrCode(text, { errorCorrectionLevel: level })
    const size = code.modules.size
    const dark = new Uint8Array(size * size)
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (code.modules.get(row, column) === 1) dark[row * size + column] = 1
      }
    }
    return { status: "ok", matrix: { version: code.version, size, dark } }
  } catch {
    return {
      status: "invalid",
      message:
        "The text is too long for a QR code at this error-correction level. Shorten the text or choose level L.",
    }
  }
}

export interface QrRenderPlan {
  /** Whole-pixel size of one module; fractional modules would blur the symbol. */
  modulePixels: number
  /** Exact canvas output width/height; can be slightly below the chosen size. */
  canvasPixels: number
  quietZoneModules: number
  totalModules: number
}

export function planQrRender(matrix: QrMatrix, pixels: QrPixelSize): QrRenderPlan {
  const totalModules = matrix.size + 2 * qrQuietZoneModules
  const modulePixels = Math.max(1, Math.floor(pixels / totalModules))
  return {
    modulePixels,
    canvasPixels: modulePixels * totalModules,
    quietZoneModules: qrQuietZoneModules,
    totalModules,
  }
}

export type QrDrawResult = { status: "ok"; plan: QrRenderPlan } | { status: "unsupported" }

/**
 * Paints the symbol onto a canvas at exact integer module scaling: black modules on a
 * white background for maximum scanner contrast, with the spec quiet zone. The canvas
 * backing size is set from the plan, independent of the CSS display size.
 */
export function drawQrToCanvas(
  canvas: HTMLCanvasElement,
  matrix: QrMatrix,
  pixels: QrPixelSize,
): QrDrawResult {
  const plan = planQrRender(matrix, pixels)
  const context = canvas.getContext("2d")
  if (!context) return { status: "unsupported" }
  canvas.width = plan.canvasPixels
  canvas.height = plan.canvasPixels
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, plan.canvasPixels, plan.canvasPixels)
  context.fillStyle = "#000000"
  const offset = plan.quietZoneModules * plan.modulePixels
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      if (matrix.dark[row * matrix.size + column] === 1) {
        context.fillRect(
          offset + column * plan.modulePixels,
          offset + row * plan.modulePixels,
          plan.modulePixels,
          plan.modulePixels,
        )
      }
    }
  }
  return { status: "ok", plan }
}

/** PNG export of the rendered canvas; resolves null when encoding fails. */
export function canvasPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null)
        return
      }
      void blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(() => resolve(null))
    }, qrPngMimeType)
  })
}

/** Base64 for the GeneratedFile bridge; chunked so large inputs never blow the stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}
