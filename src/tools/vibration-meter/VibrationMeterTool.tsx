import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { useSensorStream } from "@/tools/_sensor/use-sensor-stream"
import {
  formatAcceleration,
  vibrationLabel,
  vibrationReading,
  type VibrationReading,
  type VibrationSample,
} from "./vibration-meter"

const kinds = ["linear-acceleration"] as const
const bufferLimit = 200

export default function VibrationMeterTool() {
  const [reading, setReading] = useState<VibrationReading | null>(null)
  const buffer = useRef<VibrationSample[]>([])
  const lastUiUpdate = useRef(0)

  const onSample = useCallback((sample: { timestampMs: number; values: readonly number[] }) => {
    buffer.current = [
      ...buffer.current.slice(-(bufferLimit - 1)),
      { timestampMs: sample.timestampMs, values: sample.values },
    ]
    if (sample.timestampMs - lastUiUpdate.current < 100) return
    lastUiUpdate.current = sample.timestampMs
    setReading(vibrationReading(buffer.current))
  }, [])

  const { error, streaming } = useSensorStream(kinds, onSample)

  function reset() {
    buffer.current = []
    setReading(null)
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Vibration">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">RMS (last second)</p>
              <output className="font-mono text-3xl font-semibold" id="vibration-rms">
                {reading ? formatAcceleration(reading.rms) : "—"}
              </output>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Peak (last second)</p>
              <output className="font-mono text-3xl font-semibold" id="vibration-peak">
                {reading ? formatAcceleration(reading.peak) : "—"}
              </output>
            </div>
          </div>
          <p className="text-lg font-semibold">
            {reading ? vibrationLabel(reading.rms) : "Waiting for motion data"}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {reading
              ? `${reading.sampleCount} sample${reading.sampleCount === 1 ? "" : "s"} in the rolling window.`
              : streaming
                ? "Keep the phone still to establish a quiet baseline."
                : "Waiting for the linear-acceleration sensor."}
          </p>
          <div>
            <Button disabled={!reading} onClick={reset} variant="secondary">
              Reset reading
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {error} A phone with a linear-acceleration sensor is required.
            </p>
          ) : null}
          <p aria-live="polite" className="sr-only" role="status">
            {reading
              ? `RMS ${formatAcceleration(reading.rms)}, peak ${formatAcceleration(reading.peak)}, ${vibrationLabel(reading.rms)}.`
              : ""}
          </p>
        </div>
      </ToolPanel>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Linear acceleration excludes gravity, so a still phone reads near zero. Readings are
        indicative and vary by sensor and phone placement; this is not a calibrated vibration
        instrument. Samples stay on this device, stop in the background, and are never saved.
      </p>
    </div>
  )
}
