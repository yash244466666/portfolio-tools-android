import { registerPlugin } from "@capacitor/core"
import type { ConnectionService } from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"
import { normalizeConnectionDetails, normalizeTrafficCounters } from "@/platform/shared/connection"

interface NetworkDiagnosticsPlugin {
  getDetails(): Promise<unknown>
  getTraffic(): Promise<unknown>
}

export const NetworkDiagnostics = registerPlugin<NetworkDiagnosticsPlugin>("NetworkDiagnostics")

function mappedDiagnosticsError(error: unknown): PlatformError {
  if (error instanceof PlatformError) return error
  return new PlatformError(
    "NETWORK_DIAGNOSTICS_UNAVAILABLE",
    "Connection details are not available on this device.",
    true,
    error,
  )
}

/**
 * Versioned bridge to the app-owned NetworkDiagnostics plugin. The plugin reads
 * ConnectivityManager/TrafficStats without a permission, service, or
 * persistence; every payload is re-validated here before it reaches a tool.
 */
export const capacitorConnectionService: ConnectionService = {
  async details() {
    try {
      return normalizeConnectionDetails(await NetworkDiagnostics.getDetails())
    } catch (error) {
      throw mappedDiagnosticsError(error)
    }
  },

  async traffic() {
    try {
      return normalizeTrafficCounters(await NetworkDiagnostics.getTraffic())
    } catch (error) {
      throw mappedDiagnosticsError(error)
    }
  },
}
