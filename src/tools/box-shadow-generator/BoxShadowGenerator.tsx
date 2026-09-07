import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  boxShadowBounds,
  buildBoxShadowCss,
  buildBoxShadowValue,
  defaultBoxShadowInput,
  formatOpacityPercent,
  parseHexColor,
  type BoxShadowInput,
} from "./box-shadow"

const defaultHex = defaultBoxShadowInput.color

function SliderField({
  bounds,
  id,
  label,
  onValueChange,
  value,
}: {
  bounds: { readonly min: number; readonly max: number }
  id: string
  label: string
  onValueChange: (value: number) => void
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
        </span>
      </div>
      <input
        aria-valuetext={`${value} pixels`}
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

export default function BoxShadowGenerator() {
  const [input, setInput] = useState<BoxShadowInput>(defaultBoxShadowInput)
  const [hexInput, setHexInput] = useState(defaultHex)
  const [status, setStatus] = useState("")

  const rgb = parseHexColor(input.color)
  const rgba = rgb === null ? null : buildBoxShadowCss(input)
  const previewValue = rgb === null ? null : buildBoxShadowValue(input)
  // The color picker requires a well-formed #rrggbb value; fall back to the
  // default swatch while the text input is invalid.
  const pickerValue = rgb === null ? defaultHex : input.color

  function update(patch: Partial<BoxShadowInput>) {
    setInput((previous) => ({ ...previous, ...patch }))
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <div
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] text-xs text-[var(--text-tertiary)]"
            style={previewValue === null ? undefined : { boxShadow: previewValue }}
          >
            Preview
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          The preview swatch shows the current shadow. Exact rendering depends on your device's
          WebView.
        </p>
      </ToolPanel>

      <ToolPanel title="Shadow">
        <div className="grid gap-4 sm:grid-cols-2">
          <SliderField
            bounds={boxShadowBounds.offsetX}
            id="box-offset-x"
            label="Offset X"
            onValueChange={(offsetX) => update({ offsetX })}
            value={input.offsetX}
          />
          <SliderField
            bounds={boxShadowBounds.offsetY}
            id="box-offset-y"
            label="Offset Y"
            onValueChange={(offsetY) => update({ offsetY })}
            value={input.offsetY}
          />
          <SliderField
            bounds={boxShadowBounds.blur}
            id="box-blur"
            label="Blur"
            onValueChange={(blur) => update({ blur })}
            value={input.blur}
          />
          <SliderField
            bounds={boxShadowBounds.spread}
            id="box-spread"
            label="Spread"
            onValueChange={(spread) => update({ spread })}
            value={input.spread}
          />
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="box-color-picker">
              Pick a shadow color
            </label>
            <input
              className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
              id="box-color-picker"
              onChange={(event) => {
                setHexInput(event.target.value)
                update({ color: event.target.value })
              }}
              type="color"
              value={pickerValue}
            />
            <div className="flex-1">
              <Field
                error={
                  rgb === null ? "Enter six hexadecimal digits, for example 6366f1." : undefined
                }
                hint="Type RRGGBB or #RRGGBB, or use the picker."
                htmlFor="box-color-hex"
                label="Color"
              >
                <input
                  className="app-input font-mono"
                  id="box-color-hex"
                  maxLength={7}
                  onChange={(event) => {
                    setHexInput(event.target.value)
                    const candidate = event.target.value.trim()
                    const normalised = /^[0-9a-fA-F]{6}$/.test(candidate)
                      ? `#${candidate}`
                      : candidate
                    update({ color: normalised })
                  }}
                  placeholder="#6366f1"
                  value={hexInput}
                />
              </Field>
            </div>
          </div>
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="box-opacity">
                Opacity
              </label>
              <span className="font-mono text-sm text-[var(--text-secondary)]" aria-hidden="true">
                {formatOpacityPercent(input.opacity)}
              </span>
            </div>
            <input
              aria-valuetext={formatOpacityPercent(input.opacity)}
              className="min-h-12 accent-[var(--primary)]"
              id="box-opacity"
              max={100}
              min={0}
              onChange={(event) => update({ opacity: Number(event.target.value) / 100 })}
              step={1}
              type="range"
              value={Math.round(input.opacity * 100)}
            />
          </div>
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          rgba === null ? null : <CopyButton label="Copy CSS" onStatus={setStatus} value={rgba} />
        }
        title="CSS"
      >
        {rgba === null ? (
          <p className="text-sm text-[var(--text-secondary)]" role="status">
            Fix the color to see the CSS.
          </p>
        ) : (
          <p className="break-all font-mono text-sm text-[var(--text)]">{rgba}</p>
        )}
        <p aria-live="polite" className="sr-only" role="status">
          {status}
        </p>
      </ToolPanel>
    </div>
  )
}
