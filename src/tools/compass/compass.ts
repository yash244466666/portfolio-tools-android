/**
 * Pure tilt-compensated compass math. Replicates the Android rotation-matrix
 * azimuth convention (atan2(Ey, Ny), 0° = device top pointing north) so the
 * tool has a testable oracle independent of SensorManager. Original work for
 * this repository.
 */
export interface CompassReading {
  headingDeg: number
  cardinal: string
  /** Magnetometer magnitude in microteslas. */
  magneticStrength: number
  /** True when the field is far outside the usual 25–65 µT range. */
  interference: boolean
  accuracy: number
}

const degrees = 180 / Math.PI
const cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const

function cross(left: readonly number[], right: readonly number[]): [number, number, number] {
  return [
    (left[1] ?? 0) * (right[2] ?? 0) - (left[2] ?? 0) * (right[1] ?? 0),
    (left[2] ?? 0) * (right[0] ?? 0) - (left[0] ?? 0) * (right[2] ?? 0),
    (left[0] ?? 0) * (right[1] ?? 0) - (left[1] ?? 0) * (right[0] ?? 0),
  ]
}

function normalize(vector: readonly number[]): [number, number, number] | null {
  const magnitude = Math.hypot(vector[0] ?? 0, vector[1] ?? 0, vector[2] ?? 0)
  if (!Number.isFinite(magnitude) || magnitude === 0) return null
  return [(vector[0] ?? 0) / magnitude, (vector[1] ?? 0) / magnitude, (vector[2] ?? 0) / magnitude]
}

export function cardinalFromHeading(headingDeg: number): string {
  const normalized = ((headingDeg % 360) + 360) % 360
  return cardinals[Math.round(normalized / 45) % 8] ?? "N"
}

/**
 * Computes a heading from magnetometer and accelerometer samples. East is
 * magnetometer × gravity; north is gravity × east; the azimuth is
 * atan2(eastY, northY). Invalid/too-weak vectors return null.
 */
export function computeCompass(
  magnetometer: readonly number[],
  accelerometer: readonly number[],
  accuracy = 0,
): CompassReading | null {
  if (
    magnetometer.length !== 3 ||
    accelerometer.length !== 3 ||
    !magnetometer.every((value) => Number.isFinite(value)) ||
    !accelerometer.every((value) => Number.isFinite(value))
  ) {
    return null
  }
  const gravity = normalize(accelerometer)
  const field = normalize(magnetometer)
  if (!gravity || !field) return null
  const magneticStrength = Math.hypot(...magnetometer)
  if (magneticStrength < 5 || magneticStrength > 2000) return null
  const east = normalize(cross(magnetometer, accelerometer))
  if (!east) return null
  const north = normalize(cross(accelerometer, east))
  if (!north) return null
  const headingDeg = (((Math.atan2(east[1], north[1]) * degrees) % 360) + 360) % 360
  return {
    headingDeg,
    cardinal: cardinalFromHeading(headingDeg),
    magneticStrength,
    interference: magneticStrength < 20 || magneticStrength > 80,
    accuracy: Math.min(3, Math.max(0, Math.round(accuracy))),
  }
}

export function formatHeading(reading: CompassReading): string {
  return `${Math.round(reading.headingDeg)}° ${reading.cardinal}`
}

export function accuracyLabel(accuracy: number): string {
  switch (accuracy) {
    case 3:
      return "High"
    case 2:
      return "Medium"
    case 1:
      return "Low"
    default:
      return "Unreliable"
  }
}
