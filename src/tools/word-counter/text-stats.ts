/**
 * Pure text statistics shared by the Word Counter and Character Counter.
 *
 * Counts are code-point based (a surrogate pair counts as one character), which
 * is what a person means by "characters"; the upstream implementation counted
 * UTF-16 units, so emoji-heavy text was miscounted. That divergence is recorded
 * in `docs/SOURCE_PROVENANCE.md`.
 *
 * Words come from the shared Unicode tokenizer, not a whitespace split, so
 * punctuation-only or emoji-only text does not invent words and combining
 * marks stay attached to their letters.
 */
import { countWords } from "@/tools/_shared/word-tokenizer"

/** Input bound; counting is only run at or below it, so pasting beyond it is rejected. */
export const maximumCounterChars = 1_000_000

/** Reading-time assumption, disclosed in the UI. */
export const readingWordsPerMinute = 200

export interface TextStats {
  words: number
  characters: number
  charactersWithoutSpaces: number
  sentences: number
  paragraphs: number
  readingTimeLabel: string
}

export function computeTextStats(text: string): TextStats {
  const codePoints = [...text]
  if (codePoints.length === 0) {
    return {
      words: 0,
      characters: 0,
      charactersWithoutSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingTimeLabel: "0 min",
    }
  }

  const words = countWords(text)
  const characters = codePoints.length
  const charactersWithoutSpaces = codePoints.filter((codePoint) => !/\s/u.test(codePoint)).length
  // Simple heuristic: a run of sentence punctuation ends one sentence. Abbreviations
  // such as "Mr." count as a boundary; this is disclosed as a heuristic in the UI.
  const sentences = text.split(/[.!?]+/).filter((segment) => /\S/u.test(segment)).length
  const paragraphs = text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0).length

  let readingTimeLabel: string
  if (words === 0) {
    readingTimeLabel = "0 min"
  } else if (words < readingWordsPerMinute) {
    readingTimeLabel = "< 1 min"
  } else {
    readingTimeLabel = `${Math.ceil(words / readingWordsPerMinute)} min`
  }

  return {
    words,
    characters,
    charactersWithoutSpaces,
    sentences,
    paragraphs,
    readingTimeLabel,
  }
}
