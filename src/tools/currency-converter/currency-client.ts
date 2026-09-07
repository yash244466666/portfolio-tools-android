/**
 * Rate fetching for the Currency Converter.
 *
 * The network rules from the implementation plan are enforced here, once, for the tool:
 * HTTPS-only exact origin (the CSP `connect-src` allowlist is the second layer), a hard
 * request timeout via `AbortController`, bounded JSON parsing, and provider failures
 * mapped to typed outcomes instead of thrown strings. The response body never reaches
 * React unvalidated — `parseRatesResponse` is the single schema gate.
 */

import {
  buildRatesUrl,
  parseRatesResponse,
  requestTimeoutMs,
  type CachedBaseRates,
  type RatesParseResult,
} from "./currency"

export type RatesFetchOutcome =
  | { status: "ok"; entry: CachedBaseRates }
  | { status: "offline" }
  | { status: "timeout" }
  | { status: "rate-limited" }
  | { status: "provider-failure" }
  | { status: "malformed" }
  | { status: "no-record" }
  | { status: "cancelled" }

/** Minimal fetch surface; tests inject a fake with the same shape. */
export type FetchLike = (input: URL, init: RequestInit) => Promise<Response>

function defaultFetch(): FetchLike | null {
  return typeof fetch === "function" ? fetch : null
}

export interface RatesFetchOptions {
  base: string
  nowMs: number
  signal?: AbortSignal
  fetchImpl?: FetchLike
}

/**
 * Fetches one base's rate table. Every terminal state settles exactly once: HTTP 429 is
 * reported distinctly so the UI can ask the user to retry later, other non-OK statuses
 * are provider failures, an aborted signal is cancellation, and a response whose JSON
 * fails schema validation is malformed rather than trusted.
 */
export async function fetchBaseRates(options: RatesFetchOptions): Promise<RatesFetchOutcome> {
  const doFetch = options.fetchImpl ?? defaultFetch()
  if (!doFetch) return { status: "offline" }

  let url: URL
  try {
    url = buildRatesUrl(options.base)
  } catch {
    return { status: "provider-failure" }
  }

  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), requestTimeoutMs)
  const onOuterAbort = () => timeoutController.abort()
  options.signal?.addEventListener("abort", onOuterAbort, { once: true })

  try {
    let response: Response
    try {
      response = await doFetch(url, { method: "GET", signal: timeoutController.signal })
    } catch (fetchError) {
      if (options.signal?.aborted) return { status: "cancelled" }
      if (isAbortLike(fetchError)) return { status: "timeout" }
      return { status: "offline" }
    }

    if (options.signal?.aborted) return { status: "cancelled" }
    if (response.status === 429) return { status: "rate-limited" }
    if (!response.ok) return { status: "provider-failure" }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      return { status: "malformed" }
    }
    if (options.signal?.aborted) return { status: "cancelled" }

    const parsed: RatesParseResult = parseRatesResponse(body, options.base)
    if (parsed.status !== "ok") return parsed
    return {
      status: "ok",
      entry: {
        base: parsed.base,
        quotes: parsed.quotes,
        fetchedAtMs: options.nowMs,
      },
    }
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener("abort", onOuterAbort)
  }
}

function isAbortLike(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError" || error.name === "TimeoutError"
    : error instanceof Error && error.name === "AbortError"
}