import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  getReverseOption,
  maximumReverseChars,
  reverseOptions,
  reverseText,
  type ReverseMode,
} from "./reverse"

export default function ReverseText() {
  const [text, setText] = useState("")
  const [mode, setMode] = useState<ReverseMode>("characters")
  const overLimit = text.length > maximumReverseChars
  const limitLabel = maximumReverseChars.toLocaleString("en-US")

  const activeOption = getReverseOption(mode)
  const output = useMemo(
    // Bounded work by construction: the input is rejected above the limit.
    () => (overLimit ? null : reverseText(text, mode)),
    [text, mode, overLimit],
  )

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${limitLabel} character limit. Shorten it to reverse.`
              : undefined
          }
          hint={`Reversal updates as you type, up to ${limitLabel} characters.`}
          htmlFor="reverse-input"
          label="Text"
        >
          <textarea
            aria-describedby={overLimit ? "reverse-input-error" : "reverse-input-hint"}
            className="app-input min-h-32 resize-y"
            id="reverse-input"
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste text to reverse…"
            value={text}
          />
        </Field>
        <fieldset className="mt-4 grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Mode</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {reverseOptions.map((option) => (
              <label
                className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 ${
                  mode === option.id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={option.id}
              >
                <input
                  checked={mode === option.id}
                  className="accent-[var(--primary)]"
                  name="reverse-mode"
                  onChange={() => setMode(option.id)}
                  type="radio"
                  value={option.id}
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            {activeOption.description}
          </p>
        </fieldset>
      </ToolPanel>

      <ToolPanel
        action={
          output && text.length > 0 ? (
            <CopyButton label="Copy" onStatus={() => undefined} value={output} />
          ) : undefined
        }
        title="Result"
      >
        {overLimit ? (
          <p role="alert">
            The text exceeds the {limitLabel} character limit. Shorten it to reverse.
          </p>
        ) : text.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter text above and pick a mode to see it reversed.
          </p>
        ) : (
          <p className="break-all font-mono text-sm">{output || "—"}</p>
        )}
      </ToolPanel>
      <p className="text-sm text-[var(--text-secondary)]">
        Reversal keeps grapheme clusters such as emoji intact, and it never sends text anywhere.
      </p>
    </div>
  )
}
