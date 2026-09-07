import { useMemo, useState } from "react"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  colorBlindnessTypes,
  formatHexColor,
  formatHexColorUpper,
  getColorBlindnessType,
  parseHexColor,
  simulateColorBlindness,
  type ColorBlindnessTypeId,
} from "./color-blindness"

const defaultHex = "#4287f5"
const defaultTypeId: ColorBlindnessTypeId = "protanopia"

function Swatch({ ariaHidden, color }: { ariaHidden?: boolean; color: string }) {
  return (
    <div aria-hidden={ariaHidden} className="h-24 rounded-xl" style={{ backgroundColor: color }} />
  )
}

function ColorFacts({ color, heading }: { color: string; heading: string }) {
  return (
    <div className="p-3">
      <p className="text-sm font-medium text-[var(--text)]">{heading}</p>
      <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{color}</p>
    </div>
  )
}

export default function ColorBlindnessSimulator() {
  const [hexInput, setHexInput] = useState(defaultHex)
  const [typeId, setTypeId] = useState(defaultTypeId)

  const type = getColorBlindnessType(typeId)
  const rgb = useMemo(() => parseHexColor(hexInput), [hexInput])

  const simulated = rgb === null ? null : simulateColorBlindness(rgb.r, rgb.g, rgb.b, typeId)
  // The picker needs a well-formed #rrggbb value; fall back to the default
  // swatch while the text input is invalid.
  const pickerValue = rgb === null ? defaultHex : formatHexColor(rgb)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Color">
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="color-picker">
              Pick a color
            </label>
            <input
              className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
              id="color-picker"
              onChange={(event) => setHexInput(event.target.value)}
              type="color"
              value={pickerValue}
            />
            <div className="flex-1">
              <Field
                error={
                  rgb === null ? "Enter six hexadecimal digits, for example 4287f5." : undefined
                }
                hint="Type RRGGBB or #RRGGBB, or use the picker."
                htmlFor="color-hex"
                label="Hex color"
              >
                <input
                  className="app-input font-mono"
                  id="color-hex"
                  maxLength={7}
                  onChange={(event) => setHexInput(event.target.value)}
                  placeholder="#4287f5"
                  value={hexInput}
                />
              </Field>
            </div>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Simulation type">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Color blindness type</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {colorBlindnessTypes.map((candidate) => (
              <label
                className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 ${
                  typeId === candidate.id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={candidate.id}
              >
                <input
                  checked={typeId === candidate.id}
                  className="sr-only"
                  name="color-blindness-type"
                  onChange={() => setTypeId(candidate.id)}
                  type="radio"
                  value={candidate.id}
                />
                <span>
                  <span className="block text-sm font-medium">{candidate.label}</span>
                  <span className="block text-xs text-[var(--text-secondary)]">
                    {candidate.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </ToolPanel>

      {rgb !== null && simulated !== null ? (
        <ToolPanel title="Comparison">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <Swatch ariaHidden color={formatHexColorUpper(rgb)} />
              <ColorFacts color={formatHexColorUpper(rgb)} heading="Original" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <Swatch ariaHidden color={formatHexColorUpper(simulated)} />
              <ColorFacts color={formatHexColorUpper(simulated)} heading={type.label} />
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            Original: RGB({rgb.r}, {rgb.g}, {rgb.b}). {type.label}: RGB({simulated.r}, {simulated.g}
            , {simulated.b}).
          </p>
        </ToolPanel>
      ) : null}

      {rgb !== null ? (
        <ToolPanel title="All types">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {colorBlindnessTypes.map((candidate) => {
              const variant = simulateColorBlindness(rgb.r, rgb.g, rgb.b, candidate.id)
              return (
                <div className="text-center" key={candidate.id}>
                  <Swatch ariaHidden color={formatHexColorUpper(variant)} />
                  <p className="mt-2 text-xs font-medium text-[var(--text)]">{candidate.label}</p>
                  <p className="font-mono text-xs text-[var(--text-secondary)]">
                    {formatHexColorUpper(variant)}
                  </p>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            Each swatch's hex value is shown as text next to it, so the comparison does not rely on
            color alone.
          </p>
        </ToolPanel>
      ) : null}

      <p className="text-sm text-[var(--text-secondary)]">
        The simulation uses standard color-vision matrices as a rough approximation. It is not a
        medical diagnostic tool and does not measure your actual vision.
      </p>
    </div>
  )
}
