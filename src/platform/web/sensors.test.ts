import { afterEach, describe, expect, it } from "vitest"
import { webSensorService } from "./sensors"

const originalDeviceMotion = Object.getOwnPropertyDescriptor(window, "DeviceMotionEvent")

function installDeviceMotion(): void {
  Object.defineProperty(window, "DeviceMotionEvent", {
    configurable: true,
    value: class DeviceMotionEvent extends Event {},
  })
}

function restoreDeviceMotion(): void {
  if (originalDeviceMotion) {
    Object.defineProperty(window, "DeviceMotionEvent", originalDeviceMotion)
  } else {
    Reflect.deleteProperty(window, "DeviceMotionEvent")
  }
}

afterEach(() => restoreDeviceMotion())

describe("webSensorService", () => {
  it("reports only motion sensors as available in the browser", async () => {
    installDeviceMotion()
    expect(await webSensorService.availability()).toEqual([
      { kind: "accelerometer", available: true },
      { kind: "linear-acceleration", available: true },
      { kind: "magnetometer", available: false },
      { kind: "barometer", available: false },
      { kind: "light", available: false },
    ])
  })

  it("rejects unavailable sensor kinds and bad requests", async () => {
    installDeviceMotion()
    await expect(
      webSensorService.start({ kinds: ["magnetometer"], onSample: () => {} }),
    ).rejects.toMatchObject({ code: "SENSOR_UNAVAILABLE" })
    await expect(webSensorService.start({ kinds: [], onSample: () => {} })).rejects.toMatchObject({
      code: "SENSOR_INVALID_ARGUMENT",
    })
  })

  it("emits throttled accelerometer samples and stops cleanly", async () => {
    installDeviceMotion()
    const samples: number[] = []
    const session = await webSensorService.start({
      kinds: ["accelerometer"],
      intervalMs: 20,
      onSample: (sample) => samples.push(sample.values[0] ?? 0),
    })
    const event = new Event("devicemotion")
    Object.defineProperty(event, "accelerationIncludingGravity", {
      value: { x: 0, y: 9.8, z: 0 },
    })
    window.dispatchEvent(event)
    expect(samples).toEqual([0])
    await session.stop()
    window.dispatchEvent(event)
    expect(samples).toEqual([0])
  })
})
