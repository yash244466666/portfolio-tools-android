import { registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import { type SensorAvailability, type SensorKind, type SensorService } from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"
import {
  normalizeSensorRequest,
  validatedSensorAvailability,
  validatedSensorSample,
} from "@/platform/shared/sensors"

export const phoneSensorsContractVersion = 1

interface NativeAvailability {
  contractVersion?: unknown
  sensors?: unknown
}

interface NativeStartResult {
  contractVersion?: unknown
  kinds?: unknown
  intervalMs?: unknown
}

interface PhoneSensorsPlugin {
  available(): Promise<NativeAvailability>
  start(options: {
    contractVersion: number
    kinds: readonly SensorKind[]
    intervalMs: number
  }): Promise<NativeStartResult>
  stop(): Promise<void>
  addListener(
    eventName: "sensorSample",
    listener: (payload: unknown) => void,
  ): Promise<PluginListenerHandle>
}

export const PhoneSensors = registerPlugin<PhoneSensorsPlugin>("PhoneSensors")

function sensorError(error: unknown, fallback: string): PlatformError {
  if (error instanceof PlatformError) return error
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : ""
  if (code === "SENSOR_INVALID_ARGUMENT" || code === "SENSOR_UNAVAILABLE") {
    return new PlatformError(code, "The requested phone sensor is not available.")
  }
  return new PlatformError("SENSOR_START_FAILED", fallback, true, error)
}

/**
 * Versioned bridge to the app-owned PhoneSensors plugin. The plugin reads the
 * Android SensorManager at a capped interval, stops on Activity pause, and
 * never logs or stores samples.
 */
export const capacitorSensorService: SensorService = {
  async availability(): Promise<SensorAvailability[]> {
    try {
      const result = await PhoneSensors.available()
      if (result.contractVersion !== phoneSensorsContractVersion) {
        throw new PlatformError("SENSOR_START_FAILED", "The sensor bridge version is unsupported.")
      }
      const values = validatedSensorAvailability(result.sensors)
      if (values === null) {
        throw new PlatformError("SENSOR_START_FAILED", "The sensor bridge returned invalid data.")
      }
      return values
    } catch (error) {
      throw sensorError(error, "Phone sensors are not available on this device.")
    }
  },

  async start(options) {
    const request = normalizeSensorRequest(options.kinds, options.intervalMs)
    if (request === null) {
      throw new PlatformError("SENSOR_INVALID_ARGUMENT", "The sensor request is invalid.")
    }
    const active = new Set(request.kinds)
    let handle: PluginListenerHandle | null = null
    try {
      const result = await PhoneSensors.start({
        contractVersion: phoneSensorsContractVersion,
        kinds: request.kinds,
        intervalMs: request.intervalMs,
      })
      if (
        result.contractVersion !== phoneSensorsContractVersion ||
        !Array.isArray(result.kinds) ||
        result.kinds.length !== request.kinds.length ||
        result.intervalMs !== request.intervalMs
      ) {
        throw new PlatformError("SENSOR_START_FAILED", "The sensor bridge returned invalid data.")
      }
      handle = await PhoneSensors.addListener("sensorSample", (payload) => {
        const sample = validatedSensorSample(payload, active)
        if (sample) options.onSample(sample)
      })
    } catch (error) {
      if (handle) await handle.remove().catch(() => undefined)
      await PhoneSensors.stop().catch(() => undefined)
      throw sensorError(error, "The phone sensor could not be started.")
    }

    return {
      kinds: request.kinds,
      intervalMs: request.intervalMs,
      async stop() {
        try {
          if (handle) await handle.remove()
        } finally {
          await PhoneSensors.stop()
        }
      },
    }
  },
}
