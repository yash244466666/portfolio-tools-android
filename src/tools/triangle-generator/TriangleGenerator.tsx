import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildTriangleCss,
  buildTrianglePreviewStyle,
  getTriangleDirection,
  triangleBounds,
  triangleDirections,
  type TriangleDirection,
} from "./triangle"

export default function TriangleGenerator() {
  const [direction, setDirection] = useState<TriangleDirection>("up")
  const [width, setWidth] = useState(100)
  const [height, setHeight] = useState(100)
  const [color, setColor] = useState("#6366f1")
  const [status, setStatus] = useState("")

  const cssCode = buildTriangleCss(direction, width, height, color)
  const previewStyle = buildTrianglePreviewStyle(direction, width, height, color)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <div aria-hidden="true" style={previewStyle} />
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          The preview triangle is drawn with the same border technique as the CSS output.
        </p>
      </ToolPanel>

      <ToolPanel title="Direction">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Triangle direction</legend>
          <div className="grid grid-cols-4 gap-2">
            {triangleDirections.map((candidate) => (
              <label
                className={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-medium ${
                  direction === candidate.id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={candidate.id}
              >
                <input
                  checked={direction === candidate.id}
                  className="sr-only"
                  name="triangle-direction"
                  onChange={() => setDirection(getTriangleDirection(candidate.id))}
                  type="radio"
                  value={candidate.id}
                />
                {candidate.label}
              </label>
            ))}
          </div>
        </fieldset>
      </ToolPanel>

      <ToolPanel title="Size and color">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="triangle-color-picker">
              Pick a triangle color
            </label>
            <input
              className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
              id="triangle-color-picker"
              onChange={(event) => setColor(event.target.value)}
              type="color"
              value={color}
            />
            <span className="font-mono text-sm text-[var(--text-secondary)]">{color}</span>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="triangle-width">
                Width
              </label>
              <span className="font-mono text-sm text-[var(--text-secondary)]" aria-hidden="true">
                {width}px
              </span>
            </div>
            <input
              aria-valuetext={`${width} pixels`}
              className="min-h-12 accent-[var(--primary)]"
              id="triangle-width"
              max={triangleBounds.width.max}
              min={triangleBounds.width.min}
              onChange={(event) => setWidth(Number(event.target.value))}
              step={1}
              type="range"
              value={width}
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="triangle-height">
                Height
              </label>
              <span className="font-mono text-sm text-[var(--text-secondary)]" aria-hidden="true">
                {height}px
              </span>
            </div>
            <input
              aria-valuetext={`${height} pixels`}
              className="min-h-12 accent-[var(--primary)]"
              id="triangle-height"
              max={triangleBounds.height.max}
              min={triangleBounds.height.min}
              onChange={(event) => setHeight(Number(event.target.value))}
              step={1}
              type="range"
              value={height}
            />
          </div>
        </div>
      </ToolPanel>

      <ToolPanel
        action={<CopyButton label="Copy CSS" onStatus={setStatus} value={cssCode} />}
        title="CSS"
      >
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-[var(--text)]">
          {cssCode}
        </pre>
        <p aria-live="polite" className="sr-only" role="status">
          {status}
        </p>
      </ToolPanel>
    </div>
  )
}
