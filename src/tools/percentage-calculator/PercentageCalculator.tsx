import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import {
  computePercentage,
  formatPercentageNumber,
  getPercentageOption,
  parseDecimal,
  type PercentageMode,
} from "./percentage"

const resultLabels: Record<PercentageMode, string> = {
  "percent-of": "Result",
  "what-percent": "Percentage",
  "percent-change": "Change",
}

const fieldLabels: Record<PercentageMode, { a: string; b: string }> = {
  "percent-of": { a: "Percentage (X %)", b: "Of value (Y)" },
  "what-percent": { a: "Value (X)", b: "Total (Y)" },
  "percent-change": { a: "New value", b: "Old value" },
}

export default function PercentageCalculator() {
  const [mode, setMode] = useState<PercentageMode>("percent-of")
  const [valueA, setValueA] = useState("")
  const [valueB, setValueB] = useState("")

  const parsedA = useMemo(() => (valueA.trim() === "" ? null : parseDecimal(valueA)), [valueA])
  const parsedB = useMemo(() => (valueB.trim() === "" ? null : parseDecimal(valueB)), [valueB])
  const invalid =
    parsedA === null && valueA.trim() !== ""
      ? "a"
      : parsedB === null && valueB.trim() !== ""
        ? "b"
        : null

  const outcome = useMemo(
    () => (parsedA === null || parsedB === null ? null : computePercentage(mode, parsedA, parsedB)),
    [mode, parsedA, parsedB],
  )

  const labels = fieldLabels[mode]
  const percentSuffix = mode === "percent-of" ? false : true
  const formatted =
    outcome?.value === null || outcome === null
      ? null
      : formatPercentageNumber(outcome.value) + (percentSuffix ? "%" : "")

  return (
    <div className="grid gap-4">
      <ToolPanel title="Calculation">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Mode</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["percent-of", "what-percent", "percent-change"] as PercentageMode[]).map((id) => (
              <label
                className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 ${
                  mode === id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={id}
              >
                <input
                  checked={mode === id}
                  className="accent-[var(--primary)]"
                  name="percentage-mode"
                  onChange={() => setMode(id)}
                  type="radio"
                  value={id}
                />
                <span className="text-sm font-medium">{getPercentageOption(id).label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            {getPercentageOption(mode).description}
          </p>
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            error={invalid === "a" ? "Enter a valid number for X." : undefined}
            htmlFor="percentage-a"
            label={labels.a}
          >
            <input
              className="app-input font-mono"
              id="percentage-a"
              inputMode="decimal"
              onChange={(event) => setValueA(event.target.value)}
              placeholder="0"
              value={valueA}
            />
          </Field>
          <Field
            error={invalid === "b" ? "Enter a valid number for Y." : undefined}
            htmlFor="percentage-b"
            label={labels.b}
          >
            <input
              className="app-input font-mono"
              id="percentage-b"
              inputMode="decimal"
              onChange={(event) => setValueB(event.target.value)}
              placeholder="0"
              value={valueB}
            />
          </Field>
        </div>
      </ToolPanel>

      <ToolPanel
        action={formatted !== null ? <CopyButton label="Copy" value={formatted} /> : undefined}
        title={resultLabels[mode]}
      >
        {outcome === null ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter two numbers above. The result updates as you type and stays on this device.
          </p>
        ) : outcome.undefinedReason !== null ? (
          <p role="alert">{outcome.undefinedReason}</p>
        ) : invalid !== null ? (
          <p role="alert">Correct the highlighted field to compute a result.</p>
        ) : (
          <ResultReveal variant="quick" token={formatted ?? "empty"}>
            <p className="font-mono text-3xl font-bold text-[var(--text)]" aria-live="polite">
              {formatted}
            </p>
          </ResultReveal>
        )}
      </ToolPanel>

      <p className="text-sm text-[var(--text-secondary)]">
        Calculations happen on this device only. Percent change divides by the old value's
        magnitude, so it is symmetric for opposite-direction swaps.
      </p>
    </div>
  )
}
