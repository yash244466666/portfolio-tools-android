import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { buildIcsCalendar, formatIcsStamp, icsUidFromUuid } from "./ical"

export default function IcsGenerator() {
  const { random } = usePlatform()
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("10:00")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")

  function generate() {
    const result = buildIcsCalendar(
      { title, startDate, startTime, endDate, endTime, location, description, url, allDay },
      {
        uid: icsUidFromUuid(random.uuid()),
        now: formatIcsStamp(new Date()),
      },
    )
    if (result.status === "error") {
      setOutput("")
      setError(result.message)
      return
    }
    setError("")
    setOutput(result.calendar)
  }

  function reset() {
    setTitle("")
    setStartDate("")
    setStartTime("09:00")
    setEndDate("")
    setEndTime("10:00")
    setLocation("")
    setDescription("")
    setUrl("")
    setAllDay(false)
    setOutput("")
    setError("")
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Event details">
        <div className="grid gap-3">
          <Field
            error={error === "" ? undefined : error}
            hint="Escaping follows RFC 5545: backslash, semicolon, comma, and newlines in any field are safe."
            htmlFor="ics-title"
            label="Event title"
          >
            <input
              className="app-input"
              id="ics-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Meeting with team"
              value={title}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              hint={allDay ? "Used as the all-day start date." : undefined}
              htmlFor="ics-start-date"
              label="Start date"
            >
              <input
                className="app-input"
                id="ics-start-date"
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </Field>
            <Field
              hint={
                allDay
                  ? "Last day of the event (inclusive). A one-day event uses the same date twice."
                  : "The event must end after it starts."
              }
              htmlFor="ics-end-date"
              label="End date"
            >
              <input
                className="app-input"
                id="ics-end-date"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </Field>
          </div>
          {!allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <Field htmlFor="ics-start-time" label="Start time">
                <input
                  className="app-input"
                  id="ics-start-time"
                  onChange={(event) => setStartTime(event.target.value)}
                  type="time"
                  value={startTime}
                />
              </Field>
              <Field htmlFor="ics-end-time" label="End time">
                <input
                  className="app-input"
                  id="ics-end-time"
                  onChange={(event) => setEndTime(event.target.value)}
                  type="time"
                  value={endTime}
                />
              </Field>
            </div>
          ) : null}
          <Field htmlFor="ics-location" label="Location (optional)">
            <input
              className="app-input"
              id="ics-location"
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Conference Room B"
              value={location}
            />
          </Field>
          <Field htmlFor="ics-description" label="Description (optional)">
            <textarea
              className="app-input min-h-20"
              id="ics-description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </Field>
          <Field
            hint="Only https links are included."
            htmlFor="ics-url"
            label="Event URL (optional)"
          >
            <input
              className="app-input"
              id="ics-url"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/meeting"
              value={url}
            />
          </Field>
          <label className="flex min-h-12 items-center gap-2 text-sm">
            <input
              aria-label="All-day event"
              checked={allDay}
              name="ics-all-day"
              onChange={(event) => setAllDay(event.target.checked)}
              type="checkbox"
            />
            All-day event
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={generate}>Generate .ics</Button>
          <Button onClick={reset} variant="quiet">
            Clear
          </Button>
        </div>
      </ToolPanel>

      {output !== "" ? (
        <ToolPanel
          title="Result"
          action={<CopyButton label="Copy iCalendar" onStatus={setStatus} value={output} />}
        >
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
            {output}
          </pre>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Times are floating local times: the calendar stores no timezone offset, so the event shows
        at the same local clock time everywhere. Every generated event gets a fresh UID from the
        platform's secure random source. Nothing is saved or uploaded; this tool has no network
        access.
      </p>
    </div>
  )
}
