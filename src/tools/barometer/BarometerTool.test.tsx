import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import { sensorKinds, type PlatformServices } from "@/platform/contracts"
import BarometerTool from "./BarometerTool"

const sensor = vi.hoisted(() => ({
  availability: vi.fn(),
  start: vi.fn(),
  emit: null as ((sample: unknown) => void) | null,
}))

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<{ platformServices: PlatformServices }>()
  return {
    platformServices: {
      ...actual.platformServices,
      sensors: { availability: sensor.availability, start: sensor.start },
    },
  }
})

beforeEach(() => {
  sensor.emit = null
  sensor.availability.mockResolvedValue(sensorKinds.map((kind) => ({ kind, available: true })))
  sensor.start.mockImplementation(async (options: { onSample: (sample: unknown) => void }) => {
    sensor.emit = options.onSample
    return { kinds: ["barometer"], intervalMs: 50, stop: async () => undefined }
  })
})

it("shows pressure and a reference-dependent altitude", async () => {
  render(
    <PlatformProvider>
      <BarometerTool />
    </PlatformProvider>,
  )
  await act(async () => {})
  act(() => sensor.emit?.({ kind: "barometer", timestampMs: 1, values: [1000], accuracy: 3 }))
  expect(document.querySelector("#barometer-pressure")?.textContent).toBe("1000.00 hPa")
  expect(document.querySelector("#barometer-altitude")?.textContent).toMatch(/^110\.9 m/)
  fireEvent.change(screen.getByLabelText("Sea-level reference (hPa)"), {
    target: { value: "1000" },
  })
  expect(document.querySelector("#barometer-altitude")?.textContent).toMatch(/^0\.0 m/)
})
