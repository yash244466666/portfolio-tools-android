import { useCallback, useState } from "react"
import { Button } from "@/components/ui/Button"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { useSensorStream } from "@/tools/_sensor/use-sensor-stream"
import { formatLux, lightLevel } from "./light-meter"

const kinds = ["light"] as const

export default function LightMeterTool() {
  const [lux, setLux] = useState<number | null>(null)
  const [minimum, setMinimum] = useState<number | null>(null)
  const [maximum, setMaximum] = useState<number | null>(null)

  const onSample = useCallback((sample: { values: readonly number[] }) => {
    const value = sample.values[0]
    if (value === undefined || !Number.isFinite(value) || value < 0) return
    setLux(value)
    setMinimum((previous) => (previous === null ? value : Math.min(previous, value)))
    setMaximum((previous) => (previous === null ? value : Math.max(previous, value)))
  }, [])

  const { error, streaming } = useSensorStream(kinds, onSample)
  const level = lux === null ? null : lightLevel(lux)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Ambient light">
        <div className="grid gap-4">
          <output className="font-mono text-4xl font-semibold" id="light-meter-lux">
            {lux === null ? "—" : formatLux(lux)}
          </output>
          <div>
            <p className="text-lg font-semibold">{level?.label ?? "Waiting for light data"}</p>
            <p className="text-sm text-[var(--text-secondary)]">{level?.description ?? ""}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--text-secondary)]">Session minimum</dt>
              <dd className="font-mono">{minimum === null ? "—" : formatLux(minimum)}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-secondary)]">Session maximum</dt>
              <dd className="font-mono">{maximum === null ? "—" : formatLux(maximum)}</dd>
            </div>
          </dl>
          <div>
            <Button
              disabled={minimum === null}
              onClick={() => {
                setMinimum(lux)
                setMaximum(lux)
              }}
              variant="secondary"
            >
              Reset min/max
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {error} Not every phone exposes an ambient-light sensor.
            </p>
          ) : null}
          <p aria-live="polite" className="text-sm text-[var(--text-secondary)]">
            {streaming ? "Reading the ambient-light sensor." : "Waiting for the light sensor."}
            {lux !== null
              ? ` Current reading: ${formatLux(lux)}, ${level?.label ?? "unclassified"}.`
              : ""}
          </p>
        </div>
      </ToolPanel>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Ambient-light readings are approximate and vary by phone model and sensor placement. They
        are not a photographic light meter. Samples stay on this device, stop in the background, and
        are never saved.
      </p>
    </div>
  )
}
