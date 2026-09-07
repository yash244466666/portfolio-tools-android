/**
 * Pure case conversions for the Case Converter.
 *
 * Word-splitting is Unicode-aware (`\p{L}\p{N}` runs), so non-ASCII words survive
 * camel/Pascal/snake/kebab conversion instead of being dropped as the upstream
 * ASCII-only implementation did; that divergence is recorded in
 * `docs/SOURCE_PROVENANCE.md`. Nothing here touches React or platform services.
 */

export type CaseKind =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"

/** Input bound; eight conversions run per keystroke, so the input is rejected above it. */
export const maximumCaseChars = 100_000

export interface CaseConversion {
  id: CaseKind
  label: string
  convert: (text: string) => string
}

/** Unicode letter/digit runs are "words" for the identifier-style conversions. */
const wordPattern = /[\p{L}\p{N}]+/gu

function capitalize(word: string): string {
  // The /u flag makes the group capture a whole code point, so astral letters
  // (e.g. mathematical alphanumerics) are uppercased instead of a lone surrogate.
  return word.replace(/^(\p{L})([\s\S]*)$/u, (_match, first: string, rest: string) =>
    first.toUpperCase() + rest,
  )
}

function extractWords(text: string): string[] {
  return [...text.matchAll(wordPattern)].map((match) => match[0].toLowerCase())
}

function toTitleCase(text: string): string {
  // Split into whitespace separators and words, capitalizing the first letter of
  // each word while lowercasing the rest, so "don't" becomes "Don't" and leading
  // punctuation or quotes stay attached.
  return text
    .split(/(\s+)/u)
    .map((part) => {
      if (part.length === 0 || /^\s+$/u.test(part)) return part
      return part.replace(
        /^(\P{L}*)(\p{L})([\s\S]*)$/u,
        (_match, lead: string, first: string, rest: string) =>
          lead + first.toUpperCase() + rest.toLowerCase(),
      )
    })
    .join("")
}

function toSentenceCase(text: string): string {
  // Each punctuation-delimited segment gets its first letter capitalized and the
  // remainder lowercased; the capture group keeps the delimiters and odd indices
  // are the punctuation runs themselves. Leading whitespace and punctuation are
  // skipped before the first letter.
  return text
    .split(/([.!?]+)/u)
    .map((segment, index) => {
      if (index % 2 === 1) return segment
      return segment.replace(
        /^([\s\S]*?)(\p{L})([\s\S]*)$/u,
        (_match, lead: string, first: string, rest: string) =>
          lead + first.toUpperCase() + rest.toLowerCase(),
      )
    })
    .join("")
}

function toCamelCase(text: string): string {
  const words = extractWords(text)
  if (words.length === 0) return ""
  return words[0] + words.slice(1).map(capitalize).join("")
}

function toPascalCase(text: string): string {
  return extractWords(text).map(capitalize).join("")
}

export const caseConversions: readonly CaseConversion[] = [
  { id: "upper", label: "UPPERCASE", convert: (text) => text.toUpperCase() },
  { id: "lower", label: "lowercase", convert: (text) => text.toLowerCase() },
  { id: "title", label: "Title Case", convert: toTitleCase },
  { id: "sentence", label: "Sentence case", convert: toSentenceCase },
  { id: "camel", label: "camelCase", convert: toCamelCase },
  { id: "pascal", label: "PascalCase", convert: toPascalCase },
  {
    id: "snake",
    label: "snake_case",
    convert: (text) => extractWords(text).join("_"),
  },
  {
    id: "kebab",
    label: "kebab-case",
    convert: (text) => extractWords(text).join("-"),
  },
]