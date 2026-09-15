import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  cronFieldNames,
  cronFieldRanges,
  cronPresets,
  dayOfWeekNames,
  describeCron,
  maximumCronExpressionLength,
  monthNames,
  parseCronFields,
} from "./cron"

const emptyFields = ["", "", "", "", ""] as string[]

export default function CronBuilder() {
  const [expression, setExpression] = useState("0 9 * * 1-5")
  const [fields, setFields] = useState<string[]>(["0", "9", "*", "*", "1-5"])

  const parsed = parseCronFields(expression)
  const description = parsed.valid && parsed.fields !== null ? describeCron(parsed.fields) : null

  function updateExpression(value: string) {
    setExpression(value)
    const parts = value.trim().split(/\s+/)
    if (parts.length === 5 && value.trim() !== "") {
      setFields([...parts])
    }
  }

  function updateField(index: number, value: string) {
    const next = [...fields]
    next[index] = value
    setFields(next)
    setExpression(next.join(" "))
  }

  function applyPreset(value: string) {
    setExpression(value)
    setFields(value.split(" "))
  }

  function clearAll() {
    setExpression("")
    setFields([...emptyFields])
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Cron expression">
        <Field
          error={expression !== "" && !parsed.valid ? parsed.message : undefined}
          hint="Five space-separated fields: minute hour day-of-month month day-of-week."
          htmlFor="cron-expression"
          label="Cron expression"
        >
          <input
            className="app-input font-mono text-lg"
            id="cron-expression"
            inputMode="text"
            maxLength={maximumCronExpressionLength}
            onChange={(event) => updateExpression(event.target.value)}
            placeholder="* * * * *"
            spellCheck={false}
            value={expression}
          />
        </Field>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {cronFieldNames.map((name, index) => (
            <Field
              hint={`${cronFieldRanges[index]?.min ?? "?"}-${cronFieldRanges[index]?.max ?? "?"}`}
              htmlFor={`cron-field-${index}`}
              key={name}
              label={name}
            >
              <input
                className="app-input font-mono text-sm"
                id={`cron-field-${index}`}
                maxLength={64}
                onChange={(event) => updateField(index, event.target.value)}
                placeholder={`${cronFieldRanges[index]?.min ?? ""}-${cronFieldRanges[index]?.max ?? ""}`}
                spellCheck={false}
                value={fields[index] ?? ""}
              />
            </Field>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={clearAll} variant="quiet">
            Clear
          </Button>
        </div>
      </ToolPanel>

      {expression === "" ? null : parsed.valid ? (
        <ToolPanel muted>
          <p aria-live="polite" className="font-semibold" role="status">
            {description}
          </p>
        </ToolPanel>
      ) : (
        <ToolPanel muted>
          <p className="text-[var(--danger-text)]" role="alert">
            {parsed.message}
          </p>
        </ToolPanel>
      )}

      <ToolPanel title="Common presets">
        <div className="flex flex-wrap gap-2">
          {cronPresets.map((preset) => (
            <button
              className={`min-h-12 rounded-xl border px-3 py-2 text-sm ${
                expression === preset.value
                  ? "border-[var(--primary)] bg-[var(--primary)] font-semibold text-[var(--on-primary)]"
                  : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)]"
              }`}
              key={preset.label}
              onClick={() => applyPreset(preset.value)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel title="Quick reference">
        <div className="grid grid-cols-2 gap-2 text-sm text-[var(--text-secondary)]">
          <span>
            <code className="font-mono text-[var(--text)]">*</code> — any value
          </span>
          <span>
            <code className="font-mono text-[var(--text)]">,</code> — list separator
          </span>
          <span>
            <code className="font-mono text-[var(--text)]">-</code> — range
          </span>
          <span>
            <code className="font-mono text-[var(--text)]">/</code> — step values
          </span>
        </div>
        <div className="mt-3 grid gap-1 text-xs">
          <p className="text-[var(--text-secondary)]">Days of week:</p>
          <p className="text-[var(--text)]">
            {dayOfWeekNames.map((name, index) => `${index}=${name}`).join(", ")}
          </p>
          <p className="mt-2 text-[var(--text-secondary)]">Months:</p>
          <p className="text-[var(--text)]">
            {monthNames
              .filter((name) => name !== "")
              .map((name, index) => `${index + 1}=${name}`)
              .join(", ")}
          </p>
        </div>
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Descriptions follow the standard five-field crontab syntax. Range and step validation
        catches out-of-range fields that some schedulers silently accept or reject with confusing
        errors. Nothing is saved or uploaded.
      </p>
    </div>
  )
}
