import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import { convertTimeZone, ianaZones, type TimeZoneConversion } from "./time-zones"

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/
const timePattern = /^(\d{2}):(\d{2})$/

function parseDatePart(value: string): { year: number; month: number; day: number } | null {
  const match = datePattern.exec(value.trim())
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
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

function parseTimePart(value: string): { hour: number; minute: number } | null {
  const match = timePattern.exec(value.trim())
  if (match === null) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

export default function TimeZoneConverter() {
  const [dateText, setDateText] = useState("")
  const [timeText, setTimeText] = useState("")
  const [fromZone, setFromZone] = useState("America/New_York")
  const [toZone, setToZone] = useState("Asia/Dhaka")

  const date = useMemo(() => parseDatePart(dateText), [dateText])
  const time = useMemo(() => parseTimePart(timeText), [timeText])
  const dateInvalid = dateText.trim() !== "" && date === null
  const timeInvalid = timeText.trim() !== "" && time === null

  const result: TimeZoneConversion | null =
    date !== null && time !== null && !dateInvalid && !timeInvalid
      ? convertTimeZone({ ...date, ...time }, fromZone, toZone)
      : null

  return (
    <div className="grid gap-4">
      <ToolPanel title="Local time to convert">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={dateInvalid ? "Enter a real date as YYYY-MM-DD." : undefined}
              hint="Format YYYY-MM-DD."
              htmlFor="time-zone-date"
              label="Date"
            >
              <input
                className="app-input font-mono"
                id="time-zone-date"
                onChange={(event) => setDateText(event.target.value)}
                placeholder="2026-09-08"
                value={dateText}
              />
            </Field>
            <Field
              error={timeInvalid ? "Enter a time as HH:mm (00:00-23:59)." : undefined}
              hint="Format HH:mm, 24-hour."
              htmlFor="time-zone-time"
              label="Time"
            >
              <input
                className="app-input font-mono"
                id="time-zone-time"
                onChange={(event) => setTimeText(event.target.value)}
                placeholder="12:00"
                value={timeText}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="time-zone-from">
                From zone
              </label>
              <select
                className="app-input"
                id="time-zone-from"
                onChange={(event) => setFromZone(event.target.value)}
                value={fromZone}
              >
                {ianaZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="time-zone-to">
                To zone
              </label>
              <select
                className="app-input"
                id="time-zone-to"
                onChange={(event) => setToZone(event.target.value)}
                value={toZone}
              >
                {ianaZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Button
              onClick={() => {
                setDateText("")
                setTimeText("")
              }}
              variant="quiet"
            >
              Clear
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Converted time">
        <p aria-live="polite" className="text-sm" role="status">
          {result
            ? result.status === "error"
              ? result.message
              : `${dateText} ${timeText} in ${fromZone} is ${result.formatted} in ${toZone}.`
            : dateInvalid || timeInvalid
              ? "Fix the highlighted date or time to convert."
              : "Enter a date and time to convert."}
        </p>
        {result && result.status !== "error" ? (
          <>
            <ResultReveal variant="quick" token={result.formatted}>
              <dl className="mt-3 grid gap-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Converted</dt>
                  <dd className="font-mono">{result.formatted}</dd>
                </div>
              </dl>
            </ResultReveal>
            {result.status === "skipped" || result.status === "ambiguous" ? (
              <p className="text-sm" role="alert">
                {result.note}
              </p>
            ) : null}
          </>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Conversions run through the platform's Intl time-zone data with an explicit zone, never
        locale date parsing. The zone list is a fixed offline subset of the public-domain IANA
        database. Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
