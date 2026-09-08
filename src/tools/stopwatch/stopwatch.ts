/**
 * Pure stopwatch model. Elapsed time is always reconstructed from wall-clock
 * anchors (per ADR 0014), never by counting interval ticks, so background
 * WebView throttling or process recreation cannot lose time.
 */

export interface LapRecord {
  id: string
  /** Milliseconds for this lap alone. */
  lapTime: number
  /** Total elapsed milliseconds at the moment the lap was recorded. */
  totalTime: number
}

/** Anchored running state: elapsed ms at the moment the clock was started. */
export interface StopwatchAnchor {
  startedAtMs: number
  elapsedAtStartMs: number
}

export function computeElapsedMs(
  anchor: StopwatchAnchor | null,
  fallbackMs: number,
  nowMs: number,
): number {
  if (anchor === null) return fallbackMs
  return Math.max(0, anchor.elapsedAtStartMs + Math.max(0, nowMs - anchor.startedAtMs))
}

/**
 * Formats elapsed milliseconds as `mm:ss.cc`, rolling to `hhh:mm:ss.cc` and
 * beyond for runs longer than an hour. Centiseconds come from the wall clock.
 */
export function formatStopwatchTime(ms: number): string {
  const safe = Math.max(0, ms)
  const hours = Math.floor(safe / 3_600_000)
  const minutes = Math.floor((safe % 3_600_000) / 60_000)
  const seconds = Math.floor((safe % 60_000) / 1000)
  const centiseconds = Math.floor((safe % 1000) / 10)
  const pad = (value: number, width = 2) => String(value).padStart(width, "0")
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`
}

/** Records a lap from the current elapsed time; laps are stored newest-first. */
export function recordLap(laps: readonly LapRecord[], elapsedMs: number, id: string): LapRecord[] {
  const previousTotal = laps.length > 0 ? (laps[0]?.totalTime ?? 0) : 0
  return [
    {
      id,
      lapTime: Math.max(0, elapsedMs - previousTotal),
      totalTime: elapsedMs,
    },
    ...laps,
  ]
}

export interface LapMark {
  isBest: boolean
  isWorst: boolean
}

/**
 * Marks the best and worst laps. A lap shared by several entries (identical
 * times) is marked on all of them; single-lap runs have no best or worst.
 */
export function markExtremes(laps: readonly LapRecord[]): LapMark[] {
  if (laps.length < 2) return laps.map(() => ({ isBest: false, isWorst: false }))
  const times = laps.map((lap) => lap.lapTime)
  const best = Math.min(...times)
  const worst = Math.max(...times)
  return laps.map((lap) => ({ isBest: lap.lapTime === best, isWorst: lap.lapTime === worst }))
}
