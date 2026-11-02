import { act, fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { PlatformServices } from "@/platform/contracts"
import InternetSpeedMeter from "./InternetSpeedMeter"

const connection = vi.hoisted(() => ({
  details: vi.fn(),
  traffic: vi.fn(),
}))

const lifecycle = vi.hoisted(() => {
  const listeners = new Set<(state: { active: boolean }) => void>()
  return {
    listeners,
    current: () => ({ active: true }),
    subscribe: async (listener: (state: { active: boolean }) => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
})

const speed = vi.hoisted(() => ({ run: vi.fn() }))

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<{ platformServices: PlatformServices }>()
  return {
    platformServices: {
      ...actual.platformServices,
      connection,
      lifecycle,
    },
  }
})

vi.mock("./speed-test", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, runSpeedTest: speed.run }
})

const wifiSnapshot = {
  transport: "wifi" as const,
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
}

it("shows connection details, the unsupported web counter state, and a completed test", async () => {
  connection.details.mockResolvedValue(wifiSnapshot)
  connection.traffic.mockResolvedValue({
    supported: false,
    rxBytes: null,
    txBytes: null,
    elapsedRealtimeMs: null,
  })
  speed.run.mockResolvedValue({
    status: "ok",
    result: {
      latencyMs: 25,
      jitterMs: 3,
      downloadMbps: 42.5,
      uploadMbps: 8.25,
      downloadBytes: 5 * 1024 * 1024,
      uploadBytes: 4 * 1024 * 1024,
      downloadComplete: true,
      uploadComplete: true,
      edgeLocation: "DAC",
    },
  })

  render(
    <PlatformProvider>
      <InternetSpeedMeter />
    </PlatformProvider>,
  )
  await act(async () => {})

  expect(screen.getByText("Wi-Fi")).toBeVisible()
  expect(screen.getByText("Connected and validated for internet access.")).toBeVisible()
  expect(screen.getByText(/Live traffic counters are not available in this browser/)).toBeVisible()
  expect(screen.getByText(/speed\.cloudflare\.com/)).toBeVisible()

  fireEvent.click(screen.getByRole("button", { name: "Start speed test" }))
  await act(async () => {})

  expect(screen.getByText("42.5 Mbps")).toBeVisible()
  expect(screen.getByText("8.25 Mbps")).toBeVisible()
  expect(screen.getByText("25 ms")).toBeVisible()
  expect(screen.getByText("DAC")).toBeVisible()
})

it("cancels a running test without reporting a result", async () => {
  connection.details.mockResolvedValue(wifiSnapshot)
  connection.traffic.mockResolvedValue({
    supported: false,
    rxBytes: null,
    txBytes: null,
    elapsedRealtimeMs: null,
  })
  speed.run.mockImplementation(
    ({ signal }: { signal: AbortSignal }) =>
      new Promise((resolve) => {
        signal.addEventListener("abort", () => resolve({ status: "cancelled" }))
      }),
  )

  render(
    <PlatformProvider>
      <InternetSpeedMeter />
    </PlatformProvider>,
  )
  await act(async () => {})
  fireEvent.click(screen.getByRole("button", { name: "Start speed test" }))
  fireEvent.click(await screen.findByRole("button", { name: "Cancel speed test" }))
  await act(async () => {})

  expect(screen.getByText("Speed test cancelled. Nothing was saved.")).toBeVisible()
})

it("warns before a test on a metered connection", async () => {
  connection.details.mockResolvedValue({ ...wifiSnapshot, transport: "cellular", metered: true })
  connection.traffic.mockResolvedValue({
    supported: false,
    rxBytes: null,
    txBytes: null,
    elapsedRealtimeMs: null,
  })
  speed.run.mockResolvedValue({ status: "cancelled" })

  render(
    <PlatformProvider>
      <InternetSpeedMeter />
    </PlatformProvider>,
  )
  await act(async () => {})

  expect(
    screen.getByText("This connection is metered. The test will consume mobile data."),
  ).toBeVisible()
})
