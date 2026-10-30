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
  maximumRatesResponseBytes,
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
      body = await readBoundedJson(response)
    } catch {
      if (options.signal?.aborted) return { status: "cancelled" }
      if (timeoutController.signal.aborted) return { status: "timeout" }
      return { status: "malformed" }
    }
    if (body === null) return { status: "malformed" }
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

/**
 * Reads and parses a JSON body without ever buffering more than the documented
 * cap. `Content-Length` is checked first when present; the stream reader is the
 * authoritative bound because a provider may omit the header or lie about it.
 * Test doubles that only implement `json()` take the fallback path.
 */
async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = (response as { headers?: Headers }).headers?.get("content-length")
  if (declaredLength !== null && declaredLength !== undefined) {
    const declared = Number(declaredLength)
    if (!Number.isFinite(declared) || declared > maximumRatesResponseBytes) return null
  }

  if (typeof response.body?.getReader !== "function") {
    return response.json()
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maximumRatesResponseBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

function isAbortLike(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError" || error.name === "TimeoutError"
    : error instanceof Error && error.name === "AbortError"
}
