export const defaultMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"] as const
export const defaultHeaders = ["Content-Type", "Authorization", "X-Requested-With"] as const

export const maximumMaxAgeSeconds = 86_400
export const maximumCustomEntries = 20
export const maximumOriginChars = 200

export interface CorsHeaderEntry {
  key: string
  value: string
}

/**
 * Builds the Access-Control header set. The upstream emitted
 * `Access-Control-Max-Age: 0` for blank input, which disables the preflight
 * cache; here a blank Max-Age field simply omits the header, and a wildcard
 * origin with credentials is flagged because browsers reject that pair.
 */
export function buildCorsHeaders(input: {
  allowOrigin: string
  selectedMethods: readonly string[]
  customMethods: string
  selectedHeaders: readonly string[]
  customHeaders: string
  maxAge: string
  allowCredentials: boolean
}): { headers: CorsHeaderEntry[]; warnings: string[] } {
  const warnings: string[] = []
  const headers: CorsHeaderEntry[] = []

  const origin = input.allowOrigin.trim() || "*"
  headers.push({ key: "Access-Control-Allow-Origin", value: origin })

  const methods = joinTokens(input.selectedMethods, input.customMethods)
  if (methods) headers.push({ key: "Access-Control-Allow-Methods", value: methods })

  const requestHeaders = joinTokens(input.selectedHeaders, input.customHeaders)
  if (requestHeaders) headers.push({ key: "Access-Control-Allow-Headers", value: requestHeaders })

  const maxAge = parseMaxAge(input.maxAge)
  if (maxAge !== null) headers.push({ key: "Access-Control-Max-Age", value: String(maxAge) })

  if (input.allowCredentials) {
    headers.push({ key: "Access-Control-Allow-Credentials", value: "true" })
    if (origin === "*") {
      warnings.push(
        "Browsers reject a wildcard origin together with credentials; list explicit origins instead.",
      )
    }
  }

  return { headers, warnings }
}

export function fullHeaderText(headers: readonly CorsHeaderEntry[]): string {
  return headers.map((header) => `${header.key}: ${header.value}`).join("\n")
}

/** Parses Max-Age as a whole non-negative second value; null when absent/invalid. */
export function parseMaxAge(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value) || value > maximumMaxAgeSeconds) return null
  return value
}

function joinTokens(selected: readonly string[], custom: string): string {
  const tokens = [
    ...selected,
    ...custom
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean),
  ]
  return tokens.join(", ")
}
