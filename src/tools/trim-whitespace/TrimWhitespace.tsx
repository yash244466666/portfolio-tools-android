import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { defaultTrimOptions, maximumTrimChars, trimWhitespace, type TrimOptions } from "./trim"

const checkboxOptions: readonly {
  id: keyof TrimOptions
  label: string
}[] = [
  { id: "trimLeading", label: "Trim leading whitespace" },
  { id: "trimTrailing", label: "Trim trailing whitespace" },
  { id: "collapseSpaces", label: "Collapse multiple spaces" },
  { id: "removeBlankLines", label: "Remove blank lines" },
]

export default function TrimWhitespace() {
  const [text, setText] = useState("")
  const [options, setOptions] = useState<TrimOptions>(defaultTrimOptions)
  const overLimit = text.length > maximumTrimChars
  const limitLabel = maximumTrimChars.toLocaleString("en-US")

  const result = useMemo(
    () => (overLimit ? null : trimWhitespace(text, options)),
    [text, options, overLimit],
  )
  const saved = result ? result.beforeChars - result.afterChars : 0

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${limitLabel} character limit. Shorten it to trim.`
              : undefined
          }
          hint={`Trimming updates as you type, up to ${limitLabel} characters.`}
          htmlFor="trim-whitespace-input"
          label="Text"
        >
          <textarea
            aria-describedby={
              overLimit ? "trim-whitespace-input-error" : "trim-whitespace-input-hint"
            }
            className="app-input min-h-32 resize-y font-mono"
            id="trim-whitespace-input"
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste text to trim…"
            value={text}
          />
        </Field>
        <div className="mt-4 grid gap-2">
          {checkboxOptions.map((option) => (
            <label className="flex min-h-12 items-center gap-3" key={option.id}>
              <input
                checked={options[option.id]}
                className="accent-[var(--primary)]"
                onChange={(event) =>
                  setOptions((previous) => ({
                    ...previous,
                    [option.id]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
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
          <p role="alert">The text exceeds the {limitLabel} character limit. Shorten it to trim.</p>
        ) : text.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter text above to trim its whitespace.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              Before: {result?.beforeChars.toLocaleString("en-US")} · After:{" "}
              {result?.afterChars.toLocaleString("en-US")} · Saved: {saved.toLocaleString("en-US")}{" "}
              characters
            </p>
            <p className="whitespace-pre-wrap break-all font-mono text-sm">
              {result?.output === "" ? "—" : result?.output}
            </p>
          </>
        )}
      </ToolPanel>
      <p className="text-sm text-[var(--text-secondary)]">
        Trimming happens on this device only. Collapsing affects runs of spaces; tabs and
        indentation are preserved.
      </p>
    </div>
  )
}
