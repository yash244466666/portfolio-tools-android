import { act, render, screen } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import { sensorKinds, type PlatformServices } from "@/platform/contracts"
import CompassTool from "./CompassTool"

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
    return { kinds: ["magnetometer", "accelerometer"], intervalMs: 50, stop: async () => undefined }
  })
})

it("combines magnetometer and accelerometer samples into a heading", async () => {
  render(
    <PlatformProvider>
      <CompassTool />
    </PlatformProvider>,
  )
  await act(async () => {})
  act(() => {
    sensor.emit?.({ kind: "magnetometer", timestampMs: 1, values: [0, 20, -40], accuracy: 3 })
    sensor.emit?.({ kind: "accelerometer", timestampMs: 2, values: [0, 0, 9.81], accuracy: 3 })
  })
  expect(document.querySelector("#compass-heading")?.textContent).toBe("0° N")
  expect(screen.getByText("High")).toBeVisible()
})
