export const caesarShiftBounds = { min: 1, max: 25 } as const

/**
 * Shifts A-Z and a-z by the given amount modulo 26; every other character
 * passes through unchanged.
 */
export function caesarShift(text: string, shift: number): string {
  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + shift) % 26) + 65)
      }
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + shift) % 26) + 97)
      }
      return char
    })
    .join("")
}

/** Decoding is the inverse shift. */
export function caesarDecode(text: string, shift: number): string {
  return caesarShift(text, 26 - shift)
}

/** Clamps a shift amount into the tool's documented 1-25 range. */
export function clampCaesarShift(shift: number): number {
  if (!Number.isFinite(shift)) {
    return 13
  }
  return Math.min(Math.max(Math.round(shift), caesarShiftBounds.min), caesarShiftBounds.max)
}
