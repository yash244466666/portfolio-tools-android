import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { convertRoman, romanInputError, type RomanDirection } from "./roman"

interface HistoryEntry {
  arabic: number
  roman: string
  direction: string
}

const directionOptions: readonly { id: RomanDirection; label: string }[] = [
  { id: "to-roman", label: "Arabic to Roman" },
  { id: "to-arabic", label: "Roman to Arabic" },
]

export default function RomanNumeralConverter() {
  const [direction, setDirection] = useState<RomanDirection>("to-roman")
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const conversion = useMemo(() => convertRoman(input, direction), [input, direction])
  const error = useMemo(() => romanInputError(input, direction), [input, direction])

  function saveToHistory() {
    if (!conversion) return
    setHistory((entries) =>
      [
        { arabic: conversion.arabic, roman: conversion.roman, direction: conversion.direction },
        ...entries,
      ].slice(0, 20),
    )
  }

  const isRomanDirection = direction === "to-arabic"

  return (
    <div className="grid gap-4">
      <ToolPanel title="Conversion">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Direction</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {directionOptions.map((option) => (
              <label
                className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 ${
                  direction === option.id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={option.id}
              >
                <input
                  checked={direction === option.id}
                  className="accent-[var(--primary)]"
                  name="roman-direction"
                  onChange={() => setDirection(option.id)}
                  type="radio"
                  value={option.id}
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4">
          <Field
            error={error ?? undefined}
            hint="Conversions are session-only; nothing is stored after leaving the tool."
            htmlFor="roman-input"
            label={isRomanDirection ? "Roman numeral" : "Arabic number (1–3999)"}
          >
            <input
              aria-describedby={error ? "roman-input-error" : "roman-input-hint"}
              className="app-input font-mono text-lg"
              id="roman-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder={isRomanDirection ? "e.g. XLII" : "e.g. 42"}
              value={input}
            />
          </Field>
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          conversion !== null ? (
            <Button onClick={saveToHistory} type="button" variant="quiet">
              Save to history
            </Button>
          ) : undefined
        }
        title="Result"
      >
        {conversion === null ? (
          error !== null ? (
            <p role="alert">{error}</p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Enter a value above to convert it. Standard Roman notation covers 1–3999 without
              vinculum (overline) notation.
            </p>
          )
        ) : (
          <>
            <p className="text-xs text-[var(--text-secondary)]">{conversion.direction}</p>
            <p
              className="font-mono text-3xl font-bold tracking-wider text-[var(--text)]"
              aria-live="polite"
            >
              {isRomanDirection ? conversion.arabic : conversion.roman}
            </p>
          </>
        )}
      </ToolPanel>

      {history.length > 0 ? (
        <ToolPanel
          action={
            <Button onClick={() => setHistory([])} type="button" variant="quiet">
              Clear history
            </Button>
          }
          title="History"
        >
          <ul className="grid gap-1">
            {history.map((entry, index) => (
              <li
                className="flex items-center gap-3 py-1 text-sm"
                key={`${entry.arabic}-${entry.roman}-${index}`}
              >
                <span className="font-mono text-[var(--text)]">{entry.arabic}</span>
                <span aria-hidden="true" className="text-[var(--text-secondary)]">
                  =
                </span>
                <span className="font-mono text-[var(--text)]">{entry.roman}</span>
                <span className="ml-auto text-xs text-[var(--text-secondary)]">
                  {entry.direction}
                </span>
              </li>
            ))}
          </ul>
        </ToolPanel>
      ) : null}

      <p className="text-sm text-[var(--text-secondary)]">
        Conversions happen on this device only. History lives in this session and clears when the
        app closes; nothing is stored after leaving the tool.
      </p>
    </div>
  )
}
