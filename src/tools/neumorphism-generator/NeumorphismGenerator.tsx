import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildNeumorphismCss,
  buildNeumorphismPreview,
  neumorphismDistanceBounds,
  neumorphismIntensityBounds,
  neumorphismRadiusBounds,
  neumorphismShapes,
  neumorphismSizeBounds,
  parseNeumorphismHexColor,
  type NeumorphismShape,
} from "./neumorphism"

const defaultBaseColor = "#2a2a2a"

function SliderControl({
  id,
  label,
  max,
  min,
  onValueChange,
  value,
}: {
  id: string
  label: string
  max: number
  min: number
  onValueChange: (value: number) => void
  value: number
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-[var(--text)]" htmlFor={id}>
          {label}
        </label>
        <span aria-hidden="true" className="font-mono text-sm text-[var(--text-secondary)]">
          {value}
        </span>
      </div>
      <input
        className="min-h-12 accent-[var(--primary)]"
        id={id}
        max={max}
        min={min}
        onChange={(event) => onValueChange(Number(event.target.value))}
        step={1}
        type="range"
        value={value}
      />
    </div>
  )
}

export default function NeumorphismGenerator() {
  const [shape, setShape] = useState<NeumorphismShape>("convex")
  const [baseColor, setBaseColor] = useState(defaultBaseColor)
  const [size, setSize] = useState(150)
  const [radius, setRadius] = useState(30)
  const [distance, setDistance] = useState(8)
  const [intensity, setIntensity] = useState(30)
  const [status, setStatus] = useState("")

  const css = buildNeumorphismCss({ size, radius, distance, intensity, baseColor, shape })
  const preview = buildNeumorphismPreview({ size, radius, distance, intensity, baseColor, shape })
  const parsedColor = parseNeumorphismHexColor(baseColor)
  // The system picker needs a well-formed #rrggbb value; fall back to the
  // default swatch while the text input is invalid.
  const pickerValue = parsedColor === null ? defaultBaseColor : baseColor.trim().toLowerCase()

  const previewStyle: React.CSSProperties =
    preview === null
      ? {}
      : {
          width: preview.width,
          height: preview.height,
          borderRadius: preview.borderRadius,
          background: preview.background,
          boxShadow: preview.boxShadow,
        }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
          {css === null ? (
            <p className="px-4 text-center text-sm text-[var(--text-secondary)]">
              Enter a six-digit hex color such as #2a2a2a to preview.
            </p>
          ) : (
            <div
              aria-hidden="true"
              className="flex items-center justify-center"
              style={previewStyle}
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]">Preview</span>
            </div>
          )}
        </div>
      </ToolPanel>

      <ToolPanel title="Shape">
        <fieldset className="grid gap-2 sm:grid-cols-4">
          <legend className="sr-only">Shape</legend>
          {neumorphismShapes.map((candidate) => (
            <label
              key={candidate.id}
              className="flex min-h-12 items-center gap-2 text-sm font-medium"
            >
              <input
                checked={shape === candidate.id}
                name="neumorphism-shape"
                onChange={() => setShape(candidate.id)}
                type="radio"
                value={candidate.id}
              />
              {candidate.label}
            </label>
          ))}
        </fieldset>
      </ToolPanel>

      <ToolPanel title="Appearance">
        <Field
          hint="Six-digit hex value, for example #2a2a2a."
          htmlFor="neumorphism-color"
          label="Base color"
        >
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="neumorphism-color-picker">
              Pick the base color with the system picker
            </label>
            <input
              className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
              id="neumorphism-color-picker"
              onChange={(event) => setBaseColor(event.target.value)}
              type="color"
              value={pickerValue}
            />
            <input
              className="app-input font-mono"
              id="neumorphism-color"
              maxLength={7}
              onChange={(event) => setBaseColor(event.target.value)}
              value={baseColor}
            />
          </div>
        </Field>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SliderControl
            id="neumorphism-size"
            label="Size (px)"
            max={neumorphismSizeBounds.max}
            min={neumorphismSizeBounds.min}
            onValueChange={setSize}
            value={size}
          />
          <SliderControl
            id="neumorphism-radius"
            label="Corner radius (%)"
            max={neumorphismRadiusBounds.max}
            min={neumorphismRadiusBounds.min}
            onValueChange={setRadius}
            value={radius}
          />
          <SliderControl
            id="neumorphism-distance"
            label="Shadow distance (px)"
            max={neumorphismDistanceBounds.max}
            min={neumorphismDistanceBounds.min}
            onValueChange={setDistance}
            value={distance}
          />
          <SliderControl
            id="neumorphism-intensity"
            label="Shadow intensity"
            max={neumorphismIntensityBounds.max}
            min={neumorphismIntensityBounds.min}
            onValueChange={setIntensity}
            value={intensity}
          />
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          css === null ? null : <CopyButton label="Copy CSS" onStatus={setStatus} value={css} />
        }
        title="CSS"
      >
        {css === null ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Fix the base color to a six-digit hex value such as #2a2a2a to see the CSS.
          </p>
        ) : (
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
            {css}
          </pre>
        )}
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        The soft-UI look depends on matching surface and shadow tones, so the preview background is
        neutral while the declaration uses your base color. Intensity shifts the two shadow tones
        lighter and darker by the same amount. Nothing is saved or uploaded; this tool has no
        network access.
      </p>
    </div>
  )
}
