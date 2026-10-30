import { describe, expect, it } from "vitest"
import {
  defaultSensorIntervalMs,
  maximumSensorIntervalMs,
  minimumSensorIntervalMs,
  normalizeSensorRequest,
  validatedSensorAvailability,
  validatedSensorSample,
} from "./sensors"

const accel = new Set(["accelerometer", "magnetometer"] as const)

describe("normalizeSensorRequest", () => {
  it("accepts unique known kinds and applies the default interval", () => {
    expect(normalizeSensorRequest(["accelerometer", "magnetometer"])).toEqual({
      kinds: ["accelerometer", "magnetometer"],
      intervalMs: defaultSensorIntervalMs,
    })
  })

  it("clamps the interval into the documented range", () => {
    expect(normalizeSensorRequest(["light"], 1)?.intervalMs).toBe(minimumSensorIntervalMs)
    expect(normalizeSensorRequest(["light"], 5000)?.intervalMs).toBe(maximumSensorIntervalMs)
    expect(normalizeSensorRequest(["light"], 49.6)?.intervalMs).toBe(50)
  })

  it("rejects empty, duplicate, unknown, or non-finite requests", () => {
    expect(normalizeSensorRequest([])).toBeNull()
    expect(normalizeSensorRequest(["accelerometer", "accelerometer"])).toBeNull()
    expect(normalizeSensorRequest(["camera"])).toBeNull()
    expect(normalizeSensorRequest(["light"], Number.NaN)).toBeNull()
    expect(normalizeSensorRequest(["light"], 0)).toBeNull()
  })
})

describe("validatedSensorSample", () => {
  it("keeps a well-formed active-kind sample", () => {
    expect(
      validatedSensorSample(
        { kind: "accelerometer", timestampMs: 10, values: [1, 2, 3], accuracy: 3 },
        accel,
      ),
    ).toEqual({ kind: "accelerometer", timestampMs: 10, values: [1, 2, 3], accuracy: 3 })
  })

  it("drops unknown kinds, wrong value counts, and non-finite data", () => {
    expect(
      validatedSensorSample({ kind: "light", timestampMs: 10, values: [100], accuracy: 3 }, accel),
    ).toBeNull()
    expect(
      validatedSensorSample(
        { kind: "accelerometer", timestampMs: 10, values: [1, 2], accuracy: 3 },
        accel,
      ),
    ).toBeNull()
    expect(
      validatedSensorSample(
        { kind: "accelerometer", timestampMs: Number.NaN, values: [1, 2, 3], accuracy: 3 },
        accel,
      ),
    ).toBeNull()
    expect(
      validatedSensorSample(
        { kind: "magnetometer", timestampMs: 10, values: [1, 2, Number.POSITIVE_INFINITY] },
        accel,
      ),
    ).toBeNull()
  })
})

describe("validatedSensorAvailability", () => {
  it("keeps known unique rows and rejects malformed lists", () => {
    expect(
      validatedSensorAvailability([
        { kind: "accelerometer", available: true },
        { kind: "barometer", available: false },
        { kind: "accelerometer", available: false },
      ]),
    ).toEqual([
      { kind: "accelerometer", available: true },
      { kind: "barometer", available: false },
    ])
    expect(validatedSensorAvailability([{ kind: "camera", available: true }])).toBeNull()
    expect(validatedSensorAvailability([{ kind: "light" }])).toBeNull()
    expect(validatedSensorAvailability("x")).toBeNull()
  })
})
