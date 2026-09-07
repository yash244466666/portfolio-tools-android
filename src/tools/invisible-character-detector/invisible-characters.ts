/**
 * Pure invisible-character detection.
 *
 * The detected set is the upstream curated list: zero-width and joiner characters,
 * bidirectional marks/embeddings, unusual spaces, and replacement characters. The
 * removal set is exactly the detected set, so "remove all" only ever strips
 * characters the detector reported. All code points are expressed as escapes so this
 * file itself contains no raw invisible characters.
 */

/** Source text bound, matching the other text tools' textarea limits. */
export const maximumSourceLength = 10_000

export interface InvisibleCharacterDefinition {
  name: string
  char: string
  code: string
  /** Matches every code point counted under this definition. */
  pattern: RegExp
}

const codePoints: { name: string; code: string; cps: number[] }[] = [
  { name: "Zero-Width Space", code: "U+200B", cps: [0x200b] },
  { name: "Zero-Width Joiner", code: "U+200D", cps: [0x200d] },
  { name: "Zero-Width Non-Joiner", code: "U+200C", cps: [0x200c] },
  { name: "Word Joiner", code: "U+2060", cps: [0x2060] },
  { name: "Byte Order Mark", code: "U+FEFF", cps: [0xfeff] },
  { name: "Non-Breaking Space", code: "U+00A0", cps: [0x00a0] },
  { name: "Soft Hyphen", code: "U+00AD", cps: [0x00ad] },
  { name: "Narrow No-Break Space", code: "U+202F", cps: [0x202f] },
  { name: "En Space", code: "U+2002", cps: [0x2002] },
  { name: "Em Space", code: "U+2003", cps: [0x2003] },
  { name: "Line Separator", code: "U+2028", cps: [0x2028] },
  { name: "Paragraph Separator", code: "U+2029", cps: [0x2029] },
  { name: "Left-to-Right Mark", code: "U+200E", cps: [0x200e] },
  { name: "Right-to-Left Mark", code: "U+200F", cps: [0x200f] },
  { name: "Left-to-Right Embedding", code: "U+202A", cps: [0x202a] },
  { name: "Right-to-Left Embedding", code: "U+202B", cps: [0x202b] },
  { name: "Pop Directional Formatting", code: "U+202C", cps: [0x202c] },
  { name: "Interlinear Annotation", code: "U+FFF9-FFFB", cps: [0xfff9, 0xfffa, 0xfffb] },
  { name: "Object Replacement", code: "U+FFFC", cps: [0xfffc] },
  { name: "Replacement Character", code: "U+FFFD", cps: [0xfffd] },
]

/** Builds a `u`-mode character class matching exactly the given code points. */
function characterClass(cps: number[]): RegExp {
  const source = `[${cps.map((cp) => `\\u{${cp.toString(16)}}`).join("")}]`
  return new RegExp(source, "gu")
}

export const invisibleCharacterDefinitions: readonly InvisibleCharacterDefinition[] =
  codePoints.map((entry) => ({
    name: entry.name,
    char: String.fromCodePoint(entry.cps[0] ?? 0),
    code: entry.code,
    pattern: characterClass(entry.cps),
  }))

/** Every code point the detector can report; the removal step strips exactly these. */
const removalPattern = characterClass(codePoints.flatMap((entry) => entry.cps))

export interface InvisibleCharacterDetection {
  /** Per-definition counts, only for characters that were found. */
  found: { name: string; char: string; code: string; count: number }[]
  totalInvisible: number
  totalChars: number
}

export function detectInvisibleCharacters(input: string): InvisibleCharacterDetection {
  const found: InvisibleCharacterDetection["found"] = []
  let totalInvisible = 0
  for (const definition of invisibleCharacterDefinitions) {
    const matches = input.match(definition.pattern)
    if (matches !== null && matches.length > 0) {
      found.push({
        name: definition.name,
        char: definition.char,
        code: definition.code,
        count: matches.length,
      })
      totalInvisible += matches.length
    }
  }
  return { found, totalInvisible, totalChars: input.length }
}

/** Removes every character the detector reports; leaves all other text untouched. */
export function removeInvisibleCharacters(input: string): string {
  return input.replace(removalPattern, "")
}
