import { describe, expect, it } from "vitest"
import { PlatformError } from "@/platform/errors"
import {
  connectionContractVersion,
  maximumConnectionAddresses,
  normalizeConnectionDetails,
  normalizeTrafficCounters,
  sanitizeConnectionText,
} from "@/platform/shared/connection"

function validDetails(overrides: Record<string, unknown> = {}) {
  return {
    contractVersion: connectionContractVersion,
    transport: "wifi",
    metered: false,
    validated: true,
    internetCapable: true,
    vpn: false,
    linkDownKbps: 72_000,
    linkUpKbps: 18_000,
    effectiveType: null,
    roundTripTimeMs: null,
    interfaceName: "wlan0",
    localAddresses: ["192.168.1.20"],
    dnsServers: ["1.1.1.1"],
    mtu: 1500,
    signalStrength: -55,
    ...overrides,
  }
}

function expectDiagnosticsError(action: () => unknown) {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(PlatformError)
    expect((error as PlatformError).code).toBe("NETWORK_DIAGNOSTICS_UNAVAILABLE")
    return
  }
  throw new Error("Expected a PlatformError")
}

describe("normalizeConnectionDetails", () => {
  it("accepts a complete native snapshot", () => {
    expect(normalizeConnectionDetails(validDetails())).toEqual({
      transport: "wifi",
      metered: false,
      validated: true,
      internetCapable: true,
      vpn: false,
      linkDownKbps: 72_000,
      linkUpKbps: 18_000,
      effectiveType: null,
      roundTripTimeMs: null,
      interfaceName: "wlan0",
      localAddresses: ["192.168.1.20"],
      dnsServers: ["1.1.1.1"],
      mtu: 1500,
      signalStrength: -55,
    })
  })

  it("degrades optional fields to unknown instead of failing the whole view", () => {
    const result = normalizeConnectionDetails(
      validDetails({
        transport: "satellite",
        metered: "no",
        linkDownKbps: -1,
        linkUpKbps: Number.NaN,
        mtu: 100_000,
        signalStrength: -999,
        interfaceName: "",
      }),
    )
    expect(result.transport).toBe("other")
    expect(result.metered).toBeNull()
    expect(result.linkDownKbps).toBeNull()
    expect(result.linkUpKbps).toBeNull()
    expect(result.mtu).toBeNull()
    expect(result.signalStrength).toBeNull()
    expect(result.interfaceName).toBeNull()
  })

  it("caps address lists and strips display controls", () => {
    const result = normalizeConnectionDetails(
      validDetails({
        localAddresses: Array.from({ length: 12 }, (_, index) => `10.0.0.${index}‮`),
        dnsServers: ["1.1.1.1\n", "\u0000", "8.8.8.8"],
      }),
    )
    expect(result.localAddresses).toHaveLength(maximumConnectionAddresses)
    expect(result.localAddresses[0]).toBe("10.0.0.0")
    expect(result.dnsServers).toEqual(["1.1.1.1", "8.8.8.8"])
  })

  it("rejects a wrong contract version or a non-object", () => {
    expectDiagnosticsError(() => normalizeConnectionDetails(validDetails({ contractVersion: 2 })))
    expectDiagnosticsError(() => normalizeConnectionDetails(null))
    expectDiagnosticsError(() => normalizeConnectionDetails("wifi"))
  })
})

describe("normalizeTrafficCounters", () => {
  it("accepts a supported counter payload", () => {
    expect(
      normalizeTrafficCounters({
        contractVersion: connectionContractVersion,
        supported: true,
        rxBytes: 1_024,
        txBytes: 512,
        elapsedRealtimeMs: 9_000,
      }),
    ).toEqual({ supported: true, rxBytes: 1_024, txBytes: 512, elapsedRealtimeMs: 9_000 })
  })

  it("keeps an unsupported platform state distinct from an error", () => {
    expect(
      normalizeTrafficCounters({
        contractVersion: connectionContractVersion,
        supported: false,
        rxBytes: 1,
      }),
    ).toEqual({ supported: false, rxBytes: null, txBytes: null, elapsedRealtimeMs: null })
  })

  it("rejects a supported payload with impossible counters", () => {
    expectDiagnosticsError(() =>
      normalizeTrafficCounters({
        contractVersion: connectionContractVersion,
        supported: true,
        rxBytes: -1,
        txBytes: 1,
        elapsedRealtimeMs: 1,
      }),
    )
    expectDiagnosticsError(() =>
      normalizeTrafficCounters({
        contractVersion: connectionContractVersion,
        supported: true,
        rxBytes: 1,
        txBytes: 1,
        elapsedRealtimeMs: 0,
      }),
    )
    expectDiagnosticsError(() =>
      normalizeTrafficCounters({
        contractVersion: connectionContractVersion,
        supported: true,
        rxBytes: 1.5,
        txBytes: 1,
        elapsedRealtimeMs: 1,
      }),
    )
  })
})

describe("sanitizeConnectionText", () => {
  it("removes bidi and line controls and bounds the length", () => {
    expect(sanitizeConnectionText("wlan0‮")).toBe("wlan0")
    expect(sanitizeConnectionText("a".repeat(300))).toHaveLength(128)
  })
})
