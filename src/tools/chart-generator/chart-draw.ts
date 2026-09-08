/**
 * Canvas drawing for the Chart Generator, kept separate from the pure data
 * module so component tests can exercise the summary path without a canvas.
 *
 * The drawing is theme-aware: colors come from computed CSS custom
 * properties instead of the upstream hardcoded white-on-dark palette, which
 * was invisible on light backgrounds.
 */

import type { ChartType, DataPoint } from "./chart"

export interface ChartThemeColors {
  grid: string
  text: string
  surface: string
}

export interface DrawChartOptions {
  data: DataPoint[]
  chartType: ChartType
  colors: string[]
  theme: ChartThemeColors
  /** CSS-pixel viewport of the canvas. */
  width: number
  height: number
  context: CanvasRenderingContext2D
}

export const chartPadding = { top: 30, right: 30, bottom: 50, left: 50 }

function drawGrid(
  context: CanvasRenderingContext2D,
  options: DrawChartOptions,
  chartH: number,
  maxVal: number,
) {
  const { theme, width } = options
  context.strokeStyle = theme.grid
  context.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = chartPadding.top + chartH * (1 - i / 5)
    context.beginPath()
    context.moveTo(chartPadding.left, y)
    context.lineTo(width - chartPadding.right, y)
    context.stroke()
    context.fillStyle = theme.text
    context.font = "11px monospace"
    context.textAlign = "right"
    context.fillText(String(Math.round((maxVal * i) / 5)), chartPadding.left - 8, y + 4)
  }
}

function drawBarChart(
  context: CanvasRenderingContext2D,
  options: DrawChartOptions,
  chartW: number,
  chartH: number,
  maxVal: number,
) {
  const { data, colors, theme, width } = options
  drawGrid(context, options, chartH, maxVal)
  const slot = chartW / data.length
  const barWidth = slot * 0.6
  data.forEach((point, i) => {
    const x = chartPadding.left + i * slot + slot * 0.2
    const barH = (point.value / maxVal) * chartH
    const y = chartPadding.top + chartH - barH
    context.fillStyle = colors[i % colors.length] ?? "#6366f1"
    context.fillRect(x, y, barWidth, barH)
    context.fillStyle = theme.text
    context.font = "12px sans-serif"
    context.textAlign = "center"
    context.fillText(point.label, x + barWidth / 2, chartPadding.top + chartH + 20)
    context.fillText(String(point.value), x + barWidth / 2, y - 8)
  })
  void width
}

function drawLineChart(
  context: CanvasRenderingContext2D,
  options: DrawChartOptions,
  chartW: number,
  chartH: number,
  maxVal: number,
) {
  const { data, colors, theme } = options
  drawGrid(context, options, chartH, maxVal)
  const stepX = chartW / Math.max(data.length - 1, 1)
  const points = data.map((point, i) => ({
    x: chartPadding.left + i * stepX,
    y: chartPadding.top + chartH - (point.value / maxVal) * chartH,
    label: point.label,
    value: point.value,
  }))
  context.beginPath()
  points.forEach((point, i) => {
    if (i === 0) context.moveTo(point.x, point.y)
    else context.lineTo(point.x, point.y)
  })
  context.strokeStyle = colors[0] ?? "#6366f1"
  context.lineWidth = 2.5
  context.stroke()
  points.forEach((point, i) => {
    context.beginPath()
    context.arc(point.x, point.y, 4, 0, Math.PI * 2)
    context.fillStyle = colors[0] ?? "#6366f1"
    context.fill()
    context.fillStyle = theme.text
    context.font = "11px sans-serif"
    context.textAlign = "center"
    context.fillText(String(point.value), point.x, point.y - 12)
    context.fillText(point.label, point.x, chartPadding.top + chartH + 20)
    void i
  })
}

function drawPieChart(
  context: CanvasRenderingContext2D,
  options: DrawChartOptions,
  chartW: number,
  chartH: number,
) {
  const { data, colors, theme, width, height } = options
  const cx = width / 2
  const cy = chartPadding.top + chartH / 2
  const radius = Math.min(chartW, chartH) / 2 - 10
  const total = data.reduce((sum, point) => sum + point.value, 0) || 1
  let startAngle = -Math.PI / 2
  data.forEach((point, i) => {
    const sliceAngle = (point.value / total) * Math.PI * 2
    const endAngle = startAngle + sliceAngle
    context.beginPath()
    context.moveTo(cx, cy)
    context.arc(cx, cy, radius, startAngle, endAngle)
    context.closePath()
    context.fillStyle = colors[i % colors.length] ?? "#6366f1"
    context.fill()
    if (sliceAngle > 0.2) {
      const midAngle = startAngle + sliceAngle / 2
      const labelRadius = radius * 0.65
      context.fillStyle = theme.text
      context.font = "bold 12px sans-serif"
      context.textAlign = "center"
      context.textBaseline = "middle"
      context.fillText(
        point.label,
        cx + Math.cos(midAngle) * labelRadius,
        cy + Math.sin(midAngle) * labelRadius,
      )
    }
    startAngle = endAngle
  })
  // Center circle for the donut effect.
  context.beginPath()
  context.arc(cx, cy, radius * 0.4, 0, Math.PI * 2)
  context.fillStyle = theme.surface
  context.fill()
  // Legend row under the chart.
  const legendY = height - 20
  const legendStartX = (width - data.length * 60) / 2
  data.forEach((point, i) => {
    const x = legendStartX + i * 60
    context.fillStyle = colors[i % colors.length] ?? "#6366f1"
    context.fillRect(x, legendY - 8, 12, 12)
    context.fillStyle = theme.text
    context.font = "10px sans-serif"
    context.textAlign = "left"
    context.textBaseline = "middle"
    context.fillText(point.label, x + 16, legendY - 2)
  })
}

/** Draws the chart into an already-DPR-scaled context. */
export function drawChart(options: DrawChartOptions): void {
  const context = options.context
  const { data, width, height, theme } = options
  context.clearRect(0, 0, width, height)
  if (data.length === 0) return
  const chartW = width - chartPadding.left - chartPadding.right
  const chartH = height - chartPadding.top - chartPadding.bottom
  if (chartW <= 0 || chartH <= 0) return
  const maxVal = Math.max(...data.map((point) => point.value), 1)
  if (options.chartType === "bar") drawBarChart(context, options, chartW, chartH, maxVal)
  else if (options.chartType === "line") drawLineChart(context, options, chartW, chartH, maxVal)
  else drawPieChart(context, options, chartW, chartH)
  void theme
}
