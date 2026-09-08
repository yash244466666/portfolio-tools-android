import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  analyzeWordFrequency,
  clampInput,
  maximumInputCharacters,
  topNOptions,
  type TopNCount,
} from "./word-frequency"

export default function WordFrequencyAnalyzer() {
  const [text, setText] = useState("")
  const [topN, setTopN] = useState<TopNCount>(10)
  const [caseFold, setCaseFold] = useState(true)
  const [removeStopwords, setRemoveStopwords] = useState(true)

  // The over-cap flag compares the raw pasted length before the clamped
  // state lands, so the disclosure survives the trim.
  const [overCap, setOverCap] = useState(false)

  const result = useMemo(
    () => analyzeWordFrequency(text, { topN, caseFold, removeStopwords }),
    [text, topN, caseFold, removeStopwords],
  )

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overCap
              ? `The text is capped at the first ${maximumInputCharacters.toLocaleString("en-US")} characters.`
              : undefined
          }
          hint="Nothing leaves this device; analysis runs as you type."
          htmlFor="word-frequency-input"
          label="Text to analyze"
        >
          <textarea
            className="app-input min-h-40"
            id="word-frequency-input"
            onChange={(event) => {
              const raw = event.target.value
              setOverCap(raw.length > maximumInputCharacters)
              setText(clampInput(raw))
            }}
            placeholder="Paste the text to analyze…"
            value={text}
          />
        </Field>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {text.length.toLocaleString("en-US")} / {maximumInputCharacters.toLocaleString("en-US")}{" "}
          characters
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <label
              className="text-sm font-semibold text-[var(--text)]"
              htmlFor="word-frequency-topn"
            >
              Top N words
            </label>
            <select
              className="app-input"
              id="word-frequency-topn"
              onChange={(event) => setTopN(Number(event.target.value) as TopNCount)}
              value={topN}
            >
              {topNOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={caseFold}
              id="word-frequency-casefold"
              onChange={(event) => setCaseFold(event.target.checked)}
              type="checkbox"
            />
            Ignore capitalization
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={removeStopwords}
              id="word-frequency-stopwords"
              onChange={(event) => setRemoveStopwords(event.target.checked)}
              type="checkbox"
            />
            Skip common English words
          </label>
        </div>
        <div className="mt-4">
          <Button onClick={() => setText("")} variant="quiet">
            Clear text
          </Button>
        </div>
      </ToolPanel>

      <ToolPanel title="Frequency table">
        <p aria-live="polite" className="text-sm" role="status">
          {result.tokenCount > 0
            ? `${result.tokenCount.toLocaleString("en-US")} words (${result.uniqueWordCount.toLocaleString("en-US")} unique)${removeStopwords && result.stopwordsRemoved > 0 ? ` after skipping ${result.stopwordsRemoved.toLocaleString("en-US")} common English words` : ""}. Showing the top ${Math.min(topN, result.uniqueWordCount)}.`
            : "Enter text to see the most frequent words."}
        </p>
        {result.entries.length > 0 ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">
              Most frequent words with occurrence counts and share of all words
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <th scope="col" className="py-2">
                  Word
                </th>
                <th scope="col" className="py-2 text-right">
                  Count
                </th>
                <th scope="col" className="py-2 text-right">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {result.entries.map((entry) => (
                <tr className="border-t border-[var(--border)]" key={entry.word}>
                  <td className="py-2">{entry.word}</td>
                  <td className="py-2 text-right font-mono">{entry.count}</td>
                  <td className="py-2 text-right font-mono">{entry.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Words tokenize on Unicode letter and number runs, so accented and non-Latin scripts count
        correctly. The skip list is a small embedded English stopword set. Everything runs on this
        device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
