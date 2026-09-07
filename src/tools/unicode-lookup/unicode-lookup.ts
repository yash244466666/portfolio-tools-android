import { unicodeCategories, unicodeData, type UnicodeEntry } from "./unicode-data"

export const maximumUnicodeQueryChars = 60

/**
 * Filters the audited character dataset by category tab and query. The
 * query matches an exact single character, a substring of the name, or a
 * substring of the code point (for example "U+0041" or "0041").
 */
export function filterUnicodeEntries(query: string, category: string): UnicodeEntry[] {
  const normalized = query.trim().toLowerCase()
  return unicodeData.filter((entry) => {
    if (category !== "all" && entry.category !== category) {
      return false
    }
    if (!normalized) {
      return true
    }
    return (
      entry.char === normalized ||
      entry.name.toLowerCase().includes(normalized) ||
      entry.codePoint.toLowerCase().includes(normalized)
    )
  })
}

/**
 * Independent-oracle helper: derives the canonical U+XXXX form from the
 * character itself. Used by tests to verify every dataset row's code
 * point against the character data.
 */
export function expectedCodePoint(char: string): string {
  const code = char.codePointAt(0)
  if (code === undefined) {
    throw new RangeError("Empty character")
  }
  return `U+${code.toString(16).toUpperCase().padStart(4, "0")}`
}

export { unicodeCategories }
