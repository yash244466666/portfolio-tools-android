import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import { sensorKinds, type PlatformServices } from "@/platform/contracts"
import LevelTool from "./LevelTool"

const sensor = vi.hoisted(() => ({
  availability: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
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
    return { kinds: ["accelerometer"], intervalMs: 50, stop: async () => undefined }
  })
})

it("shows tilt, calibrates zero, and reports level", async () => {
  render(
    <PlatformProvider>
      <LevelTool />
    </PlatformProvider>,
  )
  await act(async () => {})
  act(() =>
    sensor.emit?.({
      kind: "accelerometer",
      timestampMs: 1,
      values: [6.9367, 0, 6.9367],
      accuracy: 3,
    }),
  )
  expect(screen.getByTestId("level-state")).toHaveTextContent("Tilted")
  expect(screen.getByText(/Roll 45.0°/)).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Set zero" }))
  act(() =>
    sensor.emit?.({
      kind: "accelerometer",
      timestampMs: 2,
      values: [6.9367, 0, 6.9367],
      accuracy: 3,
    }),
  )
  expect(screen.getByTestId("level-state")).toHaveTextContent("Level")
})
