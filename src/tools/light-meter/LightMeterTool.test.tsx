import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import { sensorKinds, type PlatformServices } from "@/platform/contracts"
import LightMeterTool from "./LightMeterTool"

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
    return { kinds: ["light"], intervalMs: 50, stop: async () => undefined }
  })
})

it("shows lux, a text level, and session min/max", async () => {
  render(
    <PlatformProvider>
      <LightMeterTool />
    </PlatformProvider>,
  )
  await act(async () => {})
  act(() => sensor.emit?.({ kind: "light", timestampMs: 1, values: [500], accuracy: 3 }))
  expect(document.querySelector("#light-meter-lux")?.textContent).toBe("500 lx")
  expect(screen.getByText("Bright indoor")).toBeVisible()
  act(() => sensor.emit?.({ kind: "light", timestampMs: 2, values: [50], accuracy: 3 }))
  expect(screen.getAllByText("50 lx").length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole("button", { name: "Reset min/max" }))
  expect(document.querySelector("#light-meter-lux")?.textContent).toBe("50 lx")
})
