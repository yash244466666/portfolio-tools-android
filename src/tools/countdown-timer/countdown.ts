/**
 * Pure countdown timer model. Like the Pomodoro (ADR 0014), a running
 * countdown is a wall-clock deadline rather than a tick counter, so WebView
 * timer throttling in the background cannot make it run slow. Completion is
 * best-effort: exact alarm delivery is never promised.
 */

export const maximumHours = 99
export const maximumMinutesOrSeconds = 59

export interface CountdownComponents {
  hours: string
  minutes: string
  seconds: string
}

function clampField(value: string, maximum: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return 0
  return Math.min(maximum, parsed)
}

/** Parses the three fields as clamped non-negative integers. */
export function parseCountdownFields(components: CountdownComponents): number {
  return (
    clampField(components.hours, maximumHours) * 3600 +
    clampField(components.minutes, maximumMinutesOrSeconds) * 60 +
    clampField(components.seconds, maximumMinutesOrSeconds)
  )
}

export function formatCountdownDisplay(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00"
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":")
}

export function countdownProgressPercent(remainingSeconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0
  const remaining = Math.max(0, Math.min(totalSeconds, remainingSeconds))
  return ((totalSeconds - remaining) / totalSeconds) * 100
}

/** Wall-clock deadline (epoch ms) for a countdown started now. */
export function countdownDeadlineMs(startedAtMs: number, totalSeconds: number): number {
  return startedAtMs + totalSeconds * 1000
}

/** Remaining whole seconds derived from the wall-clock deadline. */
export function computeCountdownRemainingSeconds(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))
}

export const countdownPresets: ReadonlyArray<{
  label: string
  hours: string
  minutes: string
  seconds: string
}> = [
  { label: "1 min", hours: "0", minutes: "1", seconds: "0" },
  { label: "5 min", hours: "0", minutes: "5", seconds: "0" },
  { label: "10 min", hours: "0", minutes: "10", seconds: "0" },
  { label: "15 min", hours: "0", minutes: "15", seconds: "0" },
  { label: "30 min", hours: "0", minutes: "30", seconds: "0" },
  { label: "1 hour", hours: "1", minutes: "0", seconds: "0" },
]