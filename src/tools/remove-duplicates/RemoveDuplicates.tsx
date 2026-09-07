import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  dedupe,
  defaultDedupeOptions,
  getDedupeOption,
  maximumDedupeChars,
  type DedupeMode,
} from "./dedupe"

export default function RemoveDuplicates() {
  const [text, setText] = useState("")
  const [mode, setMode] = useState<DedupeMode>("lines")
  const [caseSensitive, setCaseSensitive] = useState(defaultDedupeOptions.caseSensitive)
  const [sortOutput, setSortOutput] = useState(defaultDedupeOptions.sortOutput)
  const overLimit = text.length > maximumDedupeChars
  const limitLabel = maximumDedupeChars.toLocaleString("en-US")

  const activeOption = getDedupeOption(mode)
  const result = useMemo(
    () => (overLimit ? null : dedupe(text, mode, { caseSensitive, sortOutput })),
    [text, mode, caseSensitive, sortOutput, overLimit],
  )

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${limitLabel} character limit. Shorten it to deduplicate.`
              : undefined
          }
          hint={`Deduplication updates as you type, up to ${limitLabel} characters.`}
          htmlFor="remove-duplicates-input"
          label={mode === "lines" ? "Lines" : "Words"}
        >
          <textarea
            aria-describedby={
              overLimit ? "remove-duplicates-input-error" : "remove-duplicates-input-hint"
            }
            className="app-input min-h-32 resize-y font-mono"
            id="remove-duplicates-input"
            onChange={(event) => setText(event.target.value)}
            placeholder={
              mode === "lines" ? "Paste lines here, one per line…" : "Type or paste words here…"
            }
            value={text}
          />
        </Field>
        <fieldset className="mt-4 grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Compare</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["lines", "words"] as DedupeMode[]).map((id) => (
              <label
                className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 ${
                  mode === id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={id}
              >
                <input
                  checked={mode === id}
                  className="accent-[var(--primary)]"
                  name="remove-duplicates-mode"
                  onChange={() => setMode(id)}
                  type="radio"
                  value={id}
                />
                <span className="text-sm font-medium">{getDedupeOption(id).label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            {activeOption.description}
          </p>
        </fieldset>
        <div className="mt-2 grid gap-2">
          <label className="flex min-h-12 items-center gap-3">
            <input
              checked={caseSensitive}
              className="accent-[var(--primary)]"
              onChange={(event) => setCaseSensitive(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium">Case sensitive</span>
          </label>
          <label className="flex min-h-12 items-center gap-3">
            <input
              checked={sortOutput}
              className="accent-[var(--primary)]"
              onChange={(event) => setSortOutput(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium">Sort unique output</span>
          </label>
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          result && text.length > 0 ? (
            <CopyButton label="Copy" onStatus={() => undefined} value={result.output} />
          ) : undefined
        }
        title="Result"
      >
        {overLimit ? (
          <p role="alert">
            The text exceeds the {limitLabel} character limit. Shorten it to deduplicate.
          </p>
        ) : text.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter text above to remove duplicates while keeping the first occurrence.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              {result?.total.toLocaleString("en-US")} in;{" "}
              {(result ? result.total - result.removed : 0).toLocaleString("en-US")} unique;{" "}
              {result?.removed.toLocaleString("en-US")} removed.
            </p>
            <p className="whitespace-pre-wrap break-all font-mono text-sm">
              {result?.output === "" ? "—" : result?.output}
            </p>
          </>
        )}
      </ToolPanel>
      <p className="text-sm text-[var(--text-secondary)]">
        Deduplication happens on this device only. Case-insensitive comparison keeps the casing of
        the first occurrence.
      </p>
    </div>
  )
}
