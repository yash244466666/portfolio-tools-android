import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  basePresets,
  formatInBase,
  maximumRadix,
  maximumDigits,
  minimumRadix,
  parseInBase,
} from "./bases"

const failureMessages: Record<string, string> = {
  "invalid-digit": "The value contains digits that are not valid in this base.",
  "too-long": `The value exceeds the ${maximumDigits.toLocaleString("en-US")} digit limit.`,
}

interface BaseRow {
  radix: number
  label: string
  /** The raw text the user is typing in this row, if they are editing it. */
  draft?: string
  failure?: string
}

export default function NumberBaseConverter() {
  const [value, setValue] = useState<bigint | null>(10n)
  const [rows, setRows] = useState<BaseRow[]>(
    basePresets.map((preset) => ({ radix: preset.radix, label: preset.label })),
  )
  const [customRadixText, setCustomRadixText] = useState("")

  function handleRowInput(index: number, radix: number, raw: string) {
    const text = raw.trim()
    if (text === "") {
      // Clearing a field clears the shared value; the other fields follow.
      setValue(null)
      setRows((current) => current.map((row) => ({ ...row, draft: undefined, failure: undefined })))
      return
    }
    const parsed = parseInBase(text, radix)
    if (parsed.status === "ok") {
      setValue(parsed.value)
      setRows((current) => current.map((row) => ({ ...row, draft: undefined, failure: undefined })))
    } else {
      const message =
        parsed.status === "invalid-radix"
          ? "This base is not supported."
          : (failureMessages[parsed.status] ?? "The value could not be parsed.")
      setRows((current) =>
        current.map((row, i) => (i === index ? { ...row, draft: raw, failure: message } : row)),
      )
    }
  }

  const customRadix = Number.parseInt(customRadixText, 10)
  const customRadixValid =
    Number.isInteger(customRadix) && customRadix >= minimumRadix && customRadix <= maximumRadix

  return (
    <div className="grid gap-4">
      <ToolPanel title="Convert">
        <div className="grid gap-4">
          {rows.map((row, index) => {
            const isDraft = row.draft !== undefined
            const display = isDraft
              ? row.draft
              : value !== null
                ? formatInBase(value, row.radix)
                : ""
            return (
              <Field
                error={row.failure}
                hint={
                  row.radix === 10 ? undefined : "Editing this field converts the other fields."
                }
                htmlFor={`base-${row.radix}`}
                key={row.radix}
                label={`${row.label} (radix ${row.radix})`}
              >
                <input
                  aria-describedby={row.failure ? `base-${row.radix}-error` : undefined}
                  className="app-input font-mono"
                  id={`base-${row.radix}`}
                  inputMode={row.radix === 10 ? "numeric" : "text"}
                  onChange={(event) => handleRowInput(index, row.radix, event.target.value)}
                  placeholder={row.radix === 10 ? "Enter a number…" : undefined}
                  value={display}
                />
              </Field>
            )
          })}
        </div>
      </ToolPanel>

      <ToolPanel title="Custom base">
        <Field
          hint={`Enter a radix between ${minimumRadix} and ${maximumRadix}.`}
          htmlFor="custom-radix"
          label="Radix"
        >
          <input
            className="app-input font-mono"
            id="custom-radix"
            inputMode="numeric"
            onChange={(event) => setCustomRadixText(event.target.value)}
            placeholder="2–36"
            value={customRadixText}
          />
        </Field>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="break-all font-mono text-lg">
            {customRadixText === ""
              ? "—"
              : !customRadixValid
                ? `Enter a radix between ${minimumRadix} and ${maximumRadix}.`
                : value !== null
                  ? formatInBase(value, customRadix)
                  : "—"}
          </p>
          {customRadixValid && value !== null ? (
            <CopyButton
              label="Copy"
              onStatus={() => undefined}
              value={formatInBase(value, customRadix)}
            />
          ) : undefined}
        </div>
      </ToolPanel>
      <p className="text-sm text-[var(--text-secondary)]">
        Values are arbitrary-precision integers, so very large magnitudes convert exactly. Only
        non-negative digits with an optional leading minus are accepted.
      </p>
    </div>
  )
}
