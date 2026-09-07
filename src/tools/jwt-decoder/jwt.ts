/**
 * Pure JWT decoding (no verification).
 *
 * A JWT's signature is checked by a verifier holding the key; this module only
 * decodes and displays the header/payload claims so they can be inspected.
 * The interface must never imply that a decoded token is trusted or valid.
 *
 * Upstream decoded with atob + a decodeURIComponent fallback (lossy for many
 * UTF-8 payloads) and formatted exp/iat with locale-dependent toLocaleString.
 * Here decoding goes through TextDecoder UTF-8, numeric claim types are
 * guarded, and dates render through locale-stable ISO formatting.
 */

export const maximumJwtLength = 8192

const base64UrlPattern = /^[A-Za-z0-9_-]+$/

export interface JwtClaims {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signatureBase64Url: string
  encodedHeader: string
  encodedPayload: string
}

export interface JwtParseResult {
  claims: JwtClaims | null
  message: string
}

/** Decodes one base64url segment into a UTF-8 string. */
export function decodeBase64Url(segment: string): string {
  const padded = segment.replaceAll("-", "+").replaceAll("_", "/")
  const remainder = padded.length % 4
  const normalized = remainder === 0 ? padded : padded + "=".repeat(4 - remainder)
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes)
}

function decodeJsonObject(segment: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(decodeBase64Url(segment)) as unknown
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null
    return value as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Splits and decodes a compact JWS token. Returns an error message instead of
 * throwing for every malformed case. Only the two-part unsecured form is out
 * of scope; tokens with a detached or empty signature still decode.
 */
export function parseJwt(token: string): JwtParseResult {
  const trimmed = token.trim()
  if (trimmed === "") return { claims: null, message: "" }
  if (trimmed.length > maximumJwtLength) {
    return { claims: null, message: "The token is too long to decode." }
  }
  if (/\s/.test(trimmed)) {
    return {
      claims: null,
      message: "The token contains whitespace. Paste the compact token without line breaks.",
    }
  }
  const parts = trimmed.split(".")
  if (parts.length !== 3) {
    return {
      claims: null,
      message: "A compact JWT has three dot-separated parts; this token has " + `${parts.length}.`,
    }
  }
  const [encodedHeader = "", encodedPayload = "", signature = ""] = parts
  for (const [name, segment] of [
    ["header", encodedHeader],
    ["payload", encodedPayload],
  ] as const) {
    if (segment === "") return { claims: null, message: `The ${name} part is empty.` }
    if (!base64UrlPattern.test(segment)) {
      return { claims: null, message: `The ${name} part is not valid base64url.` }
    }
  }
  if (signature !== "" && !base64UrlPattern.test(signature)) {
    return { claims: null, message: "The signature part is not valid base64url." }
  }
  const header = decodeJsonObject(encodedHeader)
  if (header === null) return { claims: null, message: "The header is not a JSON object." }
  const payload = decodeJsonObject(encodedPayload)
  if (payload === null) return { claims: null, message: "The payload is not a JSON object." }
  return {
    claims: {
      header,
      payload,
      signatureBase64Url: signature,
      encodedHeader,
      encodedPayload,
    },
    message: "",
  }
}

export interface NumericClaim {
  /** Raw value only when it was a finite number. */
  epochSeconds: number | null
  raw: unknown
}

/** Reads a numeric epoch-seconds claim, rejecting non-numbers and NaN. */
export function numericClaim(payload: Record<string, unknown>, name: string): NumericClaim {
  const raw: unknown = payload[name]
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { epochSeconds: raw, raw }
  }
  return { epochSeconds: null, raw }
}

export interface ExpiryState {
  label: string
  expired: boolean | null
}

/**
 * Expiry verdict against the device clock. `null` expiry means the claim is
 * absent or not a number, so no verdict can be given.
 */
export function expiryState(payload: Record<string, unknown>, nowMs: number): ExpiryState {
  const exp = numericClaim(payload, "exp")
  if (exp.epochSeconds === null) {
    return { label: "No numeric exp claim", expired: null }
  }
  const expired = exp.epochSeconds * 1000 < nowMs
  return { label: expired ? "Expired" : "Active", expired }
}

/** Locale-stable display of an epoch-seconds claim. */
export function formatEpochClaim(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1000)
  return `${date.toISOString().slice(0, 19).replaceAll("T", " ")} UTC` + ` (${epochSeconds})`
}
