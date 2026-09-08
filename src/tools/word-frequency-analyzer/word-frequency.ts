/**
 * Pure word-frequency analysis for the Word Frequency Analyzer. Original
 * work for this repository; no upstream code is copied.
 *
 * Tokenization runs on Unicode word boundaries by matching runs of letters
 * and numbers (`\p{L}\p{N}` with the `u` flag), so Word "counting" is
 * language-aware at the character level without locale data. The stopword
 * set is a small embedded English list (this repository's own curation of
 * the ~40 most common English function words; public domain, no license
 * attribution required) and is only applied when the case-folded compare is
 * enabled.
 */

/** The standard bounded-input cap shared with the other text tools. */
export const maximumInputCharacters = 100_000

export type TopNCount = 5 | 10 | 25 | 50
export const topNOptions: readonly TopNCount[] = [5, 10, 25, 50]

/**
 * Small English stopword set (function words only). Provenance: curated in
 * this repository from common public-domain English stopword lists; not
 * copied from any upstream source.
 */
export const englishStopwords: readonly string[] = [
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "can",
  "did",
  "do",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "him",
  "his",
  "i",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "she",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "will",
  "with",
  "you",
  "your",
]

const wordPattern = /\p{L}[\p{L}\p{N}']*|\p{N}+/gu

export interface WordFrequencyEntry {
  word: string
  count: number
  /** Share of all counted tokens, as a percentage rounded to 1 decimal. */
  percentage: number
}

export interface WordFrequencyResult {
  /** Total tokens after stopword removal (if enabled). */
  tokenCount: number
  uniqueWordCount: number
  entries: WordFrequencyEntry[]
  stopwordsRemoved: number
}

/**
 * Tokenizes, applies the optional case-folded stopword removal, and returns
 * the top `topN` words with counts and percentages. Ties break
 * alphabetically so the same input always yields the same table.
 */
export function analyzeWordFrequency(
  text: string,
  options: { topN: TopNCount; caseFold: boolean; removeStopwords: boolean },
): WordFrequencyResult {
  const source = text.length > maximumInputCharacters ? text.slice(0, maximumInputCharacters) : text
  const counts = new Map<string, number>()
  let stopwordsRemoved = 0

  for (const match of source.matchAll(wordPattern)) {
    const token = match[0] ?? ""
    const key = options.caseFold ? token.toLocaleLowerCase() : token
    if (options.removeStopwords && englishStopwords.includes(key)) {
      stopwordsRemoved += 1
      continue
    }
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const tokenCount = [...counts.values()].reduce((sum, count) => sum + count, 0)
  const sorted = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1]
    return left[0].localeCompare(right[0])
  })

  const entries = sorted.slice(0, options.topN).map(([word, count]) => ({
    word,
    count,
    percentage: tokenCount > 0 ? Math.round((count / tokenCount) * 1000) / 10 : 0,
  }))

  return {
    tokenCount,
    uniqueWordCount: counts.size,
    entries,
    stopwordsRemoved,
  }
}

/** Trims the textarea value to the tool cap; used by the component. */
export function clampInput(text: string): string {
  return text.length > maximumInputCharacters ? text.slice(0, maximumInputCharacters) : text
}
