import { act, render, screen } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import { sensorKinds, type PlatformServices } from "@/platform/contracts"
import VibrationMeterTool from "./VibrationMeterTool"

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
    return { kinds: ["linear-acceleration"], intervalMs: 50, stop: async () => undefined }
  })
})

it("rolls linear acceleration into RMS, peak, and a text level", async () => {
  render(
    <PlatformProvider>
      <VibrationMeterTool />
    </PlatformProvider>,
  )
  await act(async () => {})
  act(() =>
    sensor.emit?.({
      kind: "linear-acceleration",
      timestampMs: 1_000,
      values: [3, 0, 0],
      accuracy: 3,
    }),
  )
  expect(document.querySelector("#vibration-rms")?.textContent).toBe("3.00 m/s²")
  expect(document.querySelector("#vibration-peak")?.textContent).toBe("3.00 m/s²")
  expect(screen.getByText("Strong")).toBeVisible()
})
