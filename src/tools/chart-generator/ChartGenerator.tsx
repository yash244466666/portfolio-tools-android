import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import { bytesToBase64 } from "@/platform/shared/files"
import {
  buildChartSummary,
  chartColorSchemes,
  chartTypes,
  defaultDataPoints,
  formatChartSummaryLine,
  maximumDataPoints,
  nextPointLabel,
  nextDemoValue,
  parseChartValue,
  type ChartType,
  type DataPoint,
} from "./chart"
import { drawChart } from "./chart-draw"

const canvasWidth = 640
const canvasHeight = 350
const chartMimeType = "image/png"

function readThemeColors(): { grid: string; text: string; surface: string } {
  const style = getComputedStyle(document.documentElement)
  return {
    grid: style.getPropertyValue("--chart-grid").trim() || "rgba(128, 128, 128, 0.25)",
    text: style.getPropertyValue("--text").trim() || "#333333",
    surface: style.getPropertyValue("--surface-raised").trim() || "#ffffff",
  }
}

export default function ChartGenerator() {
  const { files, random } = usePlatform()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [chartType, setChartType] = useState<ChartType>("bar")
  const [data, setData] = useState<DataPoint[]>(defaultDataPoints)
  const [schemeIndex, setSchemeIndex] = useState(0)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const colors = chartColorSchemes[schemeIndex]?.colors ?? chartColorSchemes[0]!.colors
  const summary = buildChartSummary(data)

  const renderChart = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    context.scale(dpr, dpr)
    drawChart({
      context,
      data,
      chartType,
      colors,
      theme: readThemeColors(),
      width: canvasWidth,
      height: canvasHeight,
    })
    // The canvas is decorative; the summary table below carries the meaning.
  }, [chartType, colors, data])

  useEffect(() => {
    renderChart()
  }, [renderChart])

  function updatePoint(index: number, field: "label" | "value", raw: string) {
    setData((previous) =>
      previous.map((point, i) => {
        if (i !== index) return point
        if (field === "label") return { ...point, label: raw }
        const value = parseChartValue(raw)
        return { ...point, value: value ?? point.value }
      }),
    )
  }

  function addPoint() {
    if (data.length >= maximumDataPoints) return
    const bytes = random.bytes(1)
    setData((previous) => [
      ...previous,
      { label: nextPointLabel(previous.length), value: nextDemoValue(bytes) },
    ])
  }

  function removePoint(index: number) {
    if (data.length <= 1) return
    setData((previous) => previous.filter((_, i) => i !== index))
  }

  async function savePng() {
    const canvas = canvasRef.current
    if (!canvas || busy) return
    setBusy(true)
    setError("")
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, chartMimeType),
      )
      if (!blob) {
        setError("The chart image could not be encoded.")
        return
      }
      const dataUrl = bytesToBase64(new Uint8Array(await blob.arrayBuffer()))
      await files.saveAs({
        name: `chart-${chartType}.png`,
        mimeType: chartMimeType,
        data: dataUrl,
        encoding: "base64",
      })
      setStatus("Chart image saved.")
    } catch (saveError) {
      setStatus("")
      setError(toSafeErrorMessage(saveError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Chart">
        <div className="grid gap-3">
          <Field label="Chart type" htmlFor="chart-type">
            <select
              className="app-input"
              id="chart-type"
              onChange={(event) => setChartType(event.target.value as ChartType)}
              value={chartType}
            >
              {chartTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            hint="Applies to the drawn series and the summary table."
            label="Color scheme"
            htmlFor="chart-scheme"
          >
            <select
              className="app-input"
              id="chart-scheme"
              onChange={(event) => setSchemeIndex(Number(event.target.value))}
              value={schemeIndex}
            >
              {chartColorSchemes.map((scheme, i) => (
                <option key={scheme.name} value={i}>
                  {scheme.name}
                </option>
              ))}
            </select>
          </Field>
          <canvas
            aria-hidden="true"
            className="w-full rounded-xl border border-[var(--border)]"
            height={canvasHeight}
            ref={canvasRef}
            role="presentation"
            style={{ height: `${canvasHeight}px` }}
            width={canvasWidth}
          />
          <p className="sr-only" role="status">
            {formatChartSummaryLine(summary, chartType)}
          </p>
          <table className="w-full text-sm">
            <caption className="sr-only">Chart data as a text table</caption>
            <thead>
              <tr>
                <th className="text-left" scope="col">
                  Label
                </th>
                <th className="text-right" scope="col">
                  Value
                </th>
                <th className="text-right" scope="col">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, i) => (
                <tr key={`${row.label}-${i}`}>
                  <td className="py-1">{row.label}</td>
                  <td className="py-1 text-right font-mono">{row.value}</td>
                  <td className="py-1 text-right font-mono">{row.sharePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button disabled={busy} onClick={() => void savePng()}>
              Save chart image
            </Button>
            <CopyButton
              label="Copy summary"
              onStatus={setStatus}
              value={formatChartSummaryLine(summary, chartType)}
            />
          </div>
          {error ? (
            <p className="text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel
        title="Data points"
        action={
          <Button
            disabled={data.length >= maximumDataPoints}
            onClick={addPoint}
            variant="secondary"
          >
            Add point
          </Button>
        }
      >
        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <span aria-hidden="true" className="w-4 shrink-0" />
            <span className="flex-1">Label</span>
            <span className="w-24">Value</span>
            <span className="w-16" aria-hidden="true" />
          </div>
          {data.map((point, i) => {
            const valueText = String(point.value)
            return (
              <div className="flex items-center gap-2" key={i}>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 rounded-sm"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <label className="sr-only" htmlFor={`point-label-${i}`}>
                  Label for point {i + 1}
                </label>
                <input
                  className="app-input flex-1"
                  id={`point-label-${i}`}
                  maxLength={40}
                  onChange={(event) => updatePoint(i, "label", event.target.value)}
                  placeholder={`Point ${i + 1}`}
                  value={point.label}
                />
                <label className="sr-only" htmlFor={`point-value-${i}`}>
                  Value for point {i + 1}
                </label>
                <input
                  className="app-input w-24 font-mono"
                  id={`point-value-${i}`}
                  inputMode="decimal"
                  onChange={(event) => updatePoint(i, "value", event.target.value)}
                  value={valueText}
                />
                <Button
                  aria-label={`Remove point ${i + 1}`}
                  className="w-16"
                  disabled={data.length <= 1}
                  onClick={() => removePoint(i)}
                  variant="quiet"
                >
                  Remove
                </Button>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
          Up to {maximumDataPoints} points with non-negative values. The chart is drawn on this
          device and nothing is uploaded.
        </p>
      </ToolPanel>
    </div>
  )
}
