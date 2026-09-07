import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  maximumSlugChars,
  maximumSlugLength,
  slugSeparators,
  textToSlug,
  type SlugSeparator,
} from "./slug"

export default function TextToSlug() {
  const [input, setInput] = useState("")
  const [separator, setSeparator] = useState<SlugSeparator>("-")
  const [lowercase, setLowercase] = useState(true)
  const [removeStopWords, setRemoveStopWords] = useState(false)
  const [maximumLength, setMaximumLength] = useState("0")
  const overLimit = input.length > maximumSlugChars

  const maximumLengthValue = Number.parseInt(maximumLength, 10)
  const maximumLengthValid =
    maximumLength === "" ||
    (Number.isInteger(maximumLengthValue) &&
      maximumLengthValue >= 0 &&
      maximumLengthValue <= maximumSlugLength)
  const effectiveLength =
    maximumLength === ""
      ? 0
      : Number.isInteger(maximumLengthValue)
        ? Math.max(0, maximumLengthValue)
        : 0

  const result =
    overLimit || !maximumLengthValid
      ? undefined
      : textToSlug(input, {
          separator,
          lowercase,
          removeStopWords,
          maximumLength: effectiveLength,
        })

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${maximumSlugChars.toLocaleString("en-US")} character limit. Shorten it to convert.`
              : undefined
          }
          hint={`The slug updates as you type, up to ${maximumSlugChars.toLocaleString("en-US")} characters.`}
          htmlFor="slug-input"
          label="Text"
        >
          <textarea
            aria-describedby={overLimit ? "slug-input-error" : "slug-input-hint"}
            className="app-input min-h-28 resize-y"
            id="slug-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type or paste text to convert to a slug…"
            value={input}
          />
        </Field>
      </ToolPanel>

      <ToolPanel title="Options">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Separator</legend>
          <div className="grid grid-cols-3 gap-2">
            {slugSeparators.map((option) => (
              <label
                className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 py-2 font-mono text-sm ${
                  separator === option.id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={option.id}
              >
                <input
                  checked={separator === option.id}
                  className="sr-only"
                  name="slug-separator"
                  onChange={() => setSeparator(option.id)}
                  type="radio"
                  value={option.id}
                />
                <span aria-hidden="true">{option.id}</span>
                <span className="sr-only">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 flex min-h-12 items-center gap-3">
          <input
            checked={lowercase}
            className="h-5 w-5 accent-[var(--primary)]"
            onChange={(event) => setLowercase(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm font-medium">Lowercase the slug</span>
        </label>
        <label className="flex min-h-12 items-center gap-3">
          <input
            checked={removeStopWords}
            className="h-5 w-5 accent-[var(--primary)]"
            onChange={(event) => setRemoveStopWords(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm font-medium">Remove common stop words</span>
        </label>

        <Field
          error={
            maximumLengthValid
              ? undefined
              : `Enter a maximum length between 0 and ${maximumSlugLength.toLocaleString("en-US")}, or 0 for unlimited.`
          }
          hint={`0 means unlimited; the cap is ${maximumSlugLength.toLocaleString("en-US")}.`}
          htmlFor="slug-max-length"
          label="Maximum length"
        >
          <input
            aria-describedby={maximumLengthValid ? "slug-max-length-hint" : "slug-max-length-error"}
            className="app-input font-mono"
            id="slug-max-length"
            inputMode="numeric"
            onChange={(event) => setMaximumLength(event.target.value)}
            value={maximumLength}
          />
        </Field>
      </ToolPanel>

      {result && result.slug ? (
        <ToolPanel
          action={<CopyButton label="Copy" onStatus={() => undefined} value={result.slug} />}
          title="Slug"
        >
          <p className="break-all font-mono text-lg">{result.slug}</p>
        </ToolPanel>
      ) : (
        <ToolPanel muted title="Slug">
          <p className="text-sm text-[var(--text-secondary)]">
            {overLimit
              ? "Shorten the text to generate a slug."
              : "Enter text above to generate a slug."}
          </p>
        </ToolPanel>
      )}

      {result && result.slug ? (
        <ToolPanel muted title="Conversion steps">
          <ol className="grid gap-2">
            {result.steps.map((step) => (
              <li
                className="flex items-start gap-3 rounded-2xl border border-[var(--border)] px-3 py-2"
                key={`${step.label}-${step.value}`}
              >
                <span className="whitespace-nowrap text-xs font-semibold text-[var(--primary)]">
                  {step.label}
                </span>
                <span className="break-all font-mono text-sm">{step.value}</span>
              </li>
            ))}
          </ol>
        </ToolPanel>
      ) : null}

      <p className="text-sm text-[var(--text-secondary)]">
        Diacritics are removed by Unicode decomposition, and only A–Z, a–z, and 0–9 survive —
        characters from non-Latin scripts are removed rather than transliterated. Slugs are
        generated on this device.
      </p>
    </div>
  )
}
