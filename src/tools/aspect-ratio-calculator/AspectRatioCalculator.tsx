import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  commonRatioPresets,
  formatRatio,
  maximumDimension,
  parseDimension,
  scaledDimensions,
  scaledTableRows,
  simplifyRatio,
} from "./aspect-ratio"

export default function AspectRatioCalculator() {
  const [widthText, setWidthText] = useState("")
  const [heightText, setHeightText] = useState("")
  const [targetKind, setTargetKind] = useState<"width" | "height">("width")
  const [targetText, setTargetText] = useState("")

  const width = useMemo(() => parseDimension(widthText), [widthText])
  const height = useMemo(() => parseDimension(heightText), [heightText])
  const target = useMemo(() => parseDimension(targetText), [targetText])

  const widthInvalid = widthText.trim() !== "" && width === null
  const heightInvalid = heightText.trim() !== "" && height === null
  const targetInvalid = targetText.trim() !== "" && target === null

  const simplified = width !== null && height !== null ? simplifyRatio(width, height) : null
  const scaled =
    width !== null && height !== null && target !== null
      ? scaledDimensions(width, height, { kind: targetKind, value: target })
      : null
  const tableRows =
    width !== null && height !== null && target !== null
      ? scaledTableRows(width, height, { kind: targetKind, value: target })
      : []

  function applyPreset(presetWidth: number, presetHeight: number) {
    setWidthText(String(presetWidth))
    setHeightText(String(presetHeight))
  }

  function reset() {
    setWidthText("")
    setHeightText("")
    setTargetKind("width")
    setTargetText("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Original dimensions">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={widthInvalid ? `Enter a whole number from 1 to ${maximumDimension}.` : undefined}
            htmlFor="aspect-width"
            label="Width (px)"
          >
            <input
              className="app-input font-mono"
              id="aspect-width"
              inputMode="numeric"
              onChange={(event) => setWidthText(event.target.value)}
              placeholder="1920"
              value={widthText}
            />
          </Field>
          <Field
            error={
              heightInvalid ? `Enter a whole number from 1 to ${maximumDimension}.` : undefined
            }
            htmlFor="aspect-height"
            label="Height (px)"
          >
            <input
              className="app-input font-mono"
              id="aspect-height"
              inputMode="numeric"
              onChange={(event) => setHeightText(event.target.value)}
              placeholder="1080"
              value={heightText}
            />
          </Field>
        </div>
        <div aria-label="Common ratio presets" className="mt-4 flex flex-wrap gap-2" role="group">
          {commonRatioPresets.map((preset) => (
            <Button
              aria-pressed={
                widthText === String(preset.width) && heightText === String(preset.height)
              }
              key={preset.label}
              onClick={() => applyPreset(preset.width, preset.height)}
              variant={
                widthText === String(preset.width) && heightText === String(preset.height)
                  ? "primary"
                  : "secondary"
              }
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <p aria-live="polite" className="mt-3 text-sm" role="status">
          {simplified
            ? `Simplified ratio ${formatRatio(simplified)}`
            : widthInvalid || heightInvalid
              ? "Fix the highlighted dimensions to see the simplified ratio."
              : "Enter a width and height to see the simplified ratio."}
        </p>
        {(widthInvalid || heightInvalid) && (
          <Button onClick={reset} variant="quiet">
            Reset
          </Button>
        )}
      </ToolPanel>

      <ToolPanel title="Scaled dimensions">
        <div className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-[var(--text)]">Scale target side</legend>
            <div className="flex flex-wrap gap-2">
              <Button
                aria-pressed={targetKind === "width"}
                onClick={() => setTargetKind("width")}
                variant={targetKind === "width" ? "primary" : "secondary"}
              >
                Match width
              </Button>
              <Button
                aria-pressed={targetKind === "height"}
                onClick={() => setTargetKind("height")}
                variant={targetKind === "height" ? "primary" : "secondary"}
              >
                Match height
              </Button>
            </div>
          </fieldset>
          <Field
            error={
              targetInvalid ? `Enter a whole number from 1 to ${maximumDimension}.` : undefined
            }
            htmlFor="aspect-target"
            label={targetKind === "width" ? "Target width (px)" : "Target height (px)"}
          >
            <input
              className="app-input font-mono"
              id="aspect-target"
              inputMode="numeric"
              onChange={(event) => setTargetText(event.target.value)}
              placeholder="1280"
              value={targetText}
            />
          </Field>
          {scaled ? (
            <p className="text-sm">
              At a target {targetKind} of {target} px the dimensions are {scaled.width} ×{" "}
              {scaled.height} px.
            </p>
          ) : null}
          {tableRows.length > 0 ? (
            <table className="w-full text-sm">
              <caption className="sr-only">Scaled dimensions that keep the aspect ratio</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  <th scope="col" className="py-2">
                    Target
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Width
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Height
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr className="border-t border-[var(--border)]" key={row.label}>
                    <td className="py-2">{row.label}</td>
                    <td className="py-2 text-right font-mono">{row.width}</td>
                    <td className="py-2 text-right font-mono">{row.height}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Ratios reduce by the greatest common divisor and scaled dimensions are rounded to whole
        pixels. Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
