import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildGradientBorderCss,
  buildGradientBorderPreviewStyles,
  defaultGradientBorderInput,
  gradientBorderBounds,
} from "./gradient-border"

function SliderField({
  bounds,
  id,
  label,
  onValueChange,
  suffix,
  value,
}: {
  bounds: { readonly min: number; readonly max: number }
  id: string
  label: string
  onValueChange: (value: number) => void
  suffix: string
  value: number
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-[var(--text)]" htmlFor={id}>
          {label}
        </label>
        <span className="font-mono text-sm text-[var(--text-secondary)]" aria-hidden="true">
          {value}
          {suffix}
        </span>
      </div>
      <input
        aria-valuetext={`${value} ${suffix}`}
        className="min-h-12 accent-[var(--primary)]"
        id={id}
        max={bounds.max}
        min={bounds.min}
        onChange={(event) => onValueChange(Number(event.target.value))}
        step={1}
        type="range"
        value={value}
      />
    </div>
  )
}

function ColorChoice({
  hex,
  id,
  label,
  onChange,
  pickerId,
}: {
  hex: string
  id: string
  label: string
  onChange: (value: string) => void
  pickerId: string
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-[var(--text)]" htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor={pickerId}>
          {`Pick ${label.toLowerCase()}`}
        </label>
        <input
          className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
          id={pickerId}
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={hex}
        />
        <input
          className="app-input font-mono"
          id={id}
          maxLength={7}
          onChange={(event) => {
            const candidate = event.target.value.trim()
            const normalised = /^[0-9a-fA-F]{6}$/.test(candidate) ? `#${candidate}` : candidate
            onChange(normalised)
          }}
          placeholder="#6366f1"
          value={hex}
        />
      </div>
    </div>
  )
}

export default function GradientBorderGenerator() {
  const [input, setInput] = useState(defaultGradientBorderInput)
  const [status, setStatus] = useState("")

  const cssCode = buildGradientBorderCss(input)
  const previewStyles = buildGradientBorderPreviewStyles(input)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div
          className="relative flex min-h-40 items-center justify-center p-3"
          style={{ background: "var(--background)" }}
        >
          <div
            className="relative flex min-h-36 w-full max-w-sm items-center justify-center"
            style={previewStyles.outer}
          >
            <div
              className="flex min-h-32 w-full items-center justify-center bg-[var(--surface-raised)] p-4 text-center"
              style={previewStyles.inner}
            >
              <div>
                <p className="text-base font-medium text-[var(--text)]">Gradient Border Preview</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Customize the gradient, width, and radius
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          The preview uses the same gradient ring as the CSS output. The copied snippet relies on
          mask-composite support; check your target browsers before shipping it.
        </p>
      </ToolPanel>

      <ToolPanel title="Gradient">
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorChoice
            hex={input.startColor}
            id="gradient-border-start"
            label="Start color"
            onChange={(startColor) => setInput((previous) => ({ ...previous, startColor }))}
            pickerId="gradient-border-start-picker"
          />
          <ColorChoice
            hex={input.endColor}
            id="gradient-border-end"
            label="End color"
            onChange={(endColor) => setInput((previous) => ({ ...previous, endColor }))}
            pickerId="gradient-border-end-picker"
          />
          <SliderField
            bounds={gradientBorderBounds.angle}
            id="gradient-border-angle"
            label="Angle"
            onValueChange={(angle) => setInput((previous) => ({ ...previous, angle }))}
            suffix="°"
            value={input.angle}
          />
          <SliderField
            bounds={gradientBorderBounds.borderWidth}
            id="gradient-border-width"
            label="Border width"
            onValueChange={(borderWidth) => setInput((previous) => ({ ...previous, borderWidth }))}
            suffix="px"
            value={input.borderWidth}
          />
          <SliderField
            bounds={gradientBorderBounds.borderRadius}
            id="gradient-border-radius"
            label="Border radius"
            onValueChange={(borderRadius) =>
              setInput((previous) => ({ ...previous, borderRadius }))
            }
            suffix="px"
            value={input.borderRadius}
          />
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
