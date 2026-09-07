/**
 * Pure find-and-replace evaluation.
 *
 * Literal (non-regex) searches use plain string scanning, so they are safe to run on
 * the UI thread. Regex searches are compiled from user input, which is hostile by
 * default (a catastrophic pattern can block its execution context indefinitely), so
 * the component routes regex mode through the terminable Worker runner shared with
 * the Regex Tester (see `regex-client.ts`) and never compiles the pattern here.
 */

/** Source text bound, matching the other text tools' textarea limits. */
export const maximumSourceLength = 10_000

/** The find pattern is bounded so the compiled regex stays within the interaction budget. */
export const maximumFindLength = 512

/** Match collection stops here so a globally-matching pattern cannot grow without bound. */
export const maximumMatchCount = 1000

export interface FoundMatch {
  index: number
  text: string
}

/** Escapes a literal string for embedding inside a regular expression. */
export function escapeRegexLiteral(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Builds the regex pattern for regex mode, wrapping with word-boundary lookarounds
 * when whole-word matching is requested (upstream semantics).
 */
export function buildRegexPattern(pattern: string, wholeWord: boolean): string {
  return wholeWord ? `(?<=^|\\W)${pattern}(?=$|\\W)` : pattern
}

export function buildFlags(caseSensitive: boolean): string {
  return caseSensitive ? "g" : "gi"
}

function isWordCharacter(character: string | undefined): boolean {
  if (character === undefined) return false
  return /[A-Za-z0-9_]/.test(character)
}

/**
 * Finds literal (non-regex) matches with plain string scanning. Case-insensitive
 * scanning compares lowercased copies; when case folding changes a string's length
 * (rare exotic characters), scanning falls back to case-sensitive to stay index-correct.
 */
export function findLiteralMatches(
  source: string,
  find: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): FoundMatch[] {
  if (find === "" || source === "") return []
  const needleLength = find.length
  const haystack =
    caseSensitive || find.toLowerCase().length !== needleLength ? source : source.toLowerCase()
  const needle =
    caseSensitive || find.toLowerCase().length !== needleLength ? find : find.toLowerCase()
  const matches: FoundMatch[] = []
  let cursor = 0
  while (matches.length < maximumMatchCount) {
    const index = haystack.indexOf(needle, cursor)
    if (index === -1) break
    const endIndex = index + needleLength
    const startBoundary = index === 0 || !isWordCharacter(haystack[index - 1])
    const endBoundary = endIndex === haystack.length || !isWordCharacter(haystack[endIndex])
    if (!wholeWord || (startBoundary && endBoundary)) {
      matches.push({ index, text: source.slice(index, endIndex) })
    }
    cursor = index + 1
  }
  return matches
}

/**
 * Splices the replacement into every matched range, scanning from the end so earlier
 * indices stay valid. Returns the new text and the replacement count.
 */
export function applyReplacements(
  source: string,
  matches: FoundMatch[],
  replacement: string,
): { output: string; matchCount: number } {
  let output = source
  for (let position = matches.length - 1; position >= 0; position -= 1) {
    const match = matches[position]
    if (match === undefined) continue
    output =
      output.slice(0, match.index) + replacement + output.slice(match.index + match.text.length)
  }
  return { output, matchCount: matches.length }
}

/** The match list produced by the Worker for regex mode; same shape as literal matches. */
export function matchesFromRegexResult(
  input: string,
  matches: { index: number; text: string }[],
): FoundMatch[] {
  return matches.slice(0, maximumMatchCount).map((match) => ({
    index: match.index,
    text: input.slice(match.index, match.index + match.text.length),
  }))
}
