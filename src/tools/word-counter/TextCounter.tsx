import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  computeTextStats,
  maximumCounterChars,
  readingWordsPerMinute,
  type TextStats,
} from "./text-stats"

interface StatCard {
  label: string
  value: string
}

function buildCards(stats: TextStats | null, emphasizeCharacters: boolean): StatCard[] {
  const value = (stat: number | string): string => (stats ? String(stat) : "—")
  const shared: StatCard[] = [
    { label: "Words", value: value(stats?.words ?? 0) },
    { label: "Characters", value: value(stats?.characters ?? 0) },
    { label: "Without spaces", value: value(stats?.charactersWithoutSpaces ?? 0) },
    { label: "Sentences", value: value(stats?.sentences ?? 0) },
    { label: "Paragraphs", value: value(stats?.paragraphs ?? 0) },
    { label: "Reading time", value: value(stats?.readingTimeLabel ?? "0 min") },
  ]
  if (!emphasizeCharacters) return shared
  // The Character Counter leads with the character cards.
  return [shared[1] as StatCard, shared[2] as StatCard, shared[0] as StatCard, ...shared.slice(3)]
}

export default function TextCounter({ emphasizeCharacters }: { emphasizeCharacters: boolean }) {
  const [text, setText] = useState("")
  // UTF-16 length is a cheap conservative pre-filter; code points are only
  // recounted when it trips, so ordinary typing never spreads a large array.
  const possiblyOverLimit = text.length > maximumCounterChars
  const overLimit = possiblyOverLimit && [...text].length > maximumCounterChars
  // Counting is bounded work by construction: the input is rejected above the limit.
  const stats = useMemo(() => (overLimit ? null : computeTextStats(text)), [text, overLimit])
  const cards = buildCards(stats, emphasizeCharacters)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Counters">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-center"
              key={card.label}
            >
              <p className="text-xl font-semibold">{card.value}</p>
              <p className="text-xs text-[var(--text-secondary)]">{card.label}</p>
            </div>
          ))}
        </div>
        {overLimit ? (
          <p className="mt-3" role="alert">
            The text exceeds the {maximumCounterChars.toLocaleString("en-US")} character limit.
            Shorten it to count.
          </p>
        ) : null}
      </ToolPanel>

      <ToolPanel
        action={
          text && !overLimit ? (
            <CopyButton label="Copy text" onStatus={() => undefined} value={text} />
          ) : undefined
        }
        title="Text"
      >
        <Field
          error={
            overLimit
              ? `The text exceeds the ${maximumCounterChars.toLocaleString("en-US")} character limit. Shorten it to count.`
              : undefined
          }
          hint={`Counts update as you type, up to ${maximumCounterChars.toLocaleString("en-US")} characters.`}
          htmlFor="counter-text"
          label="Text"
        >
          <textarea
            aria-describedby={overLimit ? "counter-text-error" : "counter-text-hint"}
            className="app-input min-h-64 resize-y"
            id="counter-text"
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste text to count…"
            value={text}
          />
        </Field>
        <p className="text-sm text-[var(--text-secondary)]">
          Reading time assumes {readingWordsPerMinute} words per minute; sentence and paragraph
          counts are heuristics based on punctuation and blank lines.
        </p>
      </ToolPanel>
    </div>
  )
}
