import {
  sensorKinds,
  type SensorAvailability,
  type SensorSample,
  type SensorService,
} from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"
import { normalizeSensorRequest, validatedSensorSample } from "@/platform/shared/sensors"

const hasMotionEvents = (): boolean =>
  typeof window !== "undefined" && typeof window.DeviceMotionEvent !== "undefined"

/**
 * Browser development adapter. Chromium exposes DeviceMotion (including
 * gravity) but not the magnetometer, barometer, or ambient-light sensor, so
 * the corresponding tools surface their unsupported state here and are
 * verified on Android instead. Samples are throttled to the requested
 * interval; the adapter never samples in the background.
 */
export const webSensorService: SensorService = {
  async availability(): Promise<SensorAvailability[]> {
    const motion = hasMotionEvents()
    return sensorKinds.map((kind) => ({
      kind,
      available: motion && (kind === "accelerometer" || kind === "linear-acceleration"),
    }))
  },

  async start(options) {
    const request = normalizeSensorRequest(options.kinds, options.intervalMs)
    if (request === null) {
      throw new PlatformError("SENSOR_INVALID_ARGUMENT", "The sensor request is invalid.")
    }
    const unsupported = request.kinds.filter(
      (kind) => kind !== "accelerometer" && kind !== "linear-acceleration",
    )
    if (unsupported.length > 0) {
      throw new PlatformError(
        "SENSOR_UNAVAILABLE",
        "This sensor is available in the Android application.",
      )
    }
    if (!hasMotionEvents()) {
      throw new PlatformError(
        "SENSOR_UNAVAILABLE",
        "Motion sensors are not available in this browser.",
      )
    }

    const active = new Set(request.kinds)
    let lastEmitMs = 0
    const handler = (event: Event) => {
      const now = Date.now()
      if (now - lastEmitMs < request.intervalMs) return
      lastEmitMs = now
      const motion = event as DeviceMotionEvent
      const sources: Partial<
        Record<(typeof request.kinds)[number], DeviceMotionEvent["acceleration"]>
      > = {
        accelerometer: motion.accelerationIncludingGravity,
        "linear-acceleration": motion.acceleration,
      }
      for (const kind of request.kinds) {
        const values = sources[kind]
        if (values === null || values === undefined) continue
        const [x, y, z] = [values.x, values.y, values.z]
        if (x === null || y === null || z === null) continue
        const sample: SensorSample = {
          kind,
          timestampMs: now,
          values: [x, y, z],
          accuracy: 3,
        }
        const validated = active.has(sample.kind) ? validatedSensorSample(sample, active) : null
        if (validated) options.onSample(validated)
      }
    }

    window.addEventListener("devicemotion", handler)
    return {
      kinds: request.kinds,
      intervalMs: request.intervalMs,
      async stop() {
        window.removeEventListener("devicemotion", handler)
      },
    }
  },
}
