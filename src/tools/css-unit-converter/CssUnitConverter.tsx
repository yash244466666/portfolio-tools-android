import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  convertUnit,
  cssUnits,
  defaultRootFontSize,
  formatUnitValue,
  maximumRootFontSize,
  minimumRootFontSize,
  parseRootFontSize,
  parseUnitValue,
  type CssUnit,
} from "./css-units"

const unitLabels: Record<CssUnit, string> = {
  px: "Pixels (px)",
  rem: "Root em (rem)",
  em: "Em (em)",
  "%": "Percent (%)",
}

export default function CssUnitConverter() {
  const [rootText, setRootText] = useState(String(defaultRootFontSize))
  const [valueText, setValueText] = useState("")
  const [from, setFrom] = useState<CssUnit>("px")

  const root = useMemo(() => parseRootFontSize(rootText), [rootText])
  const value = useMemo(() => parseUnitValue(valueText), [valueText])
  const rootInvalid = rootText.trim() !== "" && root === null
  const valueInvalid = valueText.trim() !== "" && value === null
  // The effective root is disclosed whenever the raw input was clamped.
  const rootClamped = root !== null && rootText.trim() !== "" && Number(rootText) !== root

  const conversion = useMemo(() => {
    if (root === null || value === null || rootInvalid || valueInvalid) return null
    const inputs = convertUnit(value, from, root)
    if (!inputs) return null
    return { inputs, inputValue: value, inputRoot: root }
  }, [root, value, rootInvalid, valueInvalid, from])

  function reset() {
    setRootText(String(defaultRootFontSize))
    setValueText("")
    setFrom("px")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Conversion input">
        <div className="grid gap-4">
          <Field
            error={
              rootInvalid
                ? `Enter a root font size between ${minimumRootFontSize} and ${maximumRootFontSize} px.`
                : undefined
            }
            hint={`Clamped to ${minimumRootFontSize}-${maximumRootFontSize} px; browsers allow user font scaling, so rem results follow this setting.`}
            htmlFor="css-unit-root"
            label="Root font size (px)"
          >
            <input
              className="app-input font-mono"
              id="css-unit-root"
              inputMode="decimal"
              onChange={(event) => setRootText(event.target.value)}
              value={rootText}
            />
          </Field>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[var(--text)]" htmlFor="css-unit-from">
              From unit
            </label>
            <select
              className="app-input"
              id="css-unit-from"
              onChange={(event) => setFrom(event.target.value as CssUnit)}
              value={from}
            >
              {cssUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabels[unit]}
                </option>
              ))}
            </select>
          </div>
          <Field
            error={valueInvalid ? "Enter a valid number to convert." : undefined}
            htmlFor="css-unit-value"
            label={`Value in ${unitLabels[from]}`}
          >
            <input
              className="app-input font-mono"
              id="css-unit-value"
              inputMode="decimal"
              onChange={(event) => setValueText(event.target.value)}
              placeholder="1.5"
              value={valueText}
            />
          </Field>
          <div>
            <Button onClick={reset} variant="quiet">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Converted values">
        <p aria-live="polite" className="text-sm" role="status">
          {conversion
            ? `${formatUnitValue(conversion.inputValue)}${from} equals ${formatUnitValue(conversion.inputs.px)}px, ${formatUnitValue(conversion.inputs.rem)}rem, ${formatUnitValue(conversion.inputs.em)}em, and ${formatUnitValue(conversion.inputs.percent)}% at a ${formatUnitValue(conversion.inputRoot)} px root.`
            : rootInvalid || valueInvalid
              ? "Fix the highlighted input to convert."
              : "Enter a value to see the conversion table."}
        </p>
        {rootClamped ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]" role="note">
            Root font size clamped to {formatUnitValue(root ?? defaultRootFontSize)} px (supported
            range {minimumRootFontSize}-{maximumRootFontSize} px).
          </p>
        ) : null}
        {conversion ? (
          <>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">
                Converted values for every unit against the configured root font size
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  <th scope="col" className="py-2">
                    Unit
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {cssUnits.map((unit) => (
                  <tr className="border-t border-[var(--border)]" key={unit}>
                    <td className="py-2">{unitLabels[unit]}</td>
                    <td className="py-2 text-right font-mono">
                      {formatUnitValue(conversion.inputs[unit === "%" ? "percent" : unit])}
                      {unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Caveat: em is computed against the root font size, so the em and rem results match
              here. Inside an element that sets its own font size, real em values differ.
            </p>
          </>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Percent and em are font-size relative; this tool computes both against the root font size
        you set. Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
