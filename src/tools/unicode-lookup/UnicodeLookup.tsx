import { useState } from "react"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { Check, Copy } from "lucide-react"
import { filterUnicodeEntries, maximumUnicodeQueryChars, unicodeCategories } from "./unicode-lookup"

export default function UnicodeLookup() {
  const { clipboard, haptics } = usePlatform()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [copiedCodePoint, setCopiedCodePoint] = useState<string | null>(null)
  const [status, setStatus] = useState("")

  const overLimit = search.length > maximumUnicodeQueryChars
  const query = overLimit ? "" : search
  const filtered = filterUnicodeEntries(query, category)

  async function copyCharacter(codePoint: string, char: string) {
    try {
      await clipboard.writeText(char)
      setCopiedCodePoint(codePoint)
      setStatus("Copied to clipboard.")
      await haptics.confirm()
    } catch (error) {
      setStatus(toSafeErrorMessage(error))
    }
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Search">
        <Field
          error={
            overLimit
              ? `The query exceeds the ${maximumUnicodeQueryChars} character limit.`
              : undefined
          }
          hint="Match an exact character, a name such as “infinity”, or a code point such as U+221E."
          htmlFor="unicode-search"
          label="Search characters"
        >
          <input
            className="app-input font-mono"
            id="unicode-search"
            maxLength={maximumUnicodeQueryChars}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="e.g. U+221E, infinity, α"
            type="search"
            value={search}
          />
        </Field>
        <fieldset className="mt-4 grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Category</legend>
          <div className="flex flex-wrap gap-2">
            {(["all", ...unicodeCategories] as string[]).map((id) => (
              <label
                className={`flex min-h-12 items-center rounded-2xl border px-4 py-2 ${
                  category === id
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={id}
              >
                <input
                  checked={category === id}
                  className="sr-only"
                  name="unicode-category"
                  onChange={() => setCategory(id)}
                  type="radio"
                  value={id}
                />
                <span className="text-sm font-medium">{id === "all" ? "All" : id}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </ToolPanel>

      <ToolPanel title={`Characters (${filtered.length})`}>
        {overLimit ? null : filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No characters match this search. Clear the query or pick another category.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {filtered.map((entry) => (
              <button
                aria-label={`Copy ${entry.name} (${entry.codePoint})`}
                className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-[var(--text)]"
                key={entry.codePoint}
                onClick={() => void copyCharacter(entry.codePoint, entry.char)}
                type="button"
              >
                <span aria-hidden="true" className="text-2xl leading-7">
                  {entry.char}
                </span>
                <span
                  aria-hidden="true"
                  className="font-mono text-[10px] text-[var(--text-secondary)]"
                >
                  {copiedCodePoint === entry.codePoint ? "Copied" : entry.codePoint}
                </span>
                {copiedCodePoint === entry.codePoint ? (
                  <Check aria-hidden="true" size={14} />
                ) : (
                  <Copy aria-hidden="true" size={14} />
                )}
              </button>
            ))}
          </div>
        )}
      </ToolPanel>

      <p className="text-sm text-[var(--text-secondary)]">
        The character set is bundled on this device and works offline. It is a curated reference
        selection, not the full Unicode database. Copying places the character itself on the
        clipboard.
      </p>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
