/**
 * Pure chart data model and summary helpers.
 *
 * Upstream (`components/tools/dev/chart-generator.tsx`) interpolated raw
 * number inputs into the drawing code, generated new points with
 * `Math.random`, and offered only a canvas with no text equivalent. Values
 * here are parsed as bounded finite numbers, point generation uses the
 * platform RandomService, and the pure summary table below is the
 * accessible representation of what the canvas draws.
 */

export type ChartType = "bar" | "line" | "pie"

export interface DataPoint {
  label: string
  value: number
}

export interface ChartColorScheme {
  name: string
  colors: string[]
}

/** Upstream color schemes, verbatim. */
export const chartColorSchemes: ChartColorScheme[] = [
  {
    name: "Indigo",
    colors: [
      "#6366f1",
      "#06b6d4",
      "#f59e0b",
      "#ef4444",
      "#10b981",
      "#8b5cf6",
      "#ec4899",
      "#14b8a6",
      "#f97316",
      "#3b82f6",
    ],
  },
  {
    name: "Pastel",
    colors: [
      "#a78bfa",
      "#67e8f9",
      "#fcd34d",
      "#fca5a5",
      "#6ee7b7",
      "#c4b5fd",
      "#f9a8d4",
      "#5eead4",
      "#fdba74",
      "#93c5fd",
    ],
  },
  {
    name: "Warm",
    colors: [
      "#ef4444",
      "#f97316",
      "#f59e0b",
      "#eab308",
      "#84cc16",
      "#22c55e",
      "#14b8a6",
      "#06b6d4",
      "#3b82f6",
      "#8b5cf6",
    ],
  },
  {
    name: "Cool",
    colors: [
      "#3b82f6",
      "#6366f1",
      "#8b5cf6",
      "#a855f7",
      "#d946ef",
      "#ec4899",
      "#f43f5e",
      "#14b8a6",
      "#06b6d4",
      "#0ea5e9",
    ],
  },
]

export const chartTypes: ReadonlyArray<{ id: ChartType; label: string }> = [
  { id: "bar", label: "Bar" },
  { id: "line", label: "Line" },
  { id: "pie", label: "Pie" },
]

export const defaultDataPoints: DataPoint[] = [
  { label: "A", value: 40 },
  { label: "B", value: 65 },
  { label: "C", value: 30 },
  { label: "D", value: 80 },
  { label: "E", value: 55 },
]

export const maximumDataPoints = 20
export const maximumPointValue = 1_000_000

/** Parses a value input as a bounded finite number; garbage yields null. */
export function parseChartValue(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.min(maximumPointValue, value)
}

/** A lowercase letter series label like the upstream A/B/C defaults. */
export function nextPointLabel(existingCount: number): string {
  return String.fromCharCode(65 + (existingCount % 26))
}

/** Derives a fresh demo value in [10, 100] from secure platform bytes. */
export function nextDemoValue(bytes: Uint8Array): number {
  return 10 + ((bytes[0] ?? 0) % 91)
}

export interface SummaryRow {
  label: string
  value: number
  sharePercent: number
}

/**
 * Builds the text equivalent of the drawn chart: one row per point with its
 * share of the total. Zero totals (all-zero values) report 0% shares.
 */
export function buildChartSummary(data: DataPoint[]): SummaryRow[] {
  const total = data.reduce((sum, point) => sum + point.value, 0)
  return data.map((point) => ({
    label: point.label,
    value: point.value,
    sharePercent: total > 0 ? Math.round((point.value / total) * 100) : 0,
  }))
}

export function formatChartSummaryLine(rows: SummaryRow[], chartType: ChartType): string {
  const title =
    chartType === "bar" ? "Bar chart" : chartType === "line" ? "Line chart" : "Pie chart"
  if (rows.length === 0) return `${title} with no data points.`
  const parts = rows.map((row) => `${row.label}: ${row.value} (${row.sharePercent}%)`)
  return `${title} with ${rows.length} data point${rows.length === 1 ? "" : "s"}: ${parts.join(", ")}.`
}
