/**
 * Pure two-axis level/tilt math. The accelerometer vector includes gravity;
 * at rest its direction is "down", so the angle between it and a calibrated
 * zero vector is the surface tilt. Original work for this repository.
 */
export interface TiltReading {
  x: number
  y: number
  z: number
  magnitude: number
  rollDeg: number
  pitchDeg: number
  /** Angle from the calibrated zero vector, or from horizontal when uncalibrated. */
  tiltDeg: number
}

export interface CalibratedTilt {
  rollDeg: number
  pitchDeg: number
  tiltDeg: number
}

const degrees = 180 / Math.PI

function validComponents(values: readonly number[]): boolean {
  return values.length === 3 && values.every((value) => Number.isFinite(value))
}

/** Converts an accelerometer sample to roll, pitch, and horizontal tilt. */
export function tiltFromAcceleration(values: readonly number[]): TiltReading | null {
  if (!validComponents(values)) return null
  const [x, y, z] = values as [number, number, number]
  const magnitude = Math.hypot(x, y, z)
  if (!Number.isFinite(magnitude) || magnitude < 1 || magnitude > 100) return null
  return {
    x,
    y,
    z,
    magnitude,
    rollDeg: Math.atan2(x, Math.hypot(y, z)) * degrees,
    pitchDeg: Math.atan2(y, Math.hypot(x, z)) * degrees,
    tiltDeg: Math.acos(Math.min(1, Math.max(0, Math.abs(z) / magnitude))) * degrees,
  }
}

/** Subtracts the calibrated zero vector and reports the relative angles. */
export function calibratedTilt(
  reading: TiltReading,
  zero: { x: number; y: number; z: number },
): CalibratedTilt | null {
  const zeroMagnitude = Math.hypot(zero.x, zero.y, zero.z)
  if (!Number.isFinite(zeroMagnitude) || zeroMagnitude < 1) return null
  const dot = reading.x * zero.x + reading.y * zero.y + reading.z * zero.z
  const cosine = dot / (reading.magnitude * zeroMagnitude)
  const tiltDeg = Math.acos(Math.min(1, Math.max(-1, cosine))) * degrees
  const zeroRoll = Math.atan2(zero.x, Math.hypot(zero.y, zero.z)) * degrees
  const zeroPitch = Math.atan2(zero.y, Math.hypot(zero.x, zero.z)) * degrees
  return {
    rollDeg: reading.rollDeg - zeroRoll,
    pitchDeg: reading.pitchDeg - zeroPitch,
    tiltDeg,
  }
}

/** True when both axes are within the tolerance from zero. */
export function isLevel(
  tilt: Pick<CalibratedTilt, "rollDeg" | "pitchDeg">,
  toleranceDeg = 1,
): boolean {
  return Math.abs(tilt.rollDeg) <= toleranceDeg && Math.abs(tilt.pitchDeg) <= toleranceDeg
}

export function levelLabel(tilt: Pick<CalibratedTilt, "rollDeg" | "pitchDeg">): "Level" | "Tilted" {
  return isLevel(tilt) ? "Level" : "Tilted"
}

export function formatAngle(value: number): string {
  return `${value.toFixed(1)}°`
}
