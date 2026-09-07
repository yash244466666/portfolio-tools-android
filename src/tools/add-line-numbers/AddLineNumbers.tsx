import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  addLineNumbers,
  defaultNumberingOptions,
  maximumNumberingChars,
  maximumStartNumber,
  numberingSeparatorOptions,
  type NumberingPadding,
  type NumberingSeparator,
} from "./numbering"

export default function AddLineNumbers() {
  const [text, setText] = useState("")
  const [startNumber, setStartNumber] = useState(defaultNumberingOptions.startNumber)
  const [separator, setSeparator] = useState<NumberingSeparator>(defaultNumberingOptions.separator)
  const [customSeparator, setCustomSeparator] = useState(defaultNumberingOptions.customSeparator)
  const [padding, setPadding] = useState<NumberingPadding>(defaultNumberingOptions.padding)
  const overLimit = text.length > maximumNumberingChars
  const limitLabel = maximumNumberingChars.toLocaleString("en-US")
  const startInvalid =
    !Number.isInteger(startNumber) || startNumber < 0 || startNumber > maximumStartNumber

  const result = useMemo(() => {
    if (overLimit || startInvalid) return null
    return addLineNumbers(text, { startNumber, separator, customSeparator, padding })
  }, [text, startNumber, separator, customSeparator, padding, overLimit, startInvalid])

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${limitLabel} character limit. Shorten it to add numbers.`
              : undefined
          }
          hint={`Numbering updates as you type, up to ${limitLabel} characters. Every line, including a trailing empty one, receives a number.`}
          htmlFor="add-line-numbers-input"
          label="Text"
        >
          <textarea
            aria-describedby={
              overLimit ? "add-line-numbers-input-error" : "add-line-numbers-input-hint"
            }
            className="app-input min-h-32 resize-y font-mono"
            id="add-line-numbers-input"
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste text to number…"
            value={text}
          />
        </Field>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            error={
              startInvalid
                ? `Enter a whole number between 0 and ${maximumStartNumber.toLocaleString("en-US")}.`
                : undefined
            }
            htmlFor="add-line-numbers-start"
            label="Start number"
          >
            <input
              aria-describedby={
                startInvalid ? "add-line-numbers-start-error" : "add-line-numbers-start-hint"
              }
              className="app-input font-mono"
              id="add-line-numbers-start"
              inputMode="numeric"
              min={0}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10)
                setStartNumber(Number.isNaN(parsed) ? Number.NaN : parsed)
              }}
              type="number"
              value={Number.isNaN(startNumber) ? "" : startNumber}
            />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-[var(--text)]">Padding</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["auto", "none"] as NumberingPadding[]).map((id) => (
                <label
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 py-2 ${
                    padding === id
                      ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                      : "border-[var(--border)]"
                  }`}
                  key={id}
                >
                  <input
                    checked={padding === id}
                    className="accent-[var(--primary)]"
                    name="add-line-numbers-padding"
                    onChange={() => setPadding(id)}
                    type="radio"
                    value={id}
                  />
                  <span className="text-sm font-medium">
                    {id === "auto" ? "Auto (align)" : "None"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <fieldset className="mt-4 grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Separator</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {numberingSeparatorOptions.map((option) => (
              <label
                className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 ${
                  separator === option.id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={option.id}
              >
                <input
                  checked={separator === option.id}
                  className="accent-[var(--primary)]"
                  name="add-line-numbers-separator"
                  onChange={() => setSeparator(option.id)}
                  type="radio"
                  value={option.id}
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
          {separator === "custom" && (
            <Field
              hint="Inserted between the number and the line text."
              htmlFor="add-line-numbers-custom"
              label="Custom separator"
            >
              <input
                className="app-input"
                id="add-line-numbers-custom"
                onChange={(event) => setCustomSeparator(event.target.value)}
                placeholder=" | "
                value={customSeparator}
              />
            </Field>
          )}
        </fieldset>
      </ToolPanel>

      <ToolPanel
        action={
          result !== null && text.length > 0 ? (
            <CopyButton label="Copy" onStatus={() => undefined} value={result} />
          ) : undefined
        }
        title="Result"
      >
        {overLimit ? (
          <p role="alert">
            The text exceeds the {limitLabel} character limit. Shorten it to add numbers.
          </p>
        ) : startInvalid ? (
          <p role="alert">
            Fix the start number to continue numbering. Enter a whole number between 0 and{" "}
            {maximumStartNumber.toLocaleString("en-US")}.
          </p>
        ) : text.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter text above to number its lines.
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-all font-mono text-sm">{result}</p>
        )}
      </ToolPanel>
      <p className="text-sm text-[var(--text-secondary)]">
        Numbering happens on this device only. Auto padding aligns numbers with spaces up to the
        widest line number.
      </p>
    </div>
  )
}
