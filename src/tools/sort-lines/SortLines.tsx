import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { getSortOption, maximumSortChars, sortLines, type SortMode } from "./sort"

export default function SortLines() {
  const [text, setText] = useState("")
  const [mode, setMode] = useState<SortMode>("az")
  const [removeBlank, setRemoveBlank] = useState(false)
  const [removeDuplicates, setRemoveDuplicates] = useState(false)
  const overLimit = text.length > maximumSortChars
  const limitLabel = maximumSortChars.toLocaleString("en-US")

  const activeOption = getSortOption(mode)
  const result = useMemo(
    () => (overLimit ? null : sortLines(text, mode, { removeBlank, removeDuplicates })),
    [text, mode, removeBlank, removeDuplicates, overLimit],
  )

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${limitLabel} character limit. Shorten it to sort.`
              : undefined
          }
          hint={`Sorting updates as you type, up to ${limitLabel} characters.`}
          htmlFor="sort-lines-input"
          label="Lines"
        >
          <textarea
            aria-describedby={overLimit ? "sort-lines-input-error" : "sort-lines-input-hint"}
            className="app-input min-h-32 resize-y font-mono"
            id="sort-lines-input"
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste lines here, one per line…"
            value={text}
          />
        </Field>
        <fieldset className="mt-4 grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Sort order</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["az", "za", "numeric", "reverse", "shuffle"] as SortMode[]).map((id) => (
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
                  name="sort-lines-mode"
                  onChange={() => setMode(id)}
                  type="radio"
                  value={id}
                />
                <span className="text-sm font-medium">{getSortOption(id).label}</span>
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
              checked={removeBlank}
              className="accent-[var(--primary)]"
              onChange={(event) => setRemoveBlank(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium">Remove blank or whitespace-only lines</span>
          </label>
          <label className="flex min-h-12 items-center gap-3">
            <input
              checked={removeDuplicates}
              className="accent-[var(--primary)]"
              onChange={(event) => setRemoveDuplicates(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium">Remove duplicate lines</span>
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
          <p role="alert">The text exceeds the {limitLabel} character limit. Shorten it to sort.</p>
        ) : text.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter lines above to sort them. Blank-line and duplicate removal run before sorting.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              {result?.total.toLocaleString("en-US")} lines in;{" "}
              {(result?.removed ?? 0).toLocaleString("en-US")} removed.
            </p>
            <p className="whitespace-pre-wrap break-all font-mono text-sm">
              {result?.output === "" ? "—" : result?.output}
            </p>
          </>
        )}
      </ToolPanel>
      <p className="text-sm text-[var(--text-secondary)]">
        Sorting happens on this device only. Shuffle reorders lines randomly and is not
        reproducible.
      </p>
    </div>
  )
}
