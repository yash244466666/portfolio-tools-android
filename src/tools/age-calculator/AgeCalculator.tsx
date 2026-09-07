import { useMemo, useState } from "react"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { computeAge, todayIso, type AgeResult } from "./age"

function AgeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-center">
      <p className="font-mono text-2xl font-bold text-[var(--text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{label}</p>
    </div>
  )
}

export default function AgeCalculator() {
  const [birthDate, setBirthDate] = useState("")
  const [now] = useState(() => new Date())
  const today = todayIso(now)

  const result = useMemo<AgeResult | null>(() => computeAge(birthDate, now), [birthDate, now])
  const invalid = birthDate !== "" && result === null
  const futureDate = useMemo(() => {
    if (birthDate === "") return false
    const parsed = computeAge(birthDate, now)
    if (parsed !== null) return false
    const [year, month, day] = birthDate.split("-").map(Number)
    if (year === undefined || month === undefined || day === undefined) return false
    return new Date(year, month - 1, day).getTime() > now.getTime()
  }, [birthDate, now])

  return (
    <div className="grid gap-4">
      <ToolPanel title="Birth date">
        <Field
          error={
            futureDate
              ? "Enter a birth date on or before today."
              : invalid
                ? "Enter a valid birth date."
                : undefined
          }
          hint={`On or before ${today}. The age updates from this date using this device's time.`}
          htmlFor="age-birth-date"
          label="Birth date"
        >
          <input
            className="app-input font-mono"
            id="age-birth-date"
            max={today}
            onChange={(event) => setBirthDate(event.target.value)}
            type="date"
            value={birthDate}
          />
        </Field>
      </ToolPanel>

      {result === null ? (
        <ToolPanel title="Your age">
          <p className="text-sm text-[var(--text-secondary)]">
            {invalid
              ? "Correct the birth date above to see the age."
              : "Pick a birth date above. Everything is computed on this device."}
          </p>
        </ToolPanel>
      ) : (
        <>
          <ToolPanel title="Your age">
            <p
              aria-label="Computed age"
              aria-live="polite"
              className="text-center font-mono text-3xl font-bold text-[var(--text)]"
            >
              {result.years}{" "}
              <span className="text-lg font-medium text-[var(--text-secondary)]">years</span>{" "}
              {result.months}{" "}
              <span className="text-lg font-medium text-[var(--text-secondary)]">months</span>{" "}
              {result.days}{" "}
              <span className="text-lg font-medium text-[var(--text-secondary)]">days</span>
            </p>
          </ToolPanel>

          <div className="grid grid-cols-3 gap-2">
            <AgeStat label="Total days" value={result.totalDays.toLocaleString("en-US")} />
            <AgeStat label="Total hours" value={result.totalHours.toLocaleString("en-US")} />
            <AgeStat label="Total minutes" value={result.totalMinutes.toLocaleString("en-US")} />
          </div>

          <ToolPanel title="Next birthday">
            <p className="text-center text-sm font-medium text-[var(--primary)]">
              Next birthday in {result.daysUntilBirthday}{" "}
              {result.daysUntilBirthday === 1 ? "day" : "days"}
            </p>
            <p className="mt-1 text-center text-xs text-[var(--text-secondary)]">
              Turning {result.nextBirthdayAge} years old on {result.nextBirthdayIso}
            </p>
          </ToolPanel>
        </>
      )}

      <p className="text-sm text-[var(--text-secondary)]">
        The age uses the calendar date entered and this device's local time. Day and hour totals
        count clock changes such as daylight saving, so they are approximate across long spans.
      </p>
    </div>
  )
}
