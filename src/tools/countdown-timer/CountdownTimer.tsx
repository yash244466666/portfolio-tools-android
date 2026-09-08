import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import {
  computeCountdownRemainingSeconds,
  countdownDeadlineMs,
  countdownPresets,
  countdownProgressPercent,
  formatCountdownDisplay,
  parseCountdownFields,
  type CountdownComponents,
} from "./countdown"

export default function CountdownTimer() {
  const { haptics } = usePlatform()
  const [fields, setFields] = useState<CountdownComponents>({
    hours: "0",
    minutes: "5",
    seconds: "0",
  })
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const deadlineRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // The countdown is a wall-clock deadline, not a tick counter: throttled
  // background timers cannot make it run slow.
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const next = computeCountdownRemainingSeconds(deadlineRef.current, Date.now())
      setRemaining(next)
      if (next <= 0) {
        if (intervalRef.current !== null) clearInterval(intervalRef.current)
        intervalRef.current = null
        setRunning(false)
        setFinished(true)
        void haptics.confirm()
      }
    }
    tick()
    intervalRef.current = setInterval(tick, 250)
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running, haptics])

  function setField(part: keyof CountdownComponents, value: string) {
    setFields((prev) => ({ ...prev, [part]: value }))
  }

  function start() {
    const total = parseCountdownFields(fields)
    if (total <= 0) return
    if (!started) {
      setTotalSeconds(total)
      setRemaining(total)
    }
    deadlineRef.current = countdownDeadlineMs(Date.now(), remaining > 0 ? remaining : total)
    setStarted(true)
    setRunning(true)
    setFinished(false)
  }

  function pause() {
    if (intervalRef.current !== null) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRemaining(computeCountdownRemainingSeconds(deadlineRef.current, Date.now()))
    setRunning(false)
  }

  function reset() {
    if (intervalRef.current !== null) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
    setStarted(false)
    setFinished(false)
    setRemaining(0)
    setTotalSeconds(0)
  }

  function applyPreset(preset: (typeof countdownPresets)[number]) {
    setFields({ hours: preset.hours, minutes: preset.minutes, seconds: preset.seconds })
  }

  const error =
    !started && parseCountdownFields(fields) <= 0
      ? "Enter a duration of at least one second."
      : undefined
  const progress = countdownProgressPercent(remaining, totalSeconds)
  const circumference = 2 * Math.PI * 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="grid gap-4">
      <ToolPanel title="Duration">
        {!started ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Hours" htmlFor="countdown-hours">
                <input
                  className="app-input text-center font-mono"
                  id="countdown-hours"
                  inputMode="numeric"
                  onChange={(event) => setField("hours", event.target.value)}
                  value={fields.hours}
                />
              </Field>
              <Field label="Minutes" htmlFor="countdown-minutes">
                <input
                  className="app-input text-center font-mono"
                  id="countdown-minutes"
                  inputMode="numeric"
                  onChange={(event) => setField("minutes", event.target.value)}
                  value={fields.minutes}
                />
              </Field>
              <Field label="Seconds" htmlFor="countdown-seconds">
                <input
                  className="app-input text-center font-mono"
                  id="countdown-seconds"
                  inputMode="numeric"
                  onChange={(event) => setField("seconds", event.target.value)}
                  value={fields.seconds}
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {countdownPresets.map((preset) => (
                <Button key={preset.label} onClick={() => applyPreset(preset)} variant="quiet">
                  {preset.label}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Duration {formatCountdownDisplay(totalSeconds)}. Reset to change it.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {running ? (
            <Button onClick={pause} variant="secondary">
              Pause
            </Button>
          ) : (
            <Button disabled={error !== undefined} onClick={start}>
              {started ? "Resume" : "Start"}
            </Button>
          )}
          {started ? (
            <Button onClick={reset} variant="quiet">
              Reset
            </Button>
          ) : null}
        </div>
        {error !== undefined ? (
          <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </ToolPanel>

      <ToolPanel title="Countdown">
        <div className="flex justify-center">
          <div className="relative h-52 w-52">
            <svg aria-hidden="true" className="h-full w-full -rotate-90" viewBox="0 0 200 200">
              <circle
                className="text-[var(--surface-muted)]"
                cx="100"
                cy="100"
                fill="none"
                r="90"
                stroke="currentColor"
                strokeWidth="6"
              />
              <circle
                className={finished ? "text-[var(--danger)]" : "text-[var(--accent)]"}
                cx="100"
                cy="100"
                fill="none"
                r="90"
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="6"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p
                aria-label="Remaining time"
                className="font-mono text-3xl tabular-nums tracking-wider"
                role="timer"
              >
                {formatCountdownDisplay(remaining)}
              </p>
              {finished ? (
                <p className="mt-2 text-sm font-medium" role="alert">
                  Time is up!
                </p>
              ) : started ? (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {running ? "Running" : "Paused"}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <p aria-live="polite" className="sr-only" role="status">
          {finished
            ? "The countdown finished."
            : running
              ? "Countdown running."
              : started
                ? "Countdown paused."
                : "Countdown idle."}
        </p>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          {started
            ? `${Math.round(progress)}% elapsed. The ring is decorative; the remaining time above is the source of truth.`
            : "The progress ring fills as the countdown runs."}
        </p>
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        The countdown tracks a wall-clock deadline, so background throttling or an interrupted app
        cannot make it run slow. Completion is best-effort by design; an exact alarm is never
        promised. Nothing is saved or uploaded; this tool has no network access.
      </p>
    </div>
  )
}
