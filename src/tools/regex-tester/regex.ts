/**
 * Pure regular-expression evaluation for the Regex Tester tool.
 *
 * User patterns are hostile by default: a catastrophic pattern can block its execution
 * context indefinitely. This engine runs pattern evaluation with a soft time budget
 * checked between match iterations, but a single blocking `exec` call can still outrun
 * that budget, so the caller must run this code inside a terminable Worker with its own
 * wall-clock deadline (see `regex-worker.ts` and `regex-client.ts`).
 */

/** Pattern source is bounded so compile cost stays within the interaction budget. */
export const maximumPatternLength = 512

/** Test strings are bounded by UTF-8 bytes, matching the other text tools. */
export const maximumInputBytes = 128 * 1024

/** Match collection stops at this count so a global pattern cannot grow without bound. */
export const maximumMatchCount = 1000

/** Soft per-execution time budget checked between match iterations. */
export const engineTimeBudgetMs = 750

/** Narrow flag allowlist; anything outside this set is rejected before compilation. */
const allowedFlagCharacters = "dgimsuvy"

export interface RegexMatch {
  text: string
  index: number
  groups: (string | undefined)[]
}

export type RegexRunResult =
  | { status: "ok"; matches: RegexMatch[]; truncated: boolean }
  | { status: "invalid"; message: string }
  | { status: "over-limit"; message: string }
  | { status: "timeout" }
  | { status: "cancelled" }
  | { status: "unsupported" }

export interface RegexExecutionRequest {
  pattern: string
  flags: string
  input: string
  /** Overrides `engineTimeBudgetMs` for deterministic tests. */
  budgetMs?: number
}

/** Message the UI thread posts into the evaluation Worker. */
export interface RegexWorkerRequest {
  id: number
  pattern: string
  flags: string
  input: string
}

/** Message the evaluation Worker posts back; `id` guards against stale responses. */
export interface RegexWorkerResponse {
  id: number
  result: RegexRunResult
}

function truncate(message: string, limit: number): string {
  return message.length <= limit ? message : `${message.slice(0, limit)}…`
}

export function isValidRegexInputSize(input: string): boolean {
  return new TextEncoder().encode(input).byteLength <= maximumInputBytes
}

/**
 * Evaluates a user pattern against the test string under explicit limits. All failure
 * modes are typed values, never thrown exceptions, so the Worker boundary stays
 * structured and the UI can render a recovery state for each one.
 */
export function runRegex(
  request: RegexExecutionRequest,
  now: () => number = Date.now,
): RegexRunResult {
  if (request.pattern.length > maximumPatternLength) {
    return {
      status: "over-limit",
      message: `Patterns are limited to ${maximumPatternLength} characters. Shorten the pattern.`,
    }
  }
  if (!isValidRegexInputSize(request.input)) {
    return {
      status: "over-limit",
      message: `Test strings are limited to ${Math.round(maximumInputBytes / 1024)} KiB. Shorten the text.`,
    }
  }
  for (const character of request.flags) {
    if (!allowedFlagCharacters.includes(character)) {
      return {
        status: "invalid",
        message: `Flags may only contain ${allowedFlagCharacters.split("").join(", ")}.`,
      }
    }
  }

  let regex: RegExp
  try {
    regex = new RegExp(request.pattern, request.flags)
  } catch (error) {
    // The message can echo the user's own pattern; it is displayed to that same user
    // and never logged.
    const message =
      error instanceof Error && error.message
        ? truncate(error.message, 200)
        : "The pattern could not be compiled."
    return { status: "invalid", message }
  }

  const deadline = now() + (request.budgetMs ?? engineTimeBudgetMs)
  const matches: RegexMatch[] = []
  let truncated = false

  try {
    if (regex.global) {
      let match: RegExpExecArray | null
      while ((match = regex.exec(request.input)) !== null) {
        if (now() >= deadline) return { status: "timeout" }
        matches.push({ text: match[0], index: match.index, groups: match.slice(1) })
        if (matches.length >= maximumMatchCount) {
          truncated = true
          break
        }
        // Zero-width matches must advance or the loop never terminates.
        if (match[0] === "") regex.lastIndex++
        if (regex.lastIndex > request.input.length) break
      }
    } else {
      const match = regex.exec(request.input)
      if (match) matches.push({ text: match[0], index: match.index, groups: match.slice(1) })
    }
  } catch {
    // Some engines throw on runtime-only failures (for example lookbehind or property
    // escapes unsupported by an older WebView); surface them as invalid input.
    return { status: "invalid", message: "The pattern could not be evaluated on this device." }
  }

  return { status: "ok", matches, truncated }
}

export interface RegexHighlightSegment {
  text: string
  highlighted: boolean
}

/**
 * Builds the highlighted preview segments from the same match list the UI displays, so
 * the preview and the match table can never disagree. Zero-width matches highlight
 * nothing. The match count is already capped, so the segment count stays bounded.
 */
export function buildHighlightedSegments(
  input: string,
  matches: readonly RegexMatch[],
): RegexHighlightSegment[] {
  const segments: RegexHighlightSegment[] = []
  let cursor = 0
  for (const match of matches) {
    if (match.text.length === 0 || match.index < cursor) continue
    if (match.index > cursor) {
      segments.push({ text: input.slice(cursor, match.index), highlighted: false })
    }
    segments.push({ text: match.text, highlighted: true })
    cursor = match.index + match.text.length
  }
  if (cursor < input.length) {
    segments.push({ text: input.slice(cursor), highlighted: false })
  }
  return segments
}
