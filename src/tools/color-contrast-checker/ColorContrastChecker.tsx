import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  contrastRatio,
  contrastThresholds,
  formatHexColor,
  formatRatio,
  parseHexColor,
  swapColors,
  thresholdPasses,
} from "./color-contrast"

export default function ColorContrastChecker() {
  const [firstText, setFirstText] = useState("#ffffff")
  const [secondText, setSecondText] = useState("#777777")

  const first = useMemo(() => parseHexColor(firstText), [firstText])
  const second = useMemo(() => parseHexColor(secondText), [secondText])
  const firstInvalid = firstText.trim() !== "" && first === null
  const secondInvalid = secondText.trim() !== "" && second === null

  const ratio = first !== null && second !== null ? contrastRatio(first, second) : null

  function swap() {
    const first = parseHexColor(firstText)
    const second = parseHexColor(secondText)
    if (first === null || second === null) return
    const [nextFirst, nextSecond] = swapColors(first, second)
    setFirstText(formatHexColor(nextFirst))
    setSecondText(formatHexColor(nextSecond))
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Colors">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={firstInvalid ? "Enter a hex color such as #1a2b3c or #fff." : undefined}
            hint="3 or 6 hex digits; the hash is optional."
            htmlFor="contrast-first"
            label="First color (hex)"
          >
            <input
              className="app-input font-mono"
              id="contrast-first"
              onChange={(event) => setFirstText(event.target.value)}
              placeholder="#ffffff"
              value={firstText}
            />
          </Field>
          <Field
            error={secondInvalid ? "Enter a hex color such as #1a2b3c or #fff." : undefined}
            htmlFor="contrast-second"
            label="Second color (hex)"
          >
            <input
              className="app-input font-mono"
              id="contrast-second"
              onChange={(event) => setSecondText(event.target.value)}
              placeholder="#777777"
              value={secondText}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Button disabled={first === null || second === null} onClick={swap} variant="secondary">
            Swap colors
          </Button>
        </div>
      </ToolPanel>

      <ToolPanel title="Contrast result">
        <p aria-live="polite" className="text-sm" role="status">
          {ratio !== null
            ? `The contrast ratio is ${formatRatio(ratio)}:1.`
            : firstInvalid || secondInvalid
              ? "Fix the highlighted color to compute the ratio."
              : "Enter two hex colors to compute the contrast ratio."}
        </p>
        {ratio !== null ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">
              WCAG 2.2 conformance targets for the computed contrast ratio
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <th scope="col" className="py-2">
                  Target
                </th>
                <th scope="col" className="py-2 text-right">
                  Minimum
                </th>
                <th scope="col" className="py-2 text-right">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {contrastThresholds.map((threshold) => (
                <tr className="border-t border-[var(--border)]" key={threshold.key}>
                  <td className="py-2">{threshold.label}</td>
                  <td className="py-2 text-right font-mono">{threshold.minimumRatio}:1</td>
                  <td className="py-2 text-right">
                    {thresholdPasses(ratio, threshold) ? "Pass" : "Fail"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </ToolPanel>

      <ToolPanel title="Sample preview">
        <p className="text-sm text-[var(--text-secondary)]">
          {first !== null && second !== null
            ? `Rendered with the first color ${formatHexColor(first)} on the second color ${formatHexColor(second)}:`
            : "Enter valid colors to see the sample."}
        </p>
        {first !== null && second !== null ? (
          <div
            aria-label={`Sample text in the entered colors, ${formatRatio(ratio ?? 0)} to 1 contrast`}
            className="mt-3 rounded-xl border border-[var(--border)] p-4"
            style={{ backgroundColor: formatHexColor(second), color: formatHexColor(first) }}
          >
            <p className="text-base font-semibold">Sample heading in the entered colors</p>
            <p className="mt-1 text-sm">
              Body-size sample text at the same contrast. Large text (at least 24 px, or 19 px bold)
              passes at the large-text thresholds.
            </p>
          </div>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Contrast math follows WCAG 2.2 relative luminance for 8-bit sRGB colors. Pass and fail
        results are always shown as text labels. Everything runs on this device; nothing is stored,
        logged, or uploaded.
      </p>
    </div>
  )
}
