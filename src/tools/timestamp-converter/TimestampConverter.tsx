import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  dateTimeLocalToTimestamp,
  parseTimestamp,
  type TimestampDetails,
  type TimestampUnit,
} from "@/tools/timestamp-converter/timestamp"

function Details({
  details,
  onStatus,
}: {
  details: TimestampDetails
  onStatus: (value: string) => void
}) {
  const rows = [
    ["ISO 8601", details.iso],
    ["UTC", details.utc],
    ["Local", details.local],
    ["Unix seconds", String(details.unixSeconds)],
    ["Unix milliseconds", String(details.unixMilliseconds)],
  ] as const

  return (
    <ToolPanel title="Converted time">
      <dl className="grid gap-4">
        {rows.map(([label, value]) => (
          <div
            className="grid gap-1 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
            key={label}
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {label}
            </dt>
            <dd className="flex items-start justify-between gap-2">
              <span className="min-w-0 break-words font-mono text-sm text-[var(--text)]">
                {value}
              </span>
              <CopyButton label={`Copy ${label}`} onStatus={onStatus} value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </ToolPanel>
  )
}

export default function TimestampConverter() {
  const [now, setNow] = useState(() => Date.now())
  const [timestamp, setTimestamp] = useState("")
  const [unit, setUnit] = useState<TimestampUnit>("seconds")
  const [localDate, setLocalDate] = useState("")
  const [details, setDetails] = useState<TimestampDetails | null>(null)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  function convertTimestamp() {
    const parsed = parseTimestamp(timestamp, unit)
    setDetails(parsed)
    setError(parsed ? "" : "Enter a whole Unix timestamp within JavaScript's supported date range.")
  }

  function convertLocalDate() {
    const parsed = dateTimeLocalToTimestamp(localDate)
    setDetails(parsed)
    setError(parsed ? "" : "Choose a valid local date and time.")
  }

  function useCurrentTime() {
    const seconds = Math.floor(Date.now() / 1000)
    setTimestamp(String(seconds))
    setUnit("seconds")
    setDetails(parseTimestamp(String(seconds), "seconds"))
    setError("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel muted>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Current Unix time
        </p>
        <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-[var(--text)]">
          {Math.floor(now / 1000)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{new Date(now).toUTCString()}</p>
      </ToolPanel>

      <ToolPanel title="Unix timestamp to date">
        <div className="grid gap-4">
          <Field
            error={error && timestamp ? error : undefined}
            htmlFor="timestamp"
            label="Unix timestamp"
          >
            <input
              aria-describedby={error && timestamp ? "timestamp-error" : undefined}
              className="app-input font-mono"
              id="timestamp"
              inputMode="numeric"
              onChange={(event) => setTimestamp(event.target.value)}
              placeholder="1700000000"
              value={timestamp}
            />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">Timestamp unit</legend>
            <div className="segmented-control">
              {(["seconds", "milliseconds"] as const).map((option) => (
                <button
                  aria-pressed={unit === option}
                  className="segment"
                  key={option}
                  onClick={() => setUnit(option)}
                  type="button"
                >
                  {option === "seconds" ? "Seconds" : "Milliseconds"}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button disabled={!timestamp} onClick={convertTimestamp}>
              Convert timestamp
            </Button>
            <Button onClick={useCurrentTime} variant="secondary">
              Use current time
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Local date to timestamp">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field
            error={error && localDate ? error : undefined}
            htmlFor="local-date"
            label="Local date and time"
          >
            <input
              className="app-input"
              id="local-date"
              onChange={(event) => setLocalDate(event.target.value)}
              type="datetime-local"
              value={localDate}
            />
          </Field>
          <Button disabled={!localDate} onClick={convertLocalDate}>
            Convert date
          </Button>
        </div>
      </ToolPanel>

      {details ? <Details details={details} onStatus={setStatus} /> : null}
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  )
}
