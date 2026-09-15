import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  defaultEnabled,
  maximumSanitizerChars,
  sanitizeText,
  sanitizerOptions,
  type EnabledMap,
} from "./sanitizer"

export default function DataSanitizer() {
  const [input, setInput] = useState("")
  const [enabled, setEnabled] = useState<EnabledMap>(defaultEnabled)
  const [status, setStatus] = useState("")

  const overLimit = input.length > maximumSanitizerChars
  const result = useMemo(
    () => (overLimit ? null : sanitizeText(input, enabled)),
    [input, enabled, overLimit],
  )
  const totalRemoved = result
    ? Object.values(result.counts).reduce((sum, count) => sum + count, 0)
    : 0

  return (
    <div className="grid gap-4">
      <ToolPanel title="What to strip">
        <fieldset className="grid gap-1">
          <legend className="text-sm font-semibold text-[var(--text)]">Redaction rules</legend>
          {sanitizerOptions.map((option) => (
            <label className="flex min-h-12 items-center gap-3 rounded-2xl px-2" key={option.id}>
              <input
                checked={enabled[option.id]}
                className="h-5 w-5 accent-[var(--primary)]"
                onChange={(event) =>
                  setEnabled((previous) => ({ ...previous, [option.id]: event.target.checked }))
                }
                type="checkbox"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </fieldset>
      </ToolPanel>

      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${maximumSanitizerChars.toLocaleString("en-US")} character limit. Shorten it to sanitize.`
              : undefined
          }
          hint="Processed on the device only; nothing is sent or stored. The text clears when you leave the tool."
          htmlFor="sanitizer-input"
          label="Text with sensitive data"
        >
          <textarea
            aria-describedby={overLimit ? "sanitizer-input-error" : "sanitizer-input-hint"}
            autoComplete="off"
            className="app-input min-h-28 resize-y font-mono"
            id="sanitizer-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste text that contains data to redact…"
            spellCheck={false}
            value={input}
          />
        </Field>
      </ToolPanel>

      {result ? (
        <>
          <ToolPanel
            action={<CopyButton label="Copy" onStatus={setStatus} sensitive value={result.text} />}
            title="Sanitized output"
          >
            <p className="break-all font-mono text-sm whitespace-pre-wrap">
              {result.text || (
                <span className="italic text-[var(--text-secondary)]">Nothing left to show</span>
              )}
            </p>
          </ToolPanel>

          <ToolPanel muted title="Items removed">
            <dl className="grid gap-2">
              {sanitizerOptions.map((option) => (
                <div className="flex items-center justify-between" key={option.id}>
                  <dt className="text-sm text-[var(--text-secondary)]">{option.label}</dt>
                  <dd className="font-mono text-sm">
                    {enabled[option.id] ? result.counts[option.id] : "off"}
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                <dt className="text-sm font-semibold">Total</dt>
                <dd className="font-mono text-sm font-semibold">{totalRemoved}</dd>
              </div>
            </dl>
          </ToolPanel>
        </>
      ) : (
        <ToolPanel muted title="Sanitized output">
          <p className="text-sm text-[var(--text-secondary)]">
            {overLimit
              ? "Shorten the text to sanitize it."
              : "Enter text above to redact the selected data types. Patterns are simple and cannot catch every format, so review the output before sharing."}
          </p>
        </ToolPanel>
      )}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
