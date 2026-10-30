import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { Meter } from "@/components/motion/primitives"
import { usePlatform } from "@/platform/platform-context"
import {
  computeElapsedMs,
  formatStopwatchTime,
  markExtremes,
  recordLap,
  type LapRecord,
  type StopwatchAnchor,
} from "./stopwatch"

export default function Stopwatch() {
  const { haptics } = usePlatform()
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState<LapRecord[]>([])
  const anchorRef = useRef<StopwatchAnchor | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reading the anchor on every render keeps the display honest even if an
  // interval tick is throttled; the interval only drives re-renders.
  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (anchorRef.current !== null) {
        setElapsed(computeElapsedMs(anchorRef.current, 0, Date.now()))
      }
    }
    tick()
    intervalRef.current = setInterval(tick, 50)
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running])

  function stopTicking() {
    if (intervalRef.current !== null) clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  function start() {
    anchorRef.current = { startedAtMs: Date.now(), elapsedAtStartMs: elapsed }
    setRunning(true)
    void haptics.confirm()
  }

  function stop() {
    if (anchorRef.current !== null) {
      setElapsed(computeElapsedMs(anchorRef.current, 0, Date.now()))
      anchorRef.current = null
    }
    stopTicking()
    setRunning(false)
    void haptics.confirm()
  }

  function reset() {
    stopTicking()
    anchorRef.current = null
    setRunning(false)
    setElapsed(0)
    setLaps([])
  }

  function lap() {
    const current =
      anchorRef.current !== null ? computeElapsedMs(anchorRef.current, 0, Date.now()) : elapsed
    setLaps((prev) => recordLap(prev, current, `lap-${prev.length + 1}-${current}`))
    void haptics.confirm()
  }

  const marks = markExtremes(laps)
  const lapLines = laps
    .map(
      (entry, index) =>
        `Lap ${laps.length - index}: ${formatStopwatchTime(entry.lapTime)} (total ${formatStopwatchTime(entry.totalTime)})`,
    )
    .join("\n")

  return (
    <div className="grid gap-4">
      <ToolPanel title="Elapsed time">
        <p
          className="text-center font-mono text-5xl tabular-nums leading-none tracking-wider"
          role="timer"
          aria-label="Elapsed time"
        >
          {formatStopwatchTime(elapsed)}
        </p>
        <div className="mx-auto mt-4 max-w-sm">
          <Meter
            label="Minute sweep"
            maximum={60_000}
            value={elapsed % 60_000}
            valueLabel={`${Math.floor((elapsed % 60_000) / 1000)} s`}
          />
        </div>
        <p aria-live="polite" className="sr-only" role="status">
          {running ? "Stopwatch running" : elapsed > 0 ? "Stopwatch stopped" : "Stopwatch idle"}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {running ? (
            <Button onClick={stop}>Stop</Button>
          ) : (
            <Button onClick={start}>{elapsed > 0 ? "Resume" : "Start"}</Button>
          )}
          {running ? (
            <Button onClick={lap} variant="secondary">
              Lap
            </Button>
          ) : null}
          {!running && elapsed > 0 ? (
            <Button onClick={reset} variant="quiet">
              Reset
            </Button>
          ) : null}
        </div>
      </ToolPanel>

      {laps.length > 0 ? (
        <ToolPanel title="Laps" action={<CopyButton label="Copy laps" value={lapLines} />}>
          <table className="w-full text-sm">
            <caption className="sr-only">Recorded laps with per-lap and total times</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <th scope="col" className="py-2">
                  Lap
                </th>
                <th scope="col" className="py-2 text-right">
                  Lap time
                </th>
                <th scope="col" className="py-2 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {laps.map((entry, index) => {
                const mark = marks[index] ?? { isBest: false, isWorst: false }
                return (
                  <tr key={entry.id} className="border-t border-[var(--border)]">
                    <td className="py-2 font-mono">#{laps.length - index}</td>
                    <td className="py-2 text-right font-mono">
                      {formatStopwatchTime(entry.lapTime)}
                      {mark.isBest ? (
                        <span className="sr-only"> (best lap)</span>
                      ) : mark.isWorst ? (
                        <span className="sr-only"> (worst lap)</span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right font-mono text-[var(--text-secondary)]">
                      {formatStopwatchTime(entry.totalTime)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            The best and worst laps are marked with screen-reader labels.
          </p>
        </ToolPanel>
      ) : null}

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        The stopwatch counts from wall-clock timestamps, so background throttling or an interrupted
        app cannot lose time. Timekeeping is best-effort by design; it is not an exact alarm.
        Nothing is saved or uploaded; this tool has no network access.
      </p>
    </div>
  )
}
