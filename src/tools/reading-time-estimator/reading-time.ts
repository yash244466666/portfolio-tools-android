/**
 * Pure reading-time estimation for the Reading Time Estimator. Original work
 * for this repository; no upstream code is copied.
 */
import { parseBoundedDecimal, type BoundedParseResult } from "@/tools/_shared/bounded-parse"
import { countWords as countWordsInText } from "@/tools/_shared/word-tokenizer"

export const maximumInputCharacters = 100_000
export const minimumWordsPerMinute = 100
export const maximumWordsPerMinute = 500
export const defaultWordsPerMinute = 200

/** The editable post-budget slots; caps are fully user-editable numbers. */
export interface BudgetSlot {
  key: string
  label: string
  defaultCap: number
}

export const budgetSlots: readonly BudgetSlot[] = [
  { key: "seo", label: "SEO description", defaultCap: 160 },
  { key: "summary", label: "Summary", defaultCap: 500 },
  { key: "post", label: "Post", defaultCap: 3000 },
]

/** Counts words through the shared Unicode tokenizer (with invariant folding). */
export function countWords(text: string): number {
  return countWordsInText(text)
}

/** Parses a words-per-minute value clamped into 100-500; null when invalid. */
export function parseWordsPerMinute(value: string): number | null {
  return (
    parseBoundedDecimal(value, {
      minimum: minimumWordsPerMinute,
      maximum: maximumWordsPerMinute,
    })?.value ?? null
  )
}

/** Parses a budget cap clamped into 1-1,000,000 characters; null when invalid. */
export function parseBudgetCap(value: string): BoundedParseResult | null {
  return parseBoundedDecimal(value, { minimum: 1, maximum: 1_000_000 })
}

/** Trims the textarea value to the standard input cap. */
export function clampInputText(text: string): string {
  return text.length > maximumInputCharacters ? text.slice(0, maximumInputCharacters) : text
}

export interface ReadingTime {
  minutes: number
  seconds: number
  /** Total seconds, for comparisons. */
  totalSeconds: number
}

/** Whole seconds of reading time for `words` at the given rate. */
export function readingSeconds(words: number, wordsPerMinute: number): number {
  if (words <= 0 || wordsPerMinute <= 0) return 0
  return Math.round((words / wordsPerMinute) * 60)
}

/** Splits whole seconds into a minutes + seconds pair. */
export function splitMinutesSeconds(totalSeconds: number): ReadingTime {
  const safe = Math.max(0, Math.round(totalSeconds))
  return {
    minutes: Math.floor(safe / 60),
    seconds: safe % 60,
    totalSeconds: safe,
  }
}

export interface BudgetOutcome {
  key: string
  label: string
  cap: number
  fits: boolean
  /** How many characters the text is over the cap; 0 when it fits. */
  overBy: number
}

/** Evaluates the character count against each editable budget cap. */
export function evaluateBudgets(
  characterCount: number,
  budgets: ReadonlyArray<{ key: string; label: string; cap: number }>,
): BudgetOutcome[] {
  return budgets.map(({ key, label, cap }) => ({
    key,
    label,
    cap,
    fits: characterCount <= cap,
    overBy: Math.max(0, characterCount - cap),
  }))
}

/** Formats the reading time as "4 min 30 s" (or "45 s" under a minute). */
export function formatReadingTime(time: ReadingTime): string {
  if (time.minutes === 0) return `${time.seconds} s`
  return `${time.minutes} min ${time.seconds} s`
}
