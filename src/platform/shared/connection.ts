import {
  connectionTransports,
  type ConnectionDetails,
  type ConnectionTransport,
  type TrafficCounters,
} from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"

/** Version of the app-owned `NetworkDiagnostics` bridge contract. */
export const connectionContractVersion = 1

export const maximumConnectionAddresses = 8
export const maximumConnectionAddressLength = 128

const transports = new Set<string>(connectionTransports)

/**
 * Converts one bridge value into display-safe text: control characters,
 * line/paragraph separators, and bidi embedding/override/isolate controls are
 * removed rather than rendered, and the result is length-bounded. The raw
 * string is never logged.
 */
function isDisplayUnsafe(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x061c ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  )
}

export function sanitizeConnectionText(value: string): string {
  let cleaned = ""
  for (const character of value) {
    const codePoint = character.codePointAt(0)
    if (codePoint !== undefined && !isDisplayUnsafe(codePoint)) cleaned += character
  }
  return cleaned.trim().slice(0, maximumConnectionAddressLength)
}

function boundedAddresses(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map(sanitizeConnectionText)
    .filter((entry) => entry.length > 0)
    .slice(0, maximumConnectionAddresses)
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function nullableBoundedInteger(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null
}

function transport(value: unknown): ConnectionTransport {
  return typeof value === "string" && transports.has(value)
    ? (value as ConnectionTransport)
    : "other"
}

function malformed(): PlatformError {
  return new PlatformError(
    "NETWORK_DIAGNOSTICS_UNAVAILABLE",
    "The network diagnostics bridge returned an invalid result.",
  )
}

/**
 * Validates the native connection snapshot. A wrong contract version or a
 * payload that is not an object is a bridge defect and is rejected; individual
 * optional fields degrade to "unknown" instead of failing the whole view.
 */
export function normalizeConnectionDetails(raw: unknown): ConnectionDetails {
  if (typeof raw !== "object" || raw === null) throw malformed()
  const record = raw as Record<string, unknown>
  if (record.contractVersion !== connectionContractVersion) throw malformed()

  return {
    transport: transport(record.transport),
    metered: nullableBoolean(record.metered),
    validated: nullableBoolean(record.validated),
    internetCapable: nullableBoolean(record.internetCapable),
    vpn: record.vpn === true,
    linkDownKbps: nullableBoundedInteger(record.linkDownKbps, 0, 1_000_000_000),
    linkUpKbps: nullableBoundedInteger(record.linkUpKbps, 0, 1_000_000_000),
    effectiveType:
      typeof record.effectiveType === "string"
        ? sanitizeConnectionText(record.effectiveType).slice(0, 16) || null
        : null,
    roundTripTimeMs: nullableBoundedInteger(record.roundTripTimeMs, 0, 600_000),
    interfaceName:
      typeof record.interfaceName === "string"
        ? sanitizeConnectionText(record.interfaceName) || null
        : null,
    localAddresses: boundedAddresses(record.localAddresses),
    dnsServers: boundedAddresses(record.dnsServers),
    mtu: nullableBoundedInteger(record.mtu, 0, 65_535),
    signalStrength: nullableBoundedInteger(record.signalStrength, -200, 200),
  }
}

/**
 * Validates device-wide traffic counters. `supported: false` is a legitimate
 * platform state; a supported payload must carry non-negative counters and a
 * positive monotonic timestamp, because a rate derived from anything else
 * would be fabricated.
 */
export function normalizeTrafficCounters(raw: unknown): TrafficCounters {
  if (typeof raw !== "object" || raw === null) throw malformed()
  const record = raw as Record<string, unknown>
  if (record.contractVersion !== connectionContractVersion) throw malformed()
  if (record.supported !== true) {
    return { supported: false, rxBytes: null, txBytes: null, elapsedRealtimeMs: null }
  }

  const rxBytes = record.rxBytes
  const txBytes = record.txBytes
  const elapsedRealtimeMs = record.elapsedRealtimeMs
  if (
    typeof rxBytes !== "number" ||
    !Number.isSafeInteger(rxBytes) ||
    rxBytes < 0 ||
    typeof txBytes !== "number" ||
    !Number.isSafeInteger(txBytes) ||
    txBytes < 0 ||
    typeof elapsedRealtimeMs !== "number" ||
    !Number.isSafeInteger(elapsedRealtimeMs) ||
    elapsedRealtimeMs <= 0
  ) {
    throw malformed()
  }

  return {
    supported: true,
    rxBytes,
    txBytes,
    elapsedRealtimeMs,
  }
}
