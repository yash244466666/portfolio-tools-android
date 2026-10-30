import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import {
  calculateDate,
  dateUnits,
  formatIsoDate,
  maximumDateAmount,
  todayCalendarDate,
  type DateOperation,
  type DateUnit,
} from "./date-calculator"

export default function DateCalculator() {
  const [start, setStart] = useState("")
  const [operation, setOperation] = useState<DateOperation>("add")
  const [amount, setAmount] = useState("7")
  const [unit, setUnit] = useState<DateUnit>("days")
  const [status, setStatus] = useState("")

  const result = useMemo(() => {
    if (start.trim() === "") return null
    return calculateDate({ start, operation, amount, unit })
  }, [amount, operation, start, unit])

  const calculation = result?.status === "ok" ? result.calculation : null

  return (
    <div className="grid gap-4">
      <ToolPanel title="Calculate a date">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field
              hint="Format YYYY-MM-DD, e.g. 2026-10-30."
              htmlFor="date-calculator-start"
              label="Start date"
            >
              <input
                autoComplete="off"
                className="app-input font-mono"
                id="date-calculator-start"
                onChange={(event) => setStart(event.target.value)}
                placeholder="2026-10-30"
                value={start}
              />
            </Field>
            <button
              className="text-link min-h-12"
              onClick={() => setStart(formatIsoDate(todayCalendarDate(new Date())))}
              type="button"
            >
              Use today
            </button>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-[var(--text)]">Operation</legend>
            <div className="flex flex-wrap gap-2">
              <button
                aria-pressed={operation === "add"}
                className="segment"
                onClick={() => setOperation("add")}
                type="button"
              >
                Add
              </button>
              <button
                aria-pressed={operation === "subtract"}
                className="segment"
                onClick={() => setOperation("subtract")}
                type="button"
              >
                Subtract
              </button>
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              hint={`A whole number from 0 to ${maximumDateAmount.toLocaleString("en-US")}.`}
              htmlFor="date-calculator-amount"
              label="Amount"
            >
              <input
                autoComplete="off"
                className="app-input font-mono"
                id="date-calculator-amount"
                inputMode="numeric"
                onChange={(event) => setAmount(event.target.value)}
                value={amount}
              />
            </Field>
            <Field htmlFor="date-calculator-unit" label="Unit">
              <select
                className="app-input"
                id="date-calculator-unit"
                onChange={(event) => setUnit(event.target.value as DateUnit)}
                value={unit}
              >
                {dateUnits.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {result?.status === "error" ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {result.message}
            </p>
          ) : null}

          <div>
            <button className="text-link min-h-12" onClick={() => setStart("")} type="button">
              Clear date
            </button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          calculation ? (
            <CopyButton label="Copy result date" onStatus={setStatus} value={calculation.iso} />
          ) : undefined
        }
        title="Result"
      >
        {start.trim() === "" ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Enter a start date, or use today, then choose an operation, amount, and unit.
          </p>
        ) : calculation ? (
          <ResultReveal variant="quick" token={calculation.iso}>
            <output className="block font-mono text-2xl font-semibold" id="date-calculator-result">
              {calculation.iso}
            </output>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{calculation.weekday}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {calculation.totalDays === 0
                ? "The result is the same calendar date."
                : `${Math.abs(calculation.totalDays).toLocaleString("en-US")} calendar day${
                    Math.abs(calculation.totalDays) === 1 ? "" : "s"
                  } ${calculation.totalDays > 0 ? "after" : "before"} the start date.`}
            </p>
            <p aria-live="polite" className="sr-only" role="status">
              Result {calculation.iso}, {calculation.weekday}.
            </p>
          </ResultReveal>
        ) : null}
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Adding or subtracting months and years clamps to the target month&apos;s last day, so 31
        January plus one month is 28 or 29 February. Business days count Monday–Friday and do not
        account for public holidays. Dates are calculated on this device and nothing is saved.
      </p>
    </div>
  )
}
