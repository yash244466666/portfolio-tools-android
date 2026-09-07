import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  borderRadiusUnits,
  buildBorderRadiusDeclaration,
  buildBorderRadiusPreviewStyle,
  clampBorderRadiusValue,
  defaultBorderRadiusValues,
  getBorderRadiusUnit,
  type BorderRadiusUnit,
  type BorderRadiusValues,
} from "./border-radius"

const cornerFields = [
  { key: "topLeft", label: "Top left" },
  { key: "topRight", label: "Top right" },
  { key: "bottomRight", label: "Bottom right" },
  { key: "bottomLeft", label: "Bottom left" },
] as const

export default function BorderRadiusGenerator() {
  const [values, setValues] = useState<BorderRadiusValues>(defaultBorderRadiusValues)
  const [unit, setUnit] = useState<BorderRadiusUnit>(borderRadiusUnits[0]!)
  const [linked, setLinked] = useState(false)
  const [status, setStatus] = useState("")

  const declaration = buildBorderRadiusDeclaration(values, unit)
  const previewStyle = buildBorderRadiusPreviewStyle(values, unit)

  function changeCorner(key: keyof BorderRadiusValues, value: number) {
    setValues((previous) => {
      const next = { ...previous, [key]: value }
      if (linked) {
        return {
          topLeft: value,
          topRight: value,
          bottomRight: value,
          bottomLeft: value,
        }
      }
      return next
    })
  }

  function changeUnit(unitId: string) {
    const nextUnit = getBorderRadiusUnit(unitId)
    setUnit(nextUnit)
    // The prior unit's values can exceed the new unit's maximum (100px is
    // not a valid % value), so clamp every corner into the new range.
    setValues((previous) => ({
      topLeft: clampBorderRadiusValue(previous.topLeft, nextUnit),
      topRight: clampBorderRadiusValue(previous.topRight, nextUnit),
      bottomRight: clampBorderRadiusValue(previous.bottomRight, nextUnit),
      bottomLeft: clampBorderRadiusValue(previous.bottomLeft, nextUnit),
    }))
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <div
            aria-hidden="true"
            className="h-24 w-40 border border-[var(--border-strong)] bg-[var(--surface-raised)]"
            style={previewStyle}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          The preview shape shows the current radii.
        </p>
      </ToolPanel>

      <ToolPanel title="Unit">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Border radius unit</legend>
          <div className="grid grid-cols-3 gap-2">
            {borderRadiusUnits.map((candidate) => (
              <label
                className={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-medium ${
                  unit.id === candidate.id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={candidate.id}
              >
                <input
                  checked={unit.id === candidate.id}
                  className="sr-only"
                  name="border-radius-unit"
                  onChange={() => changeUnit(candidate.id)}
                  type="radio"
                  value={candidate.id}
                />
                {candidate.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-3 flex min-h-12 items-center gap-2 text-sm font-medium text-[var(--text)]">
          <input
            aria-label="Link corners"
            checked={linked}
            className="h-5 w-5 accent-[var(--primary)]"
            id="border-radius-linked"
            onChange={(event) => setLinked(event.target.checked)}
            type="checkbox"
          />
          Link corners
        </label>
      </ToolPanel>

      <ToolPanel title="Corners">
        <div className="grid gap-4 sm:grid-cols-2">
          {cornerFields.map(({ key, label }) => (
            <div className="grid gap-1" key={key}>
              <div className="flex items-center justify-between gap-2">
                <label
                  className="text-sm font-semibold text-[var(--text)]"
                  htmlFor={`border-radius-${key}`}
                >
                  {label}
                </label>
                <span className="font-mono text-sm text-[var(--text-secondary)]" aria-hidden="true">
                  {values[key]}
                  {unit.id}
                </span>
              </div>
              <input
                aria-valuetext={`${values[key]} ${unit.id}`}
                className="min-h-12 accent-[var(--primary)]"
                disabled={linked && key !== "topLeft"}
                id={`border-radius-${key}`}
                max={unit.max}
                min={0}
                onChange={(event) => changeCorner(key, Number(event.target.value))}
                step={1}
                type="range"
                value={values[key]}
              />
            </div>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel
        action={<CopyButton label="Copy CSS" onStatus={setStatus} value={declaration} />}
        title="CSS"
      >
        <p className="break-all font-mono text-sm text-[var(--text)]">{declaration}</p>
        <p aria-live="polite" className="sr-only" role="status">
          {status}
        </p>
      </ToolPanel>
    </div>
  )
}
