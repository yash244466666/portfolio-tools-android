/**
 * Pure barometric altitude and short session-trend math. Altitude is the
 * standard-atmosphere estimate and depends entirely on the user-supplied
 * sea-level pressure; it is not a GPS or surveyed elevation. Original work.
 */
export const standardSeaLevelHpa = 1013.25
export const minimumPressureHpa = 300
export const maximumPressureHpa = 1100
export const trendWindowMs = 60_000

/** Standard-atmosphere altitude in metres for a pressure and sea-level reference. */
export function altitudeFromPressure(
  pressureHpa: number,
  seaLevelHpa = standardSeaLevelHpa,
): number | null {
  if (
    !Number.isFinite(pressureHpa) ||
    !Number.isFinite(seaLevelHpa) ||
    pressureHpa < minimumPressureHpa ||
    pressureHpa > maximumPressureHpa ||
    seaLevelHpa < 800 ||
    seaLevelHpa > 1100
  ) {
    return null
  }
  return 44330 * (1 - Math.pow(pressureHpa / seaLevelHpa, 1 / 5.255))
}

export interface PressureSample {
  timestampMs: number
  hPa: number
}

export interface PressureTrend {
  deltaHpa: number
  label: "Rising" | "Falling" | "Steady"
}

/**
 * Short session trend over the last 60 seconds, not a weather forecast. Fewer
 * than two samples or a span under five seconds is reported as unavailable.
 */
export function pressureTrend(
  samples: readonly PressureSample[],
  windowMs = trendWindowMs,
): PressureTrend | null {
  if (samples.length < 2) return null
  const latest = Math.max(...samples.map((sample) => sample.timestampMs))
  const recent = samples.filter(
    (sample) =>
      Number.isFinite(sample.hPa) &&
      sample.timestampMs >= latest - windowMs &&
      sample.timestampMs <= latest,
  )
  if (recent.length < 2) return null
  const first = recent[0]
  const last = recent[recent.length - 1]
  if (!first || !last || last.timestampMs - first.timestampMs < 5_000) return null
  const deltaHpa = last.hPa - first.hPa
  return {
    deltaHpa,
    label: deltaHpa > 0.3 ? "Rising" : deltaHpa < -0.3 ? "Falling" : "Steady",
  }
}

export function formatPressure(hPa: number): string {
  return `${hPa.toFixed(2)} hPa`
}

export function formatAltitude(metres: number): string {
  return `${metres.toFixed(1)} m · ${(metres * 3.28084).toFixed(0)} ft`
}
