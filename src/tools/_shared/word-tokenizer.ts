/**
 * Shared Unicode word tokenizer for the text tools (Word Frequency Analyzer
 * and Reading Time Estimator), so both never drift apart. Original work for
 * this repository.
 *
 * - Words are runs of letters/numbers plus interior apostrophes. Both the
 *   ASCII apostrophe (U+0027) and the typographic apostrophe (U+2019) are
 *   word characters, so "don't" and "don’t" each tokenize as one word.
 * - A single trailing apostrophe is possessive ("dogs'") and is stripped.
 * - Case folding uses the invariant `toLowerCase()`, never
 *   `toLocaleLowerCase()`, so the result cannot be host-locale-dependent
 *   (Turkish locale maps "I" to "ı").
 */

const wordPattern = /[\p{L}\p{N}][\p{L}\p{N}'’]*|\p{N}+/gu

/** Normalizes one token: invariant case-fold and possessive stripping. */
export function normalizeToken(token: string, caseFold: boolean): string {
  const stripped = token.replace(/['’]$/u, "")
  return caseFold ? stripped.toLowerCase() : stripped
}

/** Tokenizes text into normalized words on Unicode word boundaries. */
export function tokenizeWords(text: string, caseFold: boolean): string[] {
  const tokens: string[] = []
  for (const match of text.matchAll(wordPattern)) {
    const token = match[0] ?? ""
    const normalized = normalizeToken(token, caseFold)
    // A lone apostrophe token disappears after stripping; drop it.
    if (normalized.length > 0) tokens.push(normalized)
  }
  return tokens
}

/** Counts tokens without materializing the array. */
export function countWords(text: string, caseFold = true): number {
  let count = 0
  for (const match of text.matchAll(wordPattern)) {
    const normalized = normalizeToken(match[0] ?? "", caseFold)
    if (normalized.length > 0) count += 1
  }
  return count
}

/** Deterministic codepoint comparator (host-locale independent). */
export function compareCodepoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
