/**
 * Pure Base64 encode/decode for the Base64 tool.
 *
 * UTF-8 bytes go through `TextEncoder`/`TextDecoder` instead of the deprecated
 * `escape`/`unescape` round-trip the upstream implementation used, and decoding
 * rejects invalid UTF-8 with a typed failure instead of silently producing
 * mojibake; the divergence is recorded in `docs/SOURCE_PROVENANCE.md`. Nothing
 * here touches React or platform services.
 */

export const maximumBase64Chars = 100_000

const base64CharsetPattern = /^[A-Za-z0-9+/]*={0,2}$/

export type Base64Outcome =
  | { status: "ok"; value: string }
  | { status: "invalid-base64" }
  | { status: "invalid-utf8" }
  | { status: "too-long" }

/** Encodes UTF-8 text as standard Base64 with padding. */
export function encodeBase64(text: string): Base64Outcome {
  if (text.length > maximumBase64Chars) return { status: "too-long" }
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  // Chunk to avoid argument-count limits on String.fromCharCode.apply.
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return { status: "ok", value: btoa(binary) }
}

/** Decodes standard Base64 (whitespace tolerated) into UTF-8 text. */
export function decodeBase64(text: string): Base64Outcome {
  if (text.length > maximumBase64Chars) return { status: "too-long" }
  const compact = text.replace(/[\t\n\f\r ]/g, "")
  if (compact.length === 0) return { status: "ok", value: "" }
  if (!base64CharsetPattern.test(compact)) return { status: "invalid-base64" }
  // Padding is optional in some encoders but the length must stay a multiple of
  // four once padding is normalized.
  const remainder = compact.length % 4
  const normalized = remainder === 0 ? compact : compact + "=".repeat(4 - remainder)
  if (normalized.length % 4 !== 0) return { status: "invalid-base64" }

  let binary: string
  try {
    binary = atob(normalized)
  } catch {
    return { status: "invalid-base64" }
  }
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  try {
    return { status: "ok", value: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  } catch {
    return { status: "invalid-utf8" }
  }
}
