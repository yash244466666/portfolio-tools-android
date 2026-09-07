/**
 * Pure slug generation for the Text to Slug tool.
 *
 * Truncation is implemented without dynamically built regular expressions and
 * the input is bounded; the upstream behavior for non-Latin scripts (those
 * characters are removed, since only A–Z/a–z/0–9 survive) is kept and disclosed
 * in the UI. Nothing here touches React or platform services.
 */

export const maximumSlugChars = 100_000
/** Upper bound for the truncation option; 0 means unlimited. */
export const maximumSlugLength = 200

export type SlugSeparator = "-" | "_" | "."

export const slugSeparators: readonly { id: SlugSeparator; label: string }[] = [
  { id: "-", label: "- (hyphen)" },
  { id: "_", label: "_ (underscore)" },
  { id: ".", label: ". (dot)" },
]

export const slugStopWords: readonly string[] = [
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "as",
  "be",
  "was",
  "are",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "can",
  "could",
  "this",
  "that",
  "these",
  "those",
]

const stopWordSet = new Set(slugStopWords)

export interface SlugOptions {
  separator: SlugSeparator
  lowercase: boolean
  removeStopWords: boolean
  /** 0 means unlimited. */
  maximumLength: number
}

export interface SlugStep {
  label: string
  value: string
}

export interface SlugResult {
  slug: string
  steps: SlugStep[]
}

/** Combining diacritical marks (U+0300–U+036F), dropped after NFD decomposition. */
const combiningMarkPattern = /[\u0300-\u036f]/gu

export function textToSlug(input: string, options: SlugOptions): SlugResult {
  const steps: SlugStep[] = [{ label: "Original", value: input }]

  // Strip diacritics by decomposing and dropping combining marks; characters
  // with no ASCII decomposition simply drop out at the next step.
  let text = input.normalize("NFD").replace(combiningMarkPattern, "")
  steps.push({ label: "Remove diacritics", value: text })

  if (options.removeStopWords) {
    text = text
      .split(/\s+/)
      .filter((word) => !stopWordSet.has(word.toLowerCase()))
      .join(" ")
    steps.push({ label: "Remove stop words", value: text })
  }

  // Replace every run of non-[a-zA-Z0-9] with the separator, then trim runs at
  // the ends so the slug never starts or stops with the separator.
  text = text.replace(/[^a-zA-Z0-9]+/g, options.separator)
  steps.push({ label: "Replace non-alphanumeric", value: text })

  const edgeRun = new RegExp(`^\\${options.separator}+|\\${options.separator}+$`, "g")
  text = text.replace(edgeRun, "")
  steps.push({ label: "Trim separators", value: text })

  if (options.lowercase) {
    text = text.toLowerCase()
    steps.push({ label: "Lowercase", value: text })
  }

  if (options.maximumLength > 0 && text.length > options.maximumLength) {
    // Cut to the limit, then drop the dangling separator-run at the end so the
    // slug never ends on a separator or a partial word.
    let truncated = text.slice(0, options.maximumLength)
    const lastSeparator = truncated.lastIndexOf(options.separator)
    if (lastSeparator > 0) truncated = truncated.slice(0, lastSeparator)
    text = truncated
    steps.push({ label: `Truncate to ${options.maximumLength}`, value: text })
  }

  return { slug: text, steps }
}
