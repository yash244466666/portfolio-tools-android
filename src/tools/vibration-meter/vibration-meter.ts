/**
 * Pure rolling-window vibration metrics from linear-acceleration samples.
 * Linear acceleration excludes gravity, so a still phone reads near zero.
 * Original work for this repository.
 */
export interface VibrationSample {
  timestampMs: number
  values: readonly number[]
}

export interface VibrationReading {
  rms: number
  peak: number
  sampleCount: number
}

export const vibrationWindowMs = 1_000

export function magnitudeOf(values: readonly number[]): number | null {
  if (values.length !== 3 || !values.every((value) => Number.isFinite(value))) return null
  return Math.hypot(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0)
}

/** RMS and peak magnitude over the last second of samples. */
export function vibrationReading(
  samples: readonly VibrationSample[],
  windowMs = vibrationWindowMs,
): VibrationReading | null {
  if (samples.length === 0) return null
  const latest = Math.max(...samples.map((sample) => sample.timestampMs))
  const magnitudes: number[] = []
  for (const sample of samples) {
    if (sample.timestampMs < latest - windowMs || sample.timestampMs > latest) continue
    const magnitude = magnitudeOf(sample.values)
    if (magnitude !== null) magnitudes.push(magnitude)
  }
  if (magnitudes.length === 0) return null
  const meanSquare =
    magnitudes.reduce((sum, magnitude) => sum + magnitude * magnitude, 0) / magnitudes.length
  return {
    rms: Math.sqrt(meanSquare),
    peak: Math.max(...magnitudes),
    sampleCount: magnitudes.length,
  }
}

export function vibrationLabel(rms: number): "Quiet" | "Noticeable" | "Strong" {
  if (rms < 0.05) return "Quiet"
  if (rms < 0.5) return "Noticeable"
  return "Strong"
}

export function formatAcceleration(value: number): string {
  return `${value.toFixed(2)} m/s²`
}
