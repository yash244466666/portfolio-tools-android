/** Pure ambient-light labels and formatting for the Light Meter. Original work. */

export interface LightLevel {
  label: string
  description: string
}

export function lightLevel(lux: number): LightLevel | null {
  if (!Number.isFinite(lux) || lux < 0) return null
  if (lux < 10) return { label: "Very dark", description: "Deep shade or a dark room" }
  if (lux < 50) return { label: "Dim", description: "Dim indoor lighting" }
  if (lux < 200) return { label: "Indoor", description: "Typical indoor lighting" }
  if (lux < 1_000) return { label: "Bright indoor", description: "Bright indoor or task lighting" }
  if (lux < 10_000) return { label: "Overcast", description: "Overcast daylight" }
  return { label: "Daylight", description: "Direct or bright daylight" }
}

export function formatLux(lux: number): string {
  if (!Number.isFinite(lux) || lux < 0) return ""
  if (lux < 10) return `${lux.toFixed(1)} lx`
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(lux)} lx`
}
