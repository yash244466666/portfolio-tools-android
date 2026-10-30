import {
  sensorKinds,
  type SensorAvailability,
  type SensorKind,
  type SensorSample,
} from "@/platform/contracts"

/** Sampling bounds shared by the web adapter and documented to the native bridge. */
export const minimumSensorIntervalMs = 20
export const maximumSensorIntervalMs = 500
export const defaultSensorIntervalMs = 50

export function isSensorKind(value: unknown): value is SensorKind {
  return typeof value === "string" && (sensorKinds as readonly string[]).includes(value)
}

/**
 * Validates one subscription request and clamps its interval into 20–500 ms
 * (2–50 Hz). Unknown or duplicate kinds and non-finite intervals are rejected
 * rather than silently dropped.
 */
export function normalizeSensorRequest(
  kinds: readonly string[],
  intervalMs?: number,
): { kinds: SensorKind[]; intervalMs: number } | null {
  if (!Array.isArray(kinds) || kinds.length === 0 || kinds.length > sensorKinds.length) return null
  const unique: SensorKind[] = []
  for (const kind of kinds) {
    if (!isSensorKind(kind) || unique.includes(kind)) return null
    unique.push(kind)
  }
  if (intervalMs !== undefined && (!Number.isFinite(intervalMs) || intervalMs <= 0)) return null
  const requested = intervalMs ?? defaultSensorIntervalMs
  const interval = Math.min(
    maximumSensorIntervalMs,
    Math.max(minimumSensorIntervalMs, Math.round(requested)),
  )
  return { kinds: unique, intervalMs: interval }
}

/** Validates one bridge sample against the active kinds; invalid payloads are dropped. */
export function validatedSensorSample(
  raw: unknown,
  activeKinds: ReadonlySet<SensorKind>,
): SensorSample | null {
  if (typeof raw !== "object" || raw === null) return null
  const record = raw as Record<string, unknown>
  if (!isSensorKind(record.kind) || !activeKinds.has(record.kind)) return null
  if (typeof record.timestampMs !== "number" || !Number.isFinite(record.timestampMs)) return null
  if (!Array.isArray(record.values)) return null
  const expected = record.kind === "barometer" || record.kind === "light" ? 1 : 3
  if (record.values.length !== expected) return null
  if (!record.values.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return null
  }
  const accuracy =
    typeof record.accuracy === "number" && Number.isFinite(record.accuracy)
      ? Math.min(3, Math.max(0, Math.round(record.accuracy)))
      : 0
  return {
    kind: record.kind,
    timestampMs: record.timestampMs,
    values: record.values as number[],
    accuracy,
  }
}

/** Validates the bridge's availability list and keeps the first row per kind. */
export function validatedSensorAvailability(raw: unknown): SensorAvailability[] | null {
  if (!Array.isArray(raw)) return null
  const result: SensorAvailability[] = []
  const seen = new Set<SensorKind>()
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null
    const record = entry as Record<string, unknown>
    if (!isSensorKind(record.kind) || typeof record.available !== "boolean") return null
    if (seen.has(record.kind)) continue
    seen.add(record.kind)
    result.push({ kind: record.kind, available: record.available })
  }
  return result
}
