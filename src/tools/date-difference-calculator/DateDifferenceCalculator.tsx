import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import { computeDateDifference, type CalendarDate, type DayCountMode } from "./date-difference"

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Strict `YYYY-MM-DD` parsing with a real-calendar validity check (the
 * ical-generator pattern): components only, never `new Date(string)`.
 */
export function parseCalendarDate(value: string): CalendarDate | null {
  const match = datePattern.exec(value.trim())
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

export default function DateDifferenceCalculator() {
  const [startText, setStartText] = useState("")
  const [endText, setEndText] = useState("")
  const [mode, setMode] = useState<DayCountMode>("exclusive")

  const start = useMemo(() => parseCalendarDate(startText), [startText])
  const end = useMemo(() => parseCalendarDate(endText), [endText])
  const startInvalid = startText.trim() !== "" && start === null
  const endInvalid = endText.trim() !== "" && end === null

  const result =
    start !== null && end !== null && !startInvalid && !endInvalid
      ? computeDateDifference(start, end, mode)
      : null

  return (
    <div className="grid gap-4">
      <ToolPanel title="Dates">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={startInvalid ? "Enter a real date as YYYY-MM-DD." : undefined}
              hint="Format YYYY-MM-DD, e.g. 2026-09-08."
              htmlFor="date-diff-start"
              label="Start date"
            >
              <input
                className="app-input font-mono"
                id="date-diff-start"
                onChange={(event) => setStartText(event.target.value)}
                placeholder="2026-09-01"
                value={startText}
              />
            </Field>
            <Field
              error={endInvalid ? "Enter a real date as YYYY-MM-DD." : undefined}
              hint="Format YYYY-MM-DD, e.g. 2026-12-24."
              htmlFor="date-diff-end"
              label="End date"
            >
              <input
                className="app-input font-mono"
                id="date-diff-end"
                onChange={(event) => setEndText(event.target.value)}
                placeholder="2026-12-24"
                value={endText}
              />
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-[var(--text)]">Count mode</legend>
            <div className="flex flex-wrap gap-2">
              <Button
                aria-pressed={mode === "exclusive"}
                onClick={() => setMode("exclusive")}
                variant={mode === "exclusive" ? "primary" : "secondary"}
              >
                Exclusive of end date
              </Button>
              <Button
                aria-pressed={mode === "inclusive"}
                onClick={() => setMode("inclusive")}
                variant={mode === "inclusive" ? "primary" : "secondary"}
              >
                Inclusive of end date
              </Button>
            </div>
          </fieldset>
          {(startInvalid || endInvalid) && (
            <div>
              <Button
                onClick={() => {
                  setStartText("")
                  setEndText("")
                }}
                variant="quiet"
              >
                Clear dates
              </Button>
            </div>
          )}
        </div>
      </ToolPanel>

      <ToolPanel title="Difference">
        <ResultReveal variant="quick" token={result ? result.totalDays : "empty"}>
          <p aria-live="polite" className="text-sm" role="status">
            {result
              ? `That span is ${result.totalDays.toLocaleString("en-US")} day${result.totalDays === 1 ? "" : "s"} (${result.weeks.toLocaleString("en-US")} week${result.weeks === 1 ? "" : "s"} and ${result.remainderDays} day${result.remainderDays === 1 ? "" : "s"}), ${result.months.toLocaleString("en-US")} calendar month${result.months === 1 ? "" : "s"} and ${result.remainderOfMonths} day${result.remainderOfMonths === 1 ? "" : "s"}, with ${result.businessDays.toLocaleString("en-US")} business day${result.businessDays === 1 ? "" : "s"} (Monday-Friday).`
              : startInvalid || endInvalid
                ? "Fix the highlighted date to compute the difference."
                : "Enter both dates to see the difference."}
          </p>
        </ResultReveal>
        {result ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Date difference breakdown</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <th scope="col" className="py-2">
                  Measure
                </th>
                <th scope="col" className="py-2 text-right">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Total days</td>
                <td className="py-2 text-right font-mono">{result.totalDays}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Weeks + days</td>
                <td className="py-2 text-right font-mono">
                  {result.weeks} w {result.remainderDays} d
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Months + days (calendar-accurate)</td>
                <td className="py-2 text-right font-mono">
                  {result.months} mo {result.remainderOfMonths} d
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Business days (Mon-Fri)</td>
                <td className="py-2 text-right font-mono">{result.businessDays}</td>
              </tr>
            </tbody>
          </table>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Dates are parsed as strict components and computed on UTC anchors, never through locale date
        parsing. Months follow the real calendar (Jan 31 to Mar 1 is one month and one day).
        Business days count Monday through Friday and ignore regional holidays. Everything runs on
        this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
