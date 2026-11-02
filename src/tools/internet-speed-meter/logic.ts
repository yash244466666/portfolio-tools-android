import type { ConnectionDetails, ConnectionTransport } from "@/platform/contracts"

/** How often the live meter samples device-wide counters while visible. */
export const meterIntervalMs = 1_000
/** A gap longer than this is treated as a discontinuity, not a burst of traffic. */
export const maximumMeterGapMs = 10_000
/** At most this many samples are kept for the in-memory sparkline. */
export const maximumMeterSamples = 30

export interface TrafficSample {
  rxBytes: number
  txBytes: number
  elapsedRealtimeMs: number
}

export interface WireRates {
  downloadBitsPerSecond: number | null
  uploadBitsPerSecond: number | null
}

const noRates: WireRates = { downloadBitsPerSecond: null, uploadBitsPerSecond: null }

/**
 * Derives current wire rates from two monotonic counter samples. Counter resets
 * (reboot/interface change) and sampling gaps produce "unknown" rather than a
 * negative or wildly inflated rate; no value is ever fabricated.
 */
export function ratesFromCounters(previous: TrafficSample, current: TrafficSample): WireRates {
  const elapsedMs = current.elapsedRealtimeMs - previous.elapsedRealtimeMs
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > maximumMeterGapMs) {
    return noRates
  }

  const rxDelta = current.rxBytes - previous.rxBytes
  const txDelta = current.txBytes - previous.txBytes
  if (!Number.isFinite(rxDelta) || !Number.isFinite(txDelta) || rxDelta < 0 || txDelta < 0) {
    return noRates
  }

  const download = (rxDelta * 8 * 1000) / elapsedMs
  const upload = (txDelta * 8 * 1000) / elapsedMs
  if (!Number.isFinite(download) || !Number.isFinite(upload)) return noRates
  return { downloadBitsPerSecond: download, uploadBitsPerSecond: upload }
}

function trimmedFixed(value: number, digits: number): string {
  const fixed = value.toFixed(digits)
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed
}

/** Formats bits per second with an explicit unit; null is an honest "—". */
export function formatBitsPerSecond(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—"
  if (value >= 1_000_000_000) return `${trimmedFixed(value / 1_000_000_000, 2)} Gbps`
  if (value >= 1_000_000) return `${trimmedFixed(value / 1_000_000, 2)} Mbps`
  if (value >= 1_000) return `${trimmedFixed(value / 1_000, 1)} kbps`
  return `${Math.round(value)} bps`
}

/** Formats a byte count for data-use and counter displays. */
export function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—"
  if (value >= 1024 ** 3) return `${trimmedFixed(value / 1024 ** 3, 2)} GiB`
  if (value >= 1024 ** 2) return `${trimmedFixed(value / 1024 ** 2, 2)} MiB`
  if (value >= 1024) return `${trimmedFixed(value / 1024, 1)} KiB`
  return `${Math.round(value)} B`
}

/** Median of a non-empty sample; even counts average the middle pair. */
export function median(values: readonly number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (finite.length === 0) return null
  const middle = Math.floor(finite.length / 2)
  return finite.length % 2 === 1 ? finite[middle]! : (finite[middle - 1]! + finite[middle]!) / 2
}

/** Mean absolute difference between consecutive samples (RFC 3550-style jitter). */
export function jitter(values: readonly number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value))
  if (finite.length < 2) return null
  let total = 0
  for (let index = 1; index < finite.length; index += 1) {
    total += Math.abs(finite[index]! - finite[index - 1]!)
  }
  return total / (finite.length - 1)
}

/** Bits per second converted to megabits per second; null for invalid input. */
export function megabitsPerSecond(bytes: number, elapsedMs: number): number | null {
  if (!Number.isFinite(bytes) || bytes < 0 || !Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return null
  }
  const value = (bytes * 8) / (elapsedMs * 1000)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export function formatLatency(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—"
  return value >= 100 ? `${Math.round(value)} ms` : `${trimmedFixed(value, 1)} ms`
}

export function transportLabel(transport: ConnectionTransport): string {
  switch (transport) {
    case "wifi":
      return "Wi-Fi"
    case "cellular":
      return "Cellular"
    case "ethernet":
      return "Ethernet"
    case "vpn":
      return "VPN"
    case "bluetooth":
      return "Bluetooth tethering"
    case "none":
      return "No active network"
    default:
      return "Other / unknown"
  }
}

export function connectionStateLabel(details: ConnectionDetails | null): string {
  if (details === null) return "Checking the active network…"
  if (details.transport === "none") return "No active network."
  if (details.validated === false)
    return "Connected, but the network has not validated internet access."
  if (details.internetCapable === false) return "Connected without declared internet capability."
  if (details.validated === true) return "Connected and validated for internet access."
  return "Connected; internet validation is unknown."
}
