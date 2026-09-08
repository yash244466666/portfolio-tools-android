import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildGlassDeclaration,
  formatGlassOpacity,
  glassBlurBounds,
  glassBorderRadiusBounds,
  glassBorderWidthBounds,
  parseGlassHexColor,
} from "./glass"

const defaultInput = {
  blur: 10,
  opacity: 0.2,
  bgColor: "#ffffff",
  borderColor: "#ffffff",
  borderWidth: 1,
  borderRadius: 16,
}

function SliderControl({
  id,
  label,
  max,
  min,
  onValueChange,
  step = 1,
  value,
}: {
  id: string
  label: string
  max: number
  min: number
  onValueChange: (value: number) => void
  step?: number
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
        step={step}
        type="range"
        value={value}
      />
    </div>
  )
}

function ColorControl({
  id,
  label,
  onValueChange,
  value,
}: {
  id: string
  label: string
  onValueChange: (value: string) => void
  value: string
}) {
  const parsed = parseGlassHexColor(value)
  // The system picker needs a well-formed #rrggbb value; fall back to white
  // while the text input is invalid.
  const pickerValue = parsed === null ? "#ffffff" : value.trim().toLowerCase()
  return (
    <Field hint="Six-digit hex value." htmlFor={`${id}-text`} label={label}>
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor={`${id}-picker`}>
          Pick {label.toLowerCase()} with the system picker
        </label>
        <input
          className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
          id={`${id}-picker`}
          onChange={(event) => onValueChange(event.target.value)}
          type="color"
          value={pickerValue}
        />
        <input
          className="app-input font-mono"
          id={`${id}-text`}
          maxLength={7}
          onChange={(event) => onValueChange(event.target.value)}
          value={value}
        />
      </div>
    </Field>
  )
}

export default function GlassmorphismGenerator() {
  const [blur, setBlur] = useState(defaultInput.blur)
  const [opacity, setOpacity] = useState(defaultInput.opacity)
  const [bgColor, setBgColor] = useState(defaultInput.bgColor)
  const [borderColor, setBorderColor] = useState(defaultInput.borderColor)
  const [borderWidth, setBorderWidth] = useState(defaultInput.borderWidth)
  const [borderRadius, setBorderRadius] = useState(defaultInput.borderRadius)
  const [status, setStatus] = useState("")

  const input = { blur, opacity, bgColor, borderColor, borderWidth, borderRadius }
  const css = buildGlassDeclaration(input)
  const backdropFilter = css === null ? undefined : `blur(${blur}px)`

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div
          aria-hidden="true"
          className="relative h-64 overflow-hidden rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, #6366f1 0%, #06b6d4 40%, #f59e0b 70%, #ef4444 100%)",
          }}
        >
          <div
            className="absolute inset-8 flex items-center justify-center"
            style={
              css === null
                ? undefined
                : {
                    background: `rgba(${parseGlassHexColor(bgColor)?.r}, ${parseGlassHexColor(bgColor)?.g}, ${parseGlassHexColor(bgColor)?.b}, ${formatGlassOpacity(opacity)})`,
                    backdropFilter,
                    WebkitBackdropFilter: backdropFilter,
                    border: `${borderWidth}px solid ${borderColor.trim().toLowerCase()}`,
                    borderRadius: `${borderRadius}px`,
                  }
            }
          >
            {css === null ? (
              <p className="rounded-2xl bg-black/60 px-3 py-2 text-center text-sm text-white">
                Enter six-digit hex colors to preview.
              </p>
            ) : (
              <p className="text-sm font-medium text-[var(--text)]">Glassmorphism</p>
            )}
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Glass">
        <SliderControl
          id="glass-blur"
          label="Blur (px)"
          max={glassBlurBounds.max}
          min={glassBlurBounds.min}
          onValueChange={setBlur}
          value={blur}
        />
        <div className="mt-4">
          <SliderControl
            id="glass-opacity"
            label={`Opacity (${formatGlassOpacity(opacity)})`}
            max={1}
            min={0}
            onValueChange={setOpacity}
            step={0.01}
            value={opacity}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ColorControl
            id="glass-bg-color"
            label="Background color"
            onValueChange={setBgColor}
            value={bgColor}
          />
          <ColorControl
            id="glass-border-color"
            label="Border color"
            onValueChange={setBorderColor}
            value={borderColor}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SliderControl
            id="glass-border-width"
            label="Border width (px)"
            max={glassBorderWidthBounds.max}
            min={glassBorderWidthBounds.min}
            onValueChange={setBorderWidth}
            value={borderWidth}
          />
          <SliderControl
            id="glass-border-radius"
            label="Border radius (px)"
            max={glassBorderRadiusBounds.max}
            min={glassBorderRadiusBounds.min}
            onValueChange={setBorderRadius}
            value={borderRadius}
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
            Fix both colors to six-digit hex values such as #ffffff to see the CSS.
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
        The declaration includes the -webkit-backdrop-filter prefix because older Android WebViews
        still need it. Backdrop blur is rendered by this WebView; the frosted effect can look softer
        or absent on very old devices. Nothing is saved or uploaded; this tool has no network
        access.
      </p>
    </div>
  )
}
