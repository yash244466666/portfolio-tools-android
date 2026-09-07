/**
 * Pure URL percent-encoding/decoding and URL-part breakdown for the URL
 * Encoder/Decoder. Decoding failures are typed instead of the upstream's error
 * message being used as a result string. Nothing here touches React or
 * platform services.
 */

export const maximumUrlChars = 100_000

export type EncodeOutcome = { status: "ok"; value: string } | { status: "too-long" }

export type DecodeOutcome =
  { status: "ok"; value: string } | { status: "invalid-escape" } | { status: "too-long" }

/** Percent-encodes with `encodeURIComponent` semantics. */
export function encodeUrlComponent(text: string): EncodeOutcome {
  if (text.length > maximumUrlChars) return { status: "too-long" }
  return { status: "ok", value: encodeURIComponent(text) }
}

/** Percent-decodes; malformed escape sequences are a typed failure. */
export function decodeUrlComponent(text: string): DecodeOutcome {
  if (text.length > maximumUrlChars) return { status: "too-long" }
  try {
    return { status: "ok", value: decodeURIComponent(text) }
  } catch {
    return { status: "invalid-escape" }
  }
}

export interface UrlParts {
  protocol: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
}

export type ParseUrlOutcome =
  | { status: "ok"; parts: UrlParts; assumedHttps: boolean }
  | { status: "invalid-url" }
  | { status: "too-long" }

/**
 * Breaks a URL into its parts. A scheme-less input is retried with an assumed
 * `https://` and that assumption is reported so the UI can disclose it; the
 * upstream silently prefixed without saying so.
 */
export function parseUrlParts(input: string): ParseUrlOutcome {
  if (input.length > maximumUrlChars) return { status: "too-long" }
  let parsed: URL | undefined
  let assumedHttps = false
  try {
    parsed = new URL(input)
  } catch {
    if (/^[a-z][a-z0-9+.-]*:/i.test(input)) {
      // Has a scheme that failed to parse (or an invalid scheme) — genuinely invalid.
      return { status: "invalid-url" }
    }
    try {
      parsed = new URL(`https://${input}`)
      assumedHttps = true
    } catch {
      return { status: "invalid-url" }
    }
  }
  if (!parsed) return { status: "invalid-url" }
  return {
    status: "ok",
    assumedHttps,
    parts: {
      protocol: parsed.protocol.replace(/:$/, ""),
      hostname: parsed.hostname,
      port: parsed.port === "" ? "(default)" : parsed.port,
      pathname: parsed.pathname === "" ? "/" : parsed.pathname,
      search: parsed.search === "" ? "(none)" : parsed.search,
      hash: parsed.hash === "" ? "(none)" : parsed.hash,
    },
  }
}
