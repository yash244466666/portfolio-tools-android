/**
 * DNS-over-HTTPS fetching for the DNS Lookup tool.
 *
 * Network rules enforced here, once, for the tool: HTTPS-only exact origin (the
 * CSP `connect-src` allowlist is the second layer), a hard request timeout via
 * `AbortController`, a bounded response body before JSON parsing, and provider
 * failures mapped to typed outcomes instead of thrown strings. The body never
 * reaches React unvalidated — `parseDnsResponse` is the single schema gate.
 */

import {
  buildQueryUrl,
  maximumResponseChars,
  parseDnsResponse,
  requestTimeoutMs,
  type DnsParseResult,
  type DnsRecord,
  type RecordTypeName,
} from "./dns"

export type LookupOutcome =
  | { status: "ok"; records: DnsRecord[] }
  | { status: "no-record" }
  | { status: "dns-error"; rcode: number }
  /** The provider rejected the query name or type with HTTP 400. */
  | { status: "invalid-query" }
  | { status: "offline" }
  | { status: "timeout" }
  | { status: "rate-limited" }
  | { status: "provider-failure" }
  | { status: "malformed" }
  | { status: "cancelled" }

/** Minimal fetch surface; tests inject a fake with the same shape. */
export type FetchLike = (input: URL, init: RequestInit) => Promise<Response>

function defaultFetch(): FetchLike | null {
  return typeof fetch === "function" ? fetch : null
}

export interface LookupOptions {
  name: string
  type: RecordTypeName
  signal?: AbortSignal
  fetchImpl?: FetchLike
}

/**
 * Runs one DoH lookup. Every terminal state settles exactly once: HTTP 429 is
 * reported distinctly so the UI can ask the user to retry later, the provider's
 * HTTP 400 for an invalid name or type is its own outcome, an aborted signal is
 * cancellation, and a body that is too large or fails schema validation is
 * malformed rather than trusted.
 */
export async function fetchDnsRecords(options: LookupOptions): Promise<LookupOutcome> {
  const doFetch = options.fetchImpl ?? defaultFetch()
  if (!doFetch) return { status: "offline" }

  let url: URL
  try {
    url = buildQueryUrl(options.name, options.type)
  } catch {
    return { status: "invalid-query" }
  }

  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), requestTimeoutMs)
  const onOuterAbort = () => timeoutController.abort()
  options.signal?.addEventListener("abort", onOuterAbort, { once: true })

  try {
    let response: Response
    try {
      response = await doFetch(url, {
        method: "GET",
        headers: { accept: "application/dns-json" },
        signal: timeoutController.signal,
      })
    } catch (fetchError) {
      if (options.signal?.aborted) return { status: "cancelled" }
      if (isAbortLike(fetchError)) return { status: "timeout" }
      return { status: "offline" }
    }

    if (options.signal?.aborted) return { status: "cancelled" }
    if (response.status === 429) return { status: "rate-limited" }
    // The provider answers invalid query names and types with HTTP 400.
    if (response.status === 400) return { status: "invalid-query" }
    if (!response.ok) return { status: "provider-failure" }

    let bodyText: string
    try {
      bodyText = await response.text()
    } catch {
      return { status: "malformed" }
    }
    if (options.signal?.aborted) return { status: "cancelled" }
    // Character count bounds the parse; characters are never more than bytes in
    // UTF-8, so this is a conservative (strict) approximation of a byte cap.
    if (bodyText.length > maximumResponseChars) return { status: "malformed" }

    let body: unknown
    try {
      body = JSON.parse(bodyText)
    } catch {
      return { status: "malformed" }
    }
    if (options.signal?.aborted) return { status: "cancelled" }

    const parsed: DnsParseResult = parseDnsResponse(body)
    if (parsed.status === "ok") return { status: "ok", records: parsed.records }
    return parsed
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
