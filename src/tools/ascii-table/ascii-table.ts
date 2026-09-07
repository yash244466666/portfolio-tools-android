import { asciiData, type AsciiEntry } from "./ascii-data"

export const maximumAsciiQueryChars = 60

export function toAsciiHex(dec: number): string {
  return dec.toString(16).toUpperCase().padStart(2, "0")
}

export function toAsciiOctal(dec: number): string {
  return dec.toString(8).padStart(3, "0")
}

export function isControlCode(dec: number): boolean {
  return dec < 32 || dec === 127
}

/**
 * What copying a row puts on the clipboard: printable rows copy their
 * character; control-code rows copy the raw control byte, matching the
 * upstream behavior and the row's disclosed meaning.
 */
export function asciiCopyText(entry: AsciiEntry): string {
  return isControlCode(entry.dec) ? String.fromCharCode(entry.dec) : entry.char
}

/**
 * Filters the audited ASCII dataset by a free-text query matched against
 * the decimal value, its hex and octal forms, the character (mnemonic for
 * control codes), and the description. A leading `0x`/`0X` prefix is
 * stripped so hex searches such as "0x41" match the hex column.
 */
export function filterAsciiEntries(query: string): AsciiEntry[] {
  const normalized = query.trim().toLowerCase().replace(/^0x/, "")
  if (!normalized) {
    return asciiData
  }
  return asciiData.filter((entry) => {
    return (
      String(entry.dec).includes(normalized) ||
      toAsciiHex(entry.dec).toLowerCase().includes(normalized) ||
      toAsciiOctal(entry.dec).includes(normalized) ||
      entry.char.toLowerCase().includes(normalized) ||
      entry.description.toLowerCase().includes(normalized)
    )
  })
}
