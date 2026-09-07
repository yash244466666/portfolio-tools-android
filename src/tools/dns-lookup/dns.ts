/**
 * Pure model for the DNS Lookup tool.
 *
 * The provider is the Cloudflare DNS-over-HTTPS JSON API (pre-approved in the
 * implementation plan). This module owns the single schema gate for provider
 * responses, client-side hostname validation (the provider silently accepts an
 * empty name), record-type naming, and rcode descriptions. Nothing here touches
 * the network, React, or platform services.
 */

export const providerName = "Cloudflare"
export const providerHomepage = "https://one.one.one.one"
export const apiOrigin = "https://cloudflare-dns.com"
export const requestTimeoutMs = 15_000

/** Upper bound on a provider response body before it may be parsed as JSON. */
export const maximumResponseChars = 131_072
/** Upper bound on how many answer records are kept and displayed. */
export const maximumRecords = 64
/** RFC 1035 keeps a fully qualified domain name within 253 presentation octets. */
export const maximumDomainLength = 253

export const recordTypes = ["A", "AAAA", "CNAME", "MX", "NS", "TXT"] as const
export type RecordTypeName = (typeof recordTypes)[number]

const recordTypeSet: ReadonlySet<string> = new Set(recordTypes)

export interface DnsRecord {
  name: string
  type: number
  TTL: number
  data: string
}

export type DnsParseResult =
  | { status: "ok"; records: DnsRecord[] }
  | { status: "dns-error"; rcode: number }
  | { status: "no-record" }
  | { status: "malformed" }

/** Common rtype mnemonics for display; unknown numbers render as TYPE{n}. */
const wellKnownTypeNames: Record<number, string> = {
  1: "A",
  2: "NS",
  5: "CNAME",
  6: "SOA",
  12: "PTR",
  15: "MX",
  16: "TXT",
  28: "AAAA",
  33: "SRV",
  39: "DNAME",
  43: "DS",
  46: "RRSIG",
  47: "NSEC",
  48: "DNSKEY",
  51: "NSEC3",
  64: "SVCB",
  65: "HTTPS",
  99: "SPF",
  255: "ANY",
  257: "CAA",
}

export function recordTypeLabel(typeNumber: number): string {
  if (!Number.isInteger(typeNumber) || typeNumber < 0) return "UNKNOWN"
  return wellKnownTypeNames[typeNumber] ?? `TYPE${typeNumber}`
}

/**
 * Friendly descriptions of the DNS response codes a resolver can report. The
 * provider returns these in the `Status` field, not as HTTP errors.
 */
export function describeRcode(rcode: number): string {
  const descriptions: Record<number, string> = {
    0: "No error.",
    1: "The resolver could not parse the query (FORMERR).",
    2: "The resolver could not process the query (SERVFAIL). Try again in a moment.",
    3: "The domain does not exist (NXDOMAIN). Check the spelling.",
    4: "The resolver does not implement this query type (NOTIMP).",
    5: "The resolver refused the query (REFUSED).",
    6: "The name exists when it should not (YXDOMAIN).",
    7: "The record set exists when it should not (YXRRSET).",
    8: "The record set that should exist does not (NXRRSET).",
    9: "The server is not authoritative for this zone (NOTAUTH).",
    10: "The name is not in the queried zone (NOTZONE).",
    11: "The resolver returned a bad OPT version (BADVERS).",
  }
  if (!Number.isInteger(rcode) || rcode < 0 || rcode > 15) {
    return `The resolver reported DNS error code ${rcode}.`
  }
  return descriptions[rcode] ?? `The resolver reported DNS error code ${rcode}.`
}

/** Presentation rules for one DNS label: 1–63 chars, starts/ends on a letter, digit, or underscore; hyphens only inside. */
const labelPattern = /^[A-Za-z0-9_](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?$/

/**
 * Validates and normalizes a user-entered domain name. Accepts underscore-prefixed
 * service labels (for example `_dmarc.example.com`) and one trailing dot, and rejects
 * empty input, embedded whitespace or punctuation, oversized names, and empty labels.
 * Returns the normalized name, or a short reason the user can act on.
 */
export function validateDomainName(
  input: string,
): { status: "ok"; value: string } | { status: "invalid"; reason: string } {
  const trimmed = input.trim().replace(/\.$/, "")
  if (trimmed.length === 0) {
    return { status: "invalid", reason: "Enter a domain name to look up." }
  }
  if (/\s/.test(trimmed)) {
    return { status: "invalid", reason: "Domain names cannot contain spaces." }
  }
  if (trimmed.length > maximumDomainLength) {
    return {
      status: "invalid",
      reason: `Domain names are limited to ${maximumDomainLength} characters.`,
    }
  }
  const labels = trimmed.split(".")
  for (const label of labels) {
    if (!labelPattern.test(label)) {
      return {
        status: "invalid",
        reason:
          "Each part of the name must be 1–63 letters, digits, underscores, or inner hyphens.",
      }
    }
  }
  return { status: "ok", value: trimmed }
}

/** Builds the HTTPS-only exact-origin DoH query URL. Throws on unvalidated input. */
export function buildQueryUrl(name: string, type: RecordTypeName): URL {
  if (!recordTypeSet.has(type)) {
    throw new RangeError(`Unsupported record type: ${type}`)
  }
  const validated = validateDomainName(name)
  if (validated.status === "invalid") {
    throw new RangeError(validated.reason)
  }
  const url = new URL(`${apiOrigin}/dns-query`)
  url.searchParams.set("name", validated.value)
  url.searchParams.set("type", type)
  return url
}

function isRecordRow(row: unknown): row is DnsRecord {
  if (typeof row !== "object" || row === null) return false
  const record = row as Record<string, unknown>
  return (
    typeof record.name === "string" &&
    record.name.length > 0 &&
    typeof record.type === "number" &&
    Number.isInteger(record.type) &&
    typeof record.TTL === "number" &&
    Number.isInteger(record.TTL) &&
    record.TTL >= 0 &&
    typeof record.data === "string"
  )
}

/**
 * Single schema gate for the provider body. Rows that fail validation are dropped
 * rather than trusted, answers are capped, and a body with the wrong shape is
 * malformed instead of partially displayed.
 */
export function parseDnsResponse(raw: unknown): DnsParseResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { status: "malformed" }
  }
  const body = raw as Record<string, unknown>
  const status = body["Status"]
  if (typeof status !== "number" || !Number.isInteger(status) || status < 0) {
    return { status: "malformed" }
  }
  if (status !== 0) {
    return { status: "dns-error", rcode: status }
  }
  const answers = body["Answer"]
  if (answers === undefined) return { status: "no-record" }
  if (!Array.isArray(answers)) return { status: "malformed" }
  const records: DnsRecord[] = []
  for (const row of answers) {
    if (isRecordRow(row))
      records.push({ name: row.name, type: row.type, TTL: row.TTL, data: row.data })
    if (records.length >= maximumRecords) break
  }
  if (records.length === 0) return { status: "no-record" }
  return { status: "ok", records }
}

/** Tab-separated copy text: one line per record, name/type/TTL/data. */
export function formatRecordsForCopy(records: readonly DnsRecord[]): string {
  return records
    .map(
      (record) => `${record.name}\t${recordTypeLabel(record.type)}\t${record.TTL}\t${record.data}`,
    )
    .join("\n")
}
