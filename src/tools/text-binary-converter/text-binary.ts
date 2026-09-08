/**
 * Pure text ⇄ binary/octal/decimal conversion for the Text-Binary Converter,
 * always through UTF-8 bytes (TextEncoder/TextDecoder semantics). Original
 * work for this repository; no upstream code is copied.
 */

export type NumberBase = "binary" | "octal" | "decimal"
export type ByteDelimiter = "space" | "newline" | "none"

export const numberBases: readonly NumberBase[] = ["binary", "octal", "decimal"]
export const byteDelimiters: readonly ByteDelimiter[] = ["space", "newline", "none"]

export const delimiterTokens: Record<ByteDelimiter, string> = {
  space: " ",
  newline: "\n",
  none: "",
}

/** Base for each selectable representation. */
export function baseFor(base: NumberBase): number {
  switch (base) {
    case "binary":
      return 2
    case "octal":
      return 8
    case "decimal":
      return 10
  }
}

/** The shared bounded-input cap for text in this tool. */
export const maximumTextCharacters = 10_000

/**
 * Encodes text into per-byte numbers in the chosen base, joined by the
 * chosen delimiter. With the "none" delimiter every token is zero-padded to
 * the base's full byte width so the un-delimited stream chunks unambiguously.
 * Empty input encodes to an empty string.
 */
export function encodeText(text: string, base: NumberBase, delimiter: ByteDelimiter): string {
  const bytes = new TextEncoder().encode(text)
  const radix = baseFor(base)
  const token = delimiterTokens[delimiter]
  const width = Math.ceil(8 / Math.log2(radix))
  return [...bytes]
    .map((byte) => {
      const value = byte.toString(radix)
      return delimiter === "none" ? value.padStart(width, "0") : value
    })
    .join(token)
}

export type DecodeFailure =
  { status: "ok"; text: string; byteCount: number } | { status: "error"; message: string }

/**
 * Decodes per-byte numbers in the chosen base back into UTF-8 text. Parsing
 * is strict: every token must be an integer in the base's own digit set
 * (fractions, exponents, and out-of-range values fail with a typed message),
 * and byte sequences that are not valid UTF-8 fail closed instead of
 * producing replacement characters silently.
 */
export function decodeText(
  input: string,
  base: NumberBase,
  delimiter: ByteDelimiter,
): DecodeFailure {
  const trimmed = input.trim()
  if (trimmed === "") return { status: "error", message: "Enter the encoded values to decode." }

  const radix = baseFor(base)
  const width = Math.ceil(8 / Math.log2(radix))
  // Whitespace normalization: pasted CRLF/CR/tabs become the active
  // delimiter (or are stripped for the fixed-width "none" stream), and
  // non-breaking spaces count as whitespace before splitting.
  const normalized = trimmed
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, delimiter === "newline" ? "\n" : " ")
    .replace(/\t/g, delimiter === "newline" ? "\n" : " ")

  let tokens: string[]
  if (delimiter === "none") {
    const stripped = normalized.replace(/\s+/g, "")
    if (stripped.length % width !== 0) {
      return {
        status: "error",
        message: `The fixed-width stream must be a multiple of ${width} characters for ${base}; some trailing characters do not form a complete value.`,
      }
    }
    tokens = stripped.match(new RegExp(`[\\s\\S]{${width}}`, "g")) ?? []
  } else if (delimiter === "newline") {
    tokens = normalized.split("\n")
  } else {
    tokens = normalized.split(/\s+/)
  }
  tokens = tokens.filter((token) => token !== "")

  const bytes: number[] = []
  const digitPattern =
    base === "binary"
      ? /^[01]+$/
      : base === "octal"
        ? /^[0-7]+$/
        : // Decimal bytes are integers only: the shared decimal grammar also
          // accepts fractions, which would silently truncate into a byte.
          /^\d+$/
  for (const token of tokens) {
    if (delimiter === "none" && token.length !== width) {
      return {
        status: "error",
        message: `"${token.slice(0, 32)}" is not exactly ${width} characters for ${base} with no delimiter.`,
      }
    }
    if (!digitPattern.test(token) || token.length > width) {
      return { status: "error", message: `"${token.slice(0, 32)}" is not a valid ${base} value.` }
    }
    const value = Number.parseInt(token, radix)
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return {
        status: "error",
        message: `"${token.slice(0, 32)}" is outside the 0-255 range for ${base}.`,
      }
    }
    bytes.push(value)
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes))
    return { status: "ok", text, byteCount: bytes.length }
  } catch {
    return {
      status: "error",
      message: "These bytes are not valid UTF-8, so they cannot be decoded into text.",
    }
  }
}
