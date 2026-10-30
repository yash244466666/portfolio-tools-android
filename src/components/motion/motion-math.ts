/** Pure helpers shared by the motion primitives. Original work for this repository. */

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function normalizeHeading(value: number): number {
  if (!Number.isFinite(value)) return 0
  return ((value % 360) + 360) % 360
}

/**
 * Shortest signed rotation from one heading to another in [-180, 180].
 * Used so a compass needle never spins the long way across north.
 */
export function shortestAngleDelta(from: number, to: number): number {
  const delta = normalizeHeading(to) - normalizeHeading(from)
  if (delta > 180) return delta - 360
  if (delta < -180) return delta + 360
  return delta
}

/** Converts a value in [minimum, maximum] to a 0–1 fraction. */
export function fractionOf(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(minimum) || !Number.isFinite(maximum)) return 0
  if (maximum <= minimum) return 0
  return clamp01((value - minimum) / (maximum - minimum))
}
