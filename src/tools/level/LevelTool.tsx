import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { useSensorStream } from "@/tools/_sensor/use-sensor-stream"
import {
  calibratedTilt,
  formatAngle,
  isLevel,
  levelLabel,
  tiltFromAcceleration,
  type CalibratedTilt,
  type TiltReading,
} from "./level"

const kinds = ["accelerometer"] as const

export default function LevelTool() {
  const { haptics } = usePlatform()
  const [tilt, setTilt] = useState<TiltReading | null>(null)
  const [zero, setZero] = useState<{ x: number; y: number; z: number } | null>(null)
  const wasLevel = useRef(false)

  const onSample = useCallback((sample: { values: readonly number[] }) => {
    const next = tiltFromAcceleration(sample.values)
    if (next) setTilt(next)
  }, [])
  const { error, streaming } = useSensorStream(kinds, onSample)

  const relative: CalibratedTilt | null = useMemo(() => {
    if (!tilt) return null
    if (zero) return calibratedTilt(tilt, zero) ?? null
    return { rollDeg: tilt.rollDeg, pitchDeg: tilt.pitchDeg, tiltDeg: tilt.tiltDeg }
  }, [tilt, zero])

  const level = relative !== null && isLevel(relative)
  useEffect(() => {
    if (level && !wasLevel.current) void haptics.confirm()
    wasLevel.current = level
  }, [haptics, level])

  const offsetX = relative ? Math.max(-10, Math.min(10, relative.rollDeg)) * 7 : 0
  const offsetY = relative ? Math.max(-10, Math.min(10, relative.pitchDeg)) * 7 : 0

  return (
    <div className="grid gap-4">
      <ToolPanel title="Level">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div
            aria-hidden="true"
            className="relative mx-auto h-44 w-44 rounded-full border-2 border-[var(--border-strong)] bg-[var(--surface-muted)]"
          >
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] opacity-50" />
            <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-[var(--border)]" />
            <div className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--border)]" />
            <div
              className="absolute left-1/2 top-1/2 h-5 w-5 rounded-full bg-[var(--primary)] transition-transform duration-[var(--motion-quick)]"
              style={{
                transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
              }}
            />
          </div>
          <div className="grid gap-3">
            <p className="text-2xl font-semibold" data-testid="level-state">
              {relative ? levelLabel(relative) : "Waiting for level data"}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--text-secondary)]">Roll</dt>
                <dd className="font-mono">{relative ? formatAngle(relative.rollDeg) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">Pitch</dt>
                <dd className="font-mono">{relative ? formatAngle(relative.pitchDeg) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">Tilt from zero</dt>
                <dd className="font-mono">{relative ? formatAngle(relative.tiltDeg) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">Gravity</dt>
                <dd className="font-mono">{tilt ? `${tilt.magnitude.toFixed(2)} m/s²` : "—"}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!tilt}
                onClick={() => tilt && setZero({ x: tilt.x, y: tilt.y, z: tilt.z })}
                variant="secondary"
              >
                Set zero
              </Button>
              <Button disabled={!zero} onClick={() => setZero(null)} variant="quiet">
                Reset zero
              </Button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {streaming ? "Reading the accelerometer." : "Waiting for the accelerometer."}
              {zero
                ? " Zero is calibrated for this session only."
                : " Place the phone on the reference surface, then set zero."}
            </p>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-[var(--danger-text)]" role="alert">
            {error} A phone with an accelerometer is required.
          </p>
        ) : null}
        <p className="mt-3 text-sm text-[var(--text-secondary)]" aria-live="polite">
          {relative
            ? `${levelLabel(relative)}. Roll ${formatAngle(relative.rollDeg)}, pitch ${formatAngle(relative.pitchDeg)}, tilt ${formatAngle(relative.tiltDeg)}.${level ? " The level state is within one degree." : ""}`
            : "No level data yet."}
        </p>
      </ToolPanel>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        The accelerometer measures gravity; this is an indicative level, not a calibrated
        instrument. Samples stay on this device, stop when the app leaves the foreground, and are
        never saved.
      </p>
    </div>
  )
}
