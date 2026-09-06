import type { GeneratedFile } from "@/platform/contracts"

const fallbackName = "yash-tools-output"
const maximumFileNameBytes = 120

export const maximumBridgeGeneratedFileBytes = 5 * 1024 * 1024

export function sanitizeGeneratedFileName(name: string): string {
  const withoutUnsafeCharacters = Array.from(name.normalize("NFC"), (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint < 32 || codePoint === 127 || '/\\<>:"|?*'.includes(character) ? "-" : character
  }).join("")
  const sanitized = withoutUnsafeCharacters
    .replace(/-+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")

  if (!sanitized) return fallbackName

  const encoder = new TextEncoder()
  let byteLength = 0
  let truncated = ""
  for (const character of sanitized) {
    const characterBytes = encoder.encode(character).byteLength
    if (byteLength + characterBytes > maximumFileNameBytes) break
    truncated += character
    byteLength += characterBytes
  }
  truncated = truncated.trim().replace(/\.+$/g, "")
  return truncated || fallbackName
}

export function generatedFileBytes(file: GeneratedFile): Uint8Array<ArrayBuffer> {
  if (file.encoding === "utf8") return new TextEncoder().encode(file.data)

  const decoded = atob(file.data)
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

export function validatedGeneratedFileBytes(file: GeneratedFile): Uint8Array<ArrayBuffer> {
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = generatedFileBytes(file)
  } catch (error) {
    throw new TypeError("Generated file data is not valid for its declared encoding.", {
      cause: error,
    })
  }

  if (bytes.byteLength > maximumBridgeGeneratedFileBytes) {
    throw new RangeError("Generated file exceeds the 5 MiB Save As bridge limit.")
  }
  return bytes
}
