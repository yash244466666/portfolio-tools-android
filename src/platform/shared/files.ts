import type { GeneratedFile } from "@/platform/contracts"

const fallbackName = "yash-tools-output"
const maximumFileNameLength = 120

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
  return Array.from(sanitized).slice(0, maximumFileNameLength).join("")
}

export function generatedFileBytes(file: GeneratedFile): Uint8Array<ArrayBuffer> {
  if (file.encoding === "utf8") return new TextEncoder().encode(file.data)

  const decoded = atob(file.data)
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}
