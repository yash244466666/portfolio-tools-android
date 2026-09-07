export const htmlEntityModes = ["encode", "decode", "escape-html"] as const
export type HtmlEntityMode = (typeof htmlEntityModes)[number]

export function getHtmlEntityMode(id: string): HtmlEntityMode {
  return htmlEntityModes.includes(id as HtmlEntityMode) ? (id as HtmlEntityMode) : "encode"
}

export const htmlEntityModeLabels: Record<HtmlEntityMode, string> = {
  encode: "Encode Entities",
  decode: "Decode Entities",
  "escape-html": "Escape HTML",
}

/** The five characters with short HTML entity names, matching upstream. */
const namedEncodings: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/** Encodes the five reserved characters into their HTML entities. */
export function encodeEntities(text: string): string {
  return text.replace(/[&<>"']/g, (character) => namedEncodings[character] ?? character)
}

/**
 * Escapes the three attribute-hostile characters plus quotes, matching the
 * upstream "Escape HTML" action (which leaves the apostrophe unescaped).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * A bounded set of common named entities accepted by the decoder. Unlike the
 * upstream `textarea.innerHTML` decode, this never parses HTML, so unknown
 * or malformed entities stay as-is instead of being parsed as markup.
 */
const namedDecodings: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&laquo;": "«",
  "&raquo;": "»",
  "&bull;": "•",
  "&middot;": "·",
  "&deg;": "°",
  "&para;": "¶",
  "&sect;": "§",
}

const entityPattern = /&(?:#x([0-9a-fA-F]+)|#([0-9]+)|([a-zA-Z][a-zA-Z0-9]*));/g

/**
 * Decodes named, decimal, and hexadecimal numeric entities. Anything that
 * is not a recognized entity is returned unchanged.
 */
export function decodeEntities(text: string): string {
  return text.replace(entityPattern, (match, hex, decimal, name) => {
    if (hex !== undefined) {
      const codePoint = Number.parseInt(String(hex), 16)
      return Number.isSafeInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match
    }
    if (decimal !== undefined) {
      const codePoint = Number.parseInt(String(decimal), 10)
      return Number.isSafeInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match
    }
    const decoded = namedDecodings[`&${name};`]
    return decoded ?? match
  })
}

/** Applies the selected mode to the input text. */
export function applyHtmlEntityMode(mode: HtmlEntityMode, text: string): string {
  switch (mode) {
    case "encode":
      return encodeEntities(text)
    case "decode":
      return decodeEntities(text)
    case "escape-html":
      return escapeHtml(text)
  }
}
