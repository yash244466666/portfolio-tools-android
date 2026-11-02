import type { ConnectionDetails, ConnectionService, TrafficCounters } from "@/platform/contracts"
import { connectionContractVersion, normalizeConnectionDetails } from "@/platform/shared/connection"

interface NetworkInformationLike {
  effectiveType?: unknown
  downlink?: unknown
  rtt?: unknown
  saveData?: unknown
}

function isNetworkInformation(value: unknown): value is NetworkInformationLike {
  return typeof value === "object" && value !== null
}

function browserConnection(): NetworkInformationLike | null {
  const candidate: unknown = Reflect.get(navigator, "connection")
  return isNetworkInformation(candidate) ? candidate : null
}

function finitePositive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Browser development adapter. `navigator.connection` exposes coarse estimates
 * on some browsers; system-wide byte counters are not available to a web page,
 * so `traffic()` reports an honest unsupported state instead of faking a rate.
 */
export const webConnectionService: ConnectionService = {
  async details(): Promise<ConnectionDetails> {
    const connection = browserConnection()
    const downlinkMbps = finitePositive(connection?.downlink)
    const rtt = finitePositive(connection?.rtt)
    return normalizeConnectionDetails({
      contractVersion: connectionContractVersion,
      transport: navigator.onLine ? "other" : "none",
      metered: connection?.saveData === true ? true : null,
      validated: navigator.onLine,
      internetCapable: navigator.onLine,
      vpn: false,
      linkDownKbps: downlinkMbps === null ? null : Math.round(downlinkMbps * 1000),
      effectiveType:
        typeof connection?.effectiveType === "string" ? connection.effectiveType : null,
      roundTripTimeMs: rtt === null ? null : Math.round(rtt),
      localAddresses: [],
      dnsServers: [],
    })
  },

  async traffic(): Promise<TrafficCounters> {
    return { supported: false, rxBytes: null, txBytes: null, elapsedRealtimeMs: null }
  },
}
