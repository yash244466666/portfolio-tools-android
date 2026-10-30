import { useCallback, useRef, useState } from "react"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { CompassDial } from "@/components/motion/primitives"
import { useSensorStream } from "@/tools/_sensor/use-sensor-stream"
import { accuracyLabel, computeCompass, formatHeading, type CompassReading } from "./compass"

const kinds = ["magnetometer", "accelerometer"] as const

export default function CompassTool() {
  const [reading, setReading] = useState<CompassReading | null>(null)
  const magnetometer = useRef<readonly number[] | null>(null)
  const accelerometer = useRef<readonly number[] | null>(null)

  const onSample = useCallback(
    (sample: { kind: string; values: readonly number[]; accuracy: number }) => {
      if (sample.kind === "magnetometer") magnetometer.current = sample.values
      if (sample.kind === "accelerometer") accelerometer.current = sample.values
      if (magnetometer.current && accelerometer.current) {
        setReading(computeCompass(magnetometer.current, accelerometer.current, sample.accuracy))
      }
    },
    [],
  )

  const { error, streaming } = useSensorStream(kinds, onSample)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Compass">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <CompassDial
            accuracy={reading?.accuracy ?? 0}
            heading={reading?.headingDeg ?? 0}
            interference={reading?.interference ?? false}
          />
          <div className="grid gap-3">
            <output className="font-mono text-3xl font-semibold" id="compass-heading">
              {reading ? formatHeading(reading) : "—"}
            </output>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--text-secondary)]">Magnetic strength</dt>
                <dd className="font-mono">
                  {reading ? `${reading.magneticStrength.toFixed(1)} µT` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">Accuracy</dt>
                <dd>{reading ? accuracyLabel(reading.accuracy) : "—"}</dd>
              </div>
            </dl>
            <p className="text-sm text-[var(--text-secondary)]">
              {reading
                ? "The heading is magnetic, not true north. Move away from magnets, metal, and magnetic cases, and move the phone in a figure-8 if accuracy is low."
                : streaming
                  ? "Waiting for the magnetometer and accelerometer."
                  : "Waiting for the sensors."}
            </p>
          </div>
        </div>
        {reading?.interference ? (
          <p className="mt-3 text-sm text-[var(--danger-text)]" role="alert">
            The magnetic field is unusually weak or strong. Move away from metal and magnetic
            accessories and recalibrate with a figure-8 motion.
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-[var(--danger-text)]" role="alert">
            {error} A phone with a magnetometer and accelerometer is required.
          </p>
        ) : null}
        <p aria-live="polite" className="sr-only" role="status">
          {reading ? `Heading ${Math.round(reading.headingDeg)} degrees, ${reading.cardinal}.` : ""}
        </p>
      </ToolPanel>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        The compass uses the phone&apos;s magnetic-field and accelerometer sensors; it does not use
        location. Magnetic north differs from true north, and nearby magnets or electronics can
        distort the reading. Samples stay on this device, stop in the background, and are never
        saved.
      </p>
    </div>
  )
}
