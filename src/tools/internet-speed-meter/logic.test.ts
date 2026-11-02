import { describe, expect, it } from "vitest"
import {
  connectionStateLabel,
  formatBitsPerSecond,
  formatBytes,
  formatLatency,
  jitter,
  maximumMeterGapMs,
  megabitsPerSecond,
  median,
  ratesFromCounters,
  transportLabel,
} from "./logic"

const mebibyte = 1024 * 1024

describe("ratesFromCounters", () => {
  it("converts a one-second counter delta into bits per second", () => {
    expect(
      ratesFromCounters(
        { rxBytes: 0, txBytes: 0, elapsedRealtimeMs: 0 },
        { rxBytes: mebibyte, txBytes: 1024, elapsedRealtimeMs: 1_000 },
      ),
    ).toEqual({
      downloadBitsPerSecond: 8_388_608,
      uploadBitsPerSecond: 8_192,
    })
  })

  it("reports unknown after a counter reset instead of a negative rate", () => {
    expect(
      ratesFromCounters(
        { rxBytes: 5_000, txBytes: 5_000, elapsedRealtimeMs: 1_000 },
        { rxBytes: 10, txBytes: 10, elapsedRealtimeMs: 2_000 },
      ),
    ).toEqual({ downloadBitsPerSecond: null, uploadBitsPerSecond: null })
  })

  it("reports unknown for zero, negative, or stale gaps", () => {
    const sample = { rxBytes: mebibyte, txBytes: mebibyte, elapsedRealtimeMs: 1_000 }
    expect(ratesFromCounters(sample, { ...sample, elapsedRealtimeMs: 1_000 })).toEqual({
      downloadBitsPerSecond: null,
      uploadBitsPerSecond: null,
    })
    expect(
      ratesFromCounters(sample, {
        ...sample,
        elapsedRealtimeMs: 1_000 - maximumMeterGapMs - 1,
      }),
    ).toEqual({ downloadBitsPerSecond: null, uploadBitsPerSecond: null })
    expect(
      ratesFromCounters(sample, {
        ...sample,
        elapsedRealtimeMs: 1_000 + maximumMeterGapMs + 1,
      }),
    ).toEqual({ downloadBitsPerSecond: null, uploadBitsPerSecond: null })
  })
})

describe("formatting", () => {
  it("formats bit rates with explicit units", () => {
    expect(formatBitsPerSecond(null)).toBe("—")
    expect(formatBitsPerSecond(500)).toBe("500 bps")
    expect(formatBitsPerSecond(1_000)).toBe("1 kbps")
    expect(formatBitsPerSecond(1_500_000)).toBe("1.5 Mbps")
    expect(formatBitsPerSecond(8_388_608)).toBe("8.39 Mbps")
    expect(formatBitsPerSecond(2_000_000_000)).toBe("2 Gbps")
  })

  it("formats byte counts for data-use disclosures", () => {
    expect(formatBytes(null)).toBe("—")
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(1024)).toBe("1 KiB")
    expect(formatBytes(1536)).toBe("1.5 KiB")
    expect(formatBytes(mebibyte)).toBe("1 MiB")
    expect(formatBytes(1.5 * 1024 ** 3)).toBe("1.5 GiB")
  })

  it("formats latency honestly", () => {
    expect(formatLatency(null)).toBe("—")
    expect(formatLatency(12.34)).toBe("12.3 ms")
    expect(formatLatency(120)).toBe("120 ms")
  })
})

describe("speed-test math", () => {
  it("computes the median for odd and even samples", () => {
    expect(median([30, 10, 20])).toBe(20)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBeNull()
  })

  it("computes mean absolute jitter", () => {
    expect(jitter([10, 20, 10])).toBe(10)
    expect(jitter([10])).toBeNull()
  })

  it("converts bytes and elapsed milliseconds into megabits per second", () => {
    expect(megabitsPerSecond(mebibyte, 1_000)).toBeCloseTo(8.388608, 9)
    expect(megabitsPerSecond(0, 1_000)).toBe(0)
    expect(megabitsPerSecond(1_024, 0)).toBeNull()
    expect(megabitsPerSecond(-1, 1_000)).toBeNull()
  })
})

describe("connection labels", () => {
  it("names every transport", () => {
    expect(transportLabel("wifi")).toBe("Wi-Fi")
    expect(transportLabel("cellular")).toBe("Cellular")
    expect(transportLabel("ethernet")).toBe("Ethernet")
    expect(transportLabel("vpn")).toBe("VPN")
    expect(transportLabel("bluetooth")).toBe("Bluetooth tethering")
    expect(transportLabel("none")).toBe("No active network")
    expect(transportLabel("other")).toBe("Other / unknown")
  })

  it("distinguishes unknown, unvalidated, and validated states", () => {
    expect(connectionStateLabel(null)).toContain("Checking")
    expect(
      connectionStateLabel({
        transport: "none",
        metered: null,
        validated: null,
        internetCapable: null,
        vpn: false,
        linkDownKbps: null,
        linkUpKbps: null,
        effectiveType: null,
        roundTripTimeMs: null,
        interfaceName: null,
        localAddresses: [],
        dnsServers: [],
        mtu: null,
        signalStrength: null,
      }),
    ).toBe("No active network.")
    expect(
      connectionStateLabel({
        transport: "wifi",
        metered: false,
        validated: false,
        internetCapable: true,
        vpn: false,
        linkDownKbps: null,
        linkUpKbps: null,
        effectiveType: null,
        roundTripTimeMs: null,
        interfaceName: null,
        localAddresses: [],
        dnsServers: [],
        mtu: null,
        signalStrength: null,
      }),
    ).toContain("has not validated")
  })
})
