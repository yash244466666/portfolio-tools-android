import { useMemo, useState } from "react"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { Meter, ResultReveal } from "@/components/motion/primitives"
import {
  computeTip,
  formatTipAmount,
  maximumSplitCount,
  maximumTipPercent,
  parseAmount,
  presetTips,
  sliderMaxTipPercent,
} from "./tip"

export default function TipCalculator() {
  const [bill, setBill] = useState("")
  const [tipPercent, setTipPercent] = useState(18)
  const [splitCount, setSplitCount] = useState(1)

  const parsedBill = useMemo(() => (bill.trim() === "" ? null : parseAmount(bill)), [bill])
  const invalid = bill.trim() !== "" && parsedBill === null

  const result = useMemo(
    () =>
      parsedBill === null || parsedBill <= 0
        ? null
        : computeTip(parsedBill, tipPercent, splitCount),
    [parsedBill, tipPercent, splitCount],
  )

  const positiveError = parsedBill !== null && parsedBill <= 0

  return (
    <div className="grid gap-4">
      <ToolPanel title="Bill">
        <Field
          error={
            invalid
              ? "Enter a valid bill amount."
              : positiveError
                ? "The bill amount must be greater than 0."
                : undefined
          }
          hint="Amounts are plain numbers without a currency symbol."
          htmlFor="tip-bill"
          label="Bill amount"
        >
          <input
            className="app-input font-mono"
            id="tip-bill"
            inputMode="decimal"
            onChange={(event) => setBill(event.target.value)}
            placeholder="0.00"
            value={bill}
          />
        </Field>

        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-[var(--text)]" htmlFor="tip-percent">
              Tip percentage
            </label>
            <span className="font-mono text-sm text-[var(--primary)]">{tipPercent}%</span>
          </div>
          <input
            aria-describedby="tip-percent-hint"
            aria-valuemax={sliderMaxTipPercent}
            aria-valuemin={0}
            aria-valuenow={tipPercent}
            className="min-h-12 accent-[var(--primary)]"
            id="tip-percent"
            max={sliderMaxTipPercent}
            min={0}
            onChange={(event) => setTipPercent(Number(event.target.value))}
            step={1}
            type="range"
            value={tipPercent}
          />
          <p className="text-xs leading-5 text-[var(--text-secondary)]" id="tip-percent-hint">
            The slider covers 0–{sliderMaxTipPercent}%; any value from 0 to {maximumTipPercent}% is
            accepted and validated.
          </p>
          <div className="mt-1 grid grid-cols-5 gap-2">
            {presetTips.map((preset) => (
              <button
                aria-pressed={tipPercent === preset}
                className={`min-h-12 rounded-2xl border px-2 text-sm font-medium font-mono ${
                  tipPercent === preset
                    ? "border-[var(--primary)] bg-[var(--surface-muted)] text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--text)]"
                }`}
                key={preset}
                onClick={() => setTipPercent(preset)}
                type="button"
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        <Field
          error={
            splitCount < 1 || splitCount > maximumSplitCount || !Number.isInteger(splitCount)
              ? `Enter a whole number from 1 to ${maximumSplitCount}.`
              : undefined
          }
          hint={`Split the total between 1 and ${maximumSplitCount} people.`}
          htmlFor="tip-split"
          label="Split between"
        >
          <input
            className="app-input font-mono"
            id="tip-split"
            inputMode="numeric"
            max={maximumSplitCount}
            min={1}
            onChange={(event) => setSplitCount(Number(event.target.value))}
            step={1}
            type="number"
            value={splitCount}
          />
        </Field>
      </ToolPanel>

      <ToolPanel title="Totals">
        {result === null ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter a bill amount above to see the tip, total, and per-person amounts.
          </p>
        ) : (
          <div className="grid gap-3">
            <Meter
              label="Tip share of total"
              maximum={result.total}
              value={result.tip}
              valueLabel={`${Math.round((result.tip / result.total) * 100)}%`}
            />
            <ResultReveal variant="quick" token={`${result.tip}-${result.total}-${splitCount}`}>
              <dl className="grid gap-3" aria-live="polite">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-[var(--text-secondary)]">Tip amount</dt>
                  <dd className="font-mono text-lg text-[var(--text)]">
                    {formatTipAmount(result.tip)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-[var(--text-secondary)]">Total</dt>
                  <dd className="font-mono text-lg text-[var(--text)]">
                    {formatTipAmount(result.total)}
                  </dd>
                </div>
                {splitCount > 1 ? (
                  <div className="border-t border-[var(--border)] pt-3">
                    <div className="flex items-center justify-between">
                      <dt className="text-sm text-[var(--text-secondary)]">Per person</dt>
                      <dd className="font-mono text-lg text-[var(--primary)]">
                        {formatTipAmount(result.perPerson)}
                      </dd>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <dt className="text-xs text-[var(--text-secondary)]">Tip per person</dt>
                      <dd className="font-mono text-sm text-[var(--text-secondary)]">
                        {formatTipAmount(result.tipPerPerson)}
                      </dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            </ResultReveal>
          </div>
        )}
      </ToolPanel>

      <p className="text-sm text-[var(--text-secondary)]">
        Calculations happen on this device only. Amounts are rounded to two decimals for display.
      </p>
    </div>
  )
}
