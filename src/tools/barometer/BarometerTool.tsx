import { useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { useSensorStream } from "@/tools/_sensor/use-sensor-stream"
import {
  altitudeFromPressure,
  formatAltitude,
  formatPressure,
  pressureTrend,
  standardSeaLevelHpa,
  type PressureSample,
} from "./barometer"

const kinds = ["barometer"] as const
const maximumSamples = 300

export default function BarometerTool() {
  const [pressure, setPressure] = useState<number | null>(null)
  const [samples, setSamples] = useState<PressureSample[]>([])
  const [seaLevel, setSeaLevel] = useState(String(standardSeaLevelHpa))

  const onSample = useCallback((sample: { timestampMs: number; values: readonly number[] }) => {
    const hPa = sample.values[0]
    if (hPa === undefined || !Number.isFinite(hPa)) return
    setPressure(hPa)
    setSamples((previous) => [
      ...previous.slice(-(maximumSamples - 1)),
      { timestampMs: sample.timestampMs, hPa },
    ])
  }, [])

  const { error, streaming } = useSensorStream(kinds, onSample)
  const seaLevelValue = Number(seaLevel)
  const altitude = pressure === null ? null : altitudeFromPressure(pressure, seaLevelValue)
  const trend = useMemo(() => pressureTrend(samples), [samples])

  return (
    <div className="grid gap-4">
      <ToolPanel title="Pressure and altitude">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Pressure</p>
            <output className="font-mono text-3xl font-semibold" id="barometer-pressure">
              {pressure === null ? "—" : formatPressure(pressure)}
            </output>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Estimated altitude</p>
            <output className="font-mono text-3xl font-semibold" id="barometer-altitude">
              {altitude === null ? "—" : formatAltitude(altitude)}
            </output>
          </div>
        </div>

        <div className="mt-4 max-w-xs">
          <Field
            hint={`Standard sea-level pressure is ${standardSeaLevelHpa} hPa. Enter the local reference if you know it.`}
            htmlFor="barometer-sea-level"
            label="Sea-level reference (hPa)"
          >
            <input
              autoComplete="off"
              className="app-input font-mono"
              id="barometer-sea-level"
              inputMode="decimal"
              onChange={(event) => setSeaLevel(event.target.value)}
              value={seaLevel}
            />
          </Field>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--text-secondary)]">Session trend</dt>
            <dd>
              {trend
                ? `${trend.label} (${trend.deltaHpa >= 0 ? "+" : ""}${trend.deltaHpa.toFixed(2)} hPa)`
                : "Collecting…"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-secondary)]">Samples</dt>
            <dd className="font-mono">{samples.length}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <Button onClick={() => setSamples([])} variant="secondary">
            Reset trend
          </Button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-[var(--danger-text)]" role="alert">
            {error} Not every phone has a barometer; altitude also depends on the sea-level
            reference you enter.
          </p>
        ) : null}
        <p className="mt-3 text-sm text-[var(--text-secondary)]" aria-live="polite">
          {streaming ? "Reading the barometer." : "Waiting for the barometer."}
          {altitude === null && pressure !== null
            ? " Enter a sea-level reference between 800 and 1100 hPa."
            : ""}
        </p>
      </ToolPanel>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Altitude is a standard-atmosphere estimate from pressure and the entered sea-level
        reference, not a GPS or surveyed elevation. The short trend is session-only, not a weather
        forecast. Samples stay on this device, stop in the background, and are never saved.
      </p>
    </div>
  )
}
