import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import { usePlatform } from "@/platform/platform-context"
import {
  clampBreakMinutes,
  clampWorkMinutes,
  computeRemainingMs,
  defaultBreakMinutes,
  defaultWorkMinutes,
  formatClock,
  migrateTimer,
  phaseDurationMs,
  pomodoroNotificationId,
  pomodoroStorageKey,
  reconstructTimer,
  serializeTimer,
  type StoredTimer,
  type TimerMode,
  type TimerState,
} from "./pomodoro"

const tickIntervalMs = 250

function phaseAnnouncement(mode: TimerMode): { title: string; body: string; status: string } {
  return mode === "work"
    ? {
        title: "Break time",
        body: "Your work session is complete.",
        status: "Work session complete. Take a break.",
      }
    : {
        title: "Back to work",
        body: "Break is over.",
        status: "Break over. Back to work.",
      }
}

export default function PomodoroTimer() {
  const { preferences, notifications, haptics } = usePlatform()
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<TimerMode>("work")
  const [state, setState] = useState<TimerState>("idle")
  const [sessions, setSessions] = useState(0)
  const [workMinutes, setWorkMinutes] = useState(defaultWorkMinutes)
  const [breakMinutes, setBreakMinutes] = useState(defaultBreakMinutes)
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [anchor, setAnchor] = useState<{ startedAtMs: number; remainingAtStartMs: number } | null>(
    null,
  )
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [status, setStatus] = useState("")

  // Rebuild the durable timer once on mount. A running phase whose time expired while
  // the process was away completes at most one boundary and lands idle in the next
  // phase; notifications that were missed are not replayed (best-effort by design).
  useEffect(() => {
    let cancelled = false
    void preferences.get<unknown>(pomodoroStorageKey).then((raw) => {
      if (cancelled) return
      const migrated = migrateTimer(raw)
      if (migrated.status === "ok") {
        const timer = reconstructTimer(migrated.timer, Date.now())
        setMode(timer.mode)
        setState(timer.state)
        setSessions(timer.sessions)
        setWorkMinutes(timer.workMinutes)
        setBreakMinutes(timer.breakMinutes)
        setNotifyEnabled(timer.notifyEnabled)
        if (timer.state === "running") {
          setAnchor({ startedAtMs: timer.startedAtMs, remainingAtStartMs: timer.remainingMs })
        } else {
          setPausedRemainingMs(timer.remainingMs)
        }
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [preferences])

  const persist = useCallback(
    (snapshot: Omit<StoredTimer, "schemaVersion" | "updatedAt">) => {
      // A failed durable write never stops the in-session timer; the copy simply stays
      // at its last persisted point.
      void preferences.set(pomodoroStorageKey, serializeTimer(snapshot, new Date())).catch(() => {})
    },
    [preferences],
  )

  const durationMs = phaseDurationMs(mode, workMinutes, breakMinutes)
  const remainingMs =
    state === "running" && anchor
      ? computeRemainingMs(anchor.startedAtMs, anchor.remainingAtStartMs, now)
      : (pausedRemainingMs ?? durationMs)

  const scheduleAlert = useCallback(
    (startedAtMs: number, remainingAtStartMs: number, alertMode: TimerMode) => {
      const announcement = phaseAnnouncement(alertMode)
      void notifications
        .schedule({
          id: pomodoroNotificationId,
          title: announcement.title,
          body: announcement.body,
          at: new Date(startedAtMs + remainingAtStartMs),
          channelId: "timers",
        })
        .catch(() => setStatus("The phase-end alert could not be scheduled."))
    },
    [notifications],
  )

  const completePhase = useCallback(() => {
    if (!anchor) return
    const nextMode: TimerMode = mode === "work" ? "break" : "work"
    const nextDurationMs = phaseDurationMs(nextMode, workMinutes, breakMinutes)
    const nextSessions = mode === "work" ? sessions + 1 : sessions
    const startedAtMs = Date.now()
    void notifications.cancel(pomodoroNotificationId)
    setMode(nextMode)
    setSessions(nextSessions)
    setAnchor({ startedAtMs, remainingAtStartMs: nextDurationMs })
    setStatus(phaseAnnouncement(mode).status)
    void haptics.confirm()
    if (notifyEnabled) scheduleAlert(startedAtMs, nextDurationMs, nextMode)
    persist({
      mode: nextMode,
      state: "running",
      workMinutes,
      breakMinutes,
      sessions: nextSessions,
      notifyEnabled,
      startedAtMs,
      remainingMs: nextDurationMs,
    })
  }, [
    anchor,
    mode,
    workMinutes,
    breakMinutes,
    sessions,
    notifyEnabled,
    notifications,
    haptics,
    scheduleAlert,
    persist,
  ])

  // The interval only refreshes the display and detects completion; correctness comes
  // from the wall-clock anchor, so background throttling cannot drift the timer.
  useEffect(() => {
    if (state !== "running" || !anchor) return
    const interval = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (computeRemainingMs(anchor.startedAtMs, anchor.remainingAtStartMs, current) <= 0) {
        completePhase()
      }
    }, tickIntervalMs)
    return () => window.clearInterval(interval)
  }, [state, anchor, completePhase])

  const start = useCallback(() => {
    const startedAtMs = Date.now()
    const remainingAtStartMs = pausedRemainingMs ?? phaseDurationMs(mode, workMinutes, breakMinutes)
    void notifications.cancel(pomodoroNotificationId)
    setState("running")
    setAnchor({ startedAtMs, remainingAtStartMs })
    setPausedRemainingMs(null)
    setStatus(mode === "work" ? "Focus session running." : "Break running.")
    if (notifyEnabled) scheduleAlert(startedAtMs, remainingAtStartMs, mode)
    persist({
      mode,
      state: "running",
      workMinutes,
      breakMinutes,
      sessions,
      notifyEnabled,
      startedAtMs,
      remainingMs: remainingAtStartMs,
    })
  }, [
    pausedRemainingMs,
    mode,
    workMinutes,
    breakMinutes,
    notifyEnabled,
    sessions,
    notifications,
    scheduleAlert,
    persist,
  ])

  const pause = useCallback(() => {
    if (state !== "running" || !anchor) return
    const remaining = computeRemainingMs(anchor.startedAtMs, anchor.remainingAtStartMs, Date.now())
    void notifications.cancel(pomodoroNotificationId)
    setState("paused")
    setPausedRemainingMs(remaining)
    setAnchor(null)
    setStatus("Timer paused.")
    persist({
      mode,
      state: "paused",
      workMinutes,
      breakMinutes,
      sessions,
      notifyEnabled,
      startedAtMs: 0,
      remainingMs: remaining,
    })
  }, [
    state,
    anchor,
    mode,
    workMinutes,
    breakMinutes,
    sessions,
    notifyEnabled,
    notifications,
    persist,
  ])

  const reset = useCallback(() => {
    void notifications.cancel(pomodoroNotificationId)
    setState("idle")
    setMode("work")
    setPausedRemainingMs(phaseDurationMs("work", workMinutes, breakMinutes))
    setAnchor(null)
    setStatus("Timer reset.")
    persist({
      mode: "work",
      state: "idle",
      workMinutes,
      breakMinutes,
      sessions,
      notifyEnabled,
      startedAtMs: 0,
      remainingMs: phaseDurationMs("work", workMinutes, breakMinutes),
    })
  }, [workMinutes, breakMinutes, sessions, notifyEnabled, notifications, persist])

  const switchMode = useCallback(
    (nextMode: TimerMode) => {
      if (state === "running") return
      void notifications.cancel(pomodoroNotificationId)
      setState("idle")
      setMode(nextMode)
      setPausedRemainingMs(phaseDurationMs(nextMode, workMinutes, breakMinutes))
      setAnchor(null)
      setStatus(nextMode === "work" ? "Work phase selected." : "Break phase selected.")
      persist({
        mode: nextMode,
        state: "idle",
        workMinutes,
        breakMinutes,
        sessions,
        notifyEnabled,
        startedAtMs: 0,
        remainingMs: phaseDurationMs(nextMode, workMinutes, breakMinutes),
      })
    },
    [state, workMinutes, breakMinutes, sessions, notifyEnabled, notifications, persist],
  )

  const changeWorkMinutes = useCallback(
    (value: number) => {
      const clamped = clampWorkMinutes(value)
      setWorkMinutes(clamped)
      if (state !== "running" && mode === "work") {
        setPausedRemainingMs(clamped * 60_000)
      }
    },
    [state, mode],
  )

  const changeBreakMinutes = useCallback(
    (value: number) => {
      const clamped = clampBreakMinutes(value)
      setBreakMinutes(clamped)
      if (state !== "running" && mode === "break") {
        setPausedRemainingMs(clamped * 60_000)
      }
    },
    [state, mode],
  )

  async function toggleAlerts() {
    if (notifyEnabled) {
      await notifications.cancel(pomodoroNotificationId)
      setNotifyEnabled(false)
      setStatus("Phase-end alerts turned off.")
      return
    }
    // Permission is requested only when the user enables alert behavior.
    const result = await notifications.requestPermission()
    if (!result.granted) {
      setStatus(
        result.canAskAgain
          ? "Notification permission was declined. Enable it in system settings to get alerts."
          : "Notifications are not available on this device, but the timer keeps running.",
      )
      return
    }
    setNotifyEnabled(true)
    setStatus("You will be alerted at the end of each phase.")
    if (state === "running" && anchor) {
      scheduleAlert(anchor.startedAtMs, anchor.remainingAtStartMs, mode)
    }
  }

  const modeLabel = mode === "work" ? "Focus time" : "Break time"
  const primaryAction =
    state === "running" ? (
      <Button onClick={pause}>Pause</Button>
    ) : (
      <Button onClick={start}>{state === "paused" ? "Resume" : "Start"}</Button>
    )

  const busyHint = useMemo(
    () =>
      "Runs from the device clock, so it stays accurate while the app is in the background. " +
      "Alerts are best-effort; exact delivery is not guaranteed.",
    [],
  )

  return (
    <div className="grid gap-4">
      <ToolPanel>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              aria-pressed={mode === "work"}
              disabled={state === "running"}
              onClick={() => switchMode("work")}
              variant={mode === "work" ? "primary" : "secondary"}
            >
              Work ({workMinutes} min)
            </Button>
            <Button
              aria-pressed={mode === "break"}
              disabled={state === "running"}
              onClick={() => switchMode("break")}
              variant={mode === "break" ? "primary" : "secondary"}
            >
              Break ({breakMinutes} min)
            </Button>
          </div>

          <div className="grid justify-items-center gap-3">
            <ResultReveal token={mode}>
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {modeLabel}
              </p>
            </ResultReveal>
            <p
              aria-label={`Timer, ${formatClock(remainingMs)} remaining`}
              className="font-mono text-6xl font-bold tabular-nums text-[var(--text)]"
              role="timer"
            >
              {formatClock(remainingMs)}
            </p>
            <progress
              aria-label="Phase progress"
              className="h-2 w-full max-w-md"
              max={durationMs}
              value={Math.max(0, durationMs - remainingMs)}
            />
            <p className="text-sm text-[var(--text-secondary)]">
              {sessions} completed {sessions === 1 ? "session" : "sessions"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {primaryAction}
            <Button disabled={!loaded} onClick={reset} variant="secondary">
              Reset
            </Button>
          </div>
          <Button
            aria-pressed={notifyEnabled}
            disabled={!loaded}
            onClick={() => void toggleAlerts()}
            variant="quiet"
          >
            {notifyEnabled ? "Alerts on" : "Alert me at phase end"}
          </Button>
          {status ? (
            <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel title="Durations">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            hint="Between 1 and 60 minutes."
            htmlFor="pomodoro-work"
            label="Work duration (minutes)"
          >
            <input
              className="app-input"
              disabled={state === "running"}
              id="pomodoro-work"
              max={60}
              min={1}
              onChange={(event) => changeWorkMinutes(Number(event.target.value))}
              type="number"
              value={workMinutes}
            />
          </Field>
          <Field
            hint="Between 1 and 30 minutes."
            htmlFor="pomodoro-break"
            label="Break duration (minutes)"
          >
            <input
              className="app-input"
              disabled={state === "running"}
              id="pomodoro-break"
              max={30}
              min={1}
              onChange={(event) => changeBreakMinutes(Number(event.target.value))}
              type="number"
              value={breakMinutes}
            />
          </Field>
          <p className="text-xs leading-5 text-[var(--text-secondary)] sm:col-span-2">{busyHint}</p>
        </div>
      </ToolPanel>
    </div>
  )
}
