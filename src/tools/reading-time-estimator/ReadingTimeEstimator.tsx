import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  budgetSlots,
  clampInputText,
  countWords,
  defaultWordsPerMinute,
  evaluateBudgets,
  formatReadingTime,
  maximumInputCharacters,
  maximumWordsPerMinute,
  minimumWordsPerMinute,
  parseBudgetCap,
  parseWordsPerMinute,
  readingSeconds,
  splitMinutesSeconds,
} from "./reading-time"

const initialCaps = budgetSlots.map((slot) => String(slot.defaultCap))

export default function ReadingTimeEstimator() {
  const [text, setText] = useState("")
  const [wpmText, setWpmText] = useState(String(defaultWordsPerMinute))
  const [caps, setCaps] = useState<string[]>(initialCaps)

  const clampedText = useMemo(() => clampInputText(text), [text])
  const overCap = text.length > maximumInputCharacters
  const words = useMemo(() => countWords(clampedText), [clampedText])
  const wpm = useMemo(() => parseWordsPerMinute(wpmText), [wpmText])
  const wpmInvalid = wpmText.trim() !== "" && wpm === null

  const budgets = useMemo(
    () =>
      budgetSlots.map((slot, index) => ({
        key: slot.key,
        label: slot.label,
        cap: parseBudgetCap(caps[index] ?? "")?.value ?? slot.defaultCap,
      })),
    [caps],
  )
  const budgetClamped = caps.some(
    (cap) => cap.trim() !== "" && (parseBudgetCap(cap)?.clamped ?? false),
  )

  const time = splitMinutesSeconds(readingSeconds(words, wpm ?? defaultWordsPerMinute))
  const outcomes = evaluateBudgets(clampedText.length, budgets)

  function reset() {
    setText("")
    setWpmText(String(defaultWordsPerMinute))
    setCaps(initialCaps.map((cap) => cap))
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Text">
        <Field
          error={
            overCap
              ? `The text is capped at the first ${maximumInputCharacters.toLocaleString("en-US")} characters.`
              : undefined
          }
          hint="Words count on Unicode letter and number runs as you type."
          htmlFor="reading-time-text"
          label="Text to estimate"
        >
          <textarea
            className="app-input min-h-40"
            id="reading-time-text"
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste the draft to estimate…"
            value={text}
          />
        </Field>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {clampedText.length.toLocaleString("en-US")} /{" "}
          {maximumInputCharacters.toLocaleString("en-US")} characters ·{" "}
          {words.toLocaleString("en-US")} words
        </p>
      </ToolPanel>

      <ToolPanel title="Reading speed and budgets">
        <div className="grid gap-4">
          <Field
            error={
              wpmInvalid
                ? `Enter a reading speed between ${minimumWordsPerMinute} and ${maximumWordsPerMinute} words per minute.`
                : undefined
            }
            hint={`Clamped to ${minimumWordsPerMinute}-${maximumWordsPerMinute} wpm.`}
            htmlFor="reading-time-wpm"
            label="Reading speed (words per minute)"
          >
            <input
              className="app-input font-mono"
              id="reading-time-wpm"
              inputMode="numeric"
              onChange={(event) => setWpmText(event.target.value)}
              value={wpmText}
            />
          </Field>
          {budgetSlots.map((slot, index) => (
            <Field
              key={slot.key}
              error={
                caps[index]?.trim() !== "" && parseBudgetCap(caps[index] ?? "") === null
                  ? "Enter a cap of at least 1 character."
                  : undefined
              }
              hint={
                budgetClamped && (caps[index] ?? "").trim() !== ""
                  ? "Caps clamp into the 1-1,000,000 character range."
                  : undefined
              }
              htmlFor={`reading-time-cap-${slot.key}`}
              label={`${slot.label} cap (characters)`}
            >
              <input
                className="app-input font-mono"
                id={`reading-time-cap-${slot.key}`}
                inputMode="numeric"
                onChange={(event) =>
                  setCaps((current) =>
                    current.map((value, capIndex) =>
                      capIndex === index ? event.target.value : value,
                    ),
                  )
                }
                value={caps[index] ?? ""}
              />
            </Field>
          ))}
          <div>
            <Button onClick={reset} variant="quiet">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Estimate">
        <p aria-live="polite" className="text-sm" role="status">
          {wpmInvalid
            ? "Fix the highlighted reading speed to estimate."
            : words > 0
              ? `${words.toLocaleString("en-US")} words take about ${formatReadingTime(time)} at ${wpm ?? defaultWordsPerMinute} words per minute.`
              : clampedText.trim() !== ""
                ? "No words were found in the text (punctuation and symbols are not counted)."
                : "Enter text to estimate the reading time."}
        </p>
        {words > 0 && !wpmInvalid ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">
              Reading time and per-budget character fit for the current text
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <th scope="col" className="py-2">
                  Budget
                </th>
                <th scope="col" className="py-2 text-right">
                  Cap
                </th>
                <th scope="col" className="py-2 text-right">
                  Characters
                </th>
                <th scope="col" className="py-2 text-right">
                  Fits
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Reading time</td>
                <td className="py-2 text-right font-mono" colSpan={3}>
                  {formatReadingTime(time)} at {wpm ?? defaultWordsPerMinute} wpm
                </td>
              </tr>
              {outcomes.map((outcome) => (
                <tr className="border-t border-[var(--border)]" key={outcome.key}>
                  <td className="py-2">{outcome.label}</td>
                  <td className="py-2 text-right font-mono">{outcome.cap}</td>
                  <td className="py-2 text-right font-mono">{clampedText.length}</td>
                  <td className="py-2 text-right">
                    {outcome.fits ? "Fits" : `Over by ${outcome.overBy.toLocaleString("en-US")}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Reading times are averages, not guarantees — real speed varies by reader and content.
        Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
