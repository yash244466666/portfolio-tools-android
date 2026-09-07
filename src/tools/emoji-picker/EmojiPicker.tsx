import { useMemo, useState } from "react"
import { Field } from "@/components/ui/Field"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { emojiCategories, filterEmojiCategories } from "./emoji-data"

export default function EmojiPicker() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [status, setStatus] = useState("")
  const { clipboard, haptics } = usePlatform()

  const categories = useMemo(
    () => filterEmojiCategories(search, activeCategory),
    [search, activeCategory],
  )

  async function copy(emoji: string, name: string) {
    try {
      await clipboard.writeText(emoji)
      setStatus(`Copied ${name} to the clipboard.`)
      await haptics.confirm()
    } catch (error) {
      setStatus(toSafeErrorMessage(error))
    }
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Find an emoji">
        <Field
          hint="Match names or paste an emoji to look it up."
          htmlFor="emoji-picker-search"
          label="Search"
        >
          <input
            autoComplete="off"
            className="app-input"
            id="emoji-picker-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="thumbs up"
            type="search"
            value={search}
          />
        </Field>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <button
            aria-pressed={activeCategory === null}
            className="min-h-12 rounded-2xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] aria-pressed:bg-[var(--primary)] aria-pressed:text-[var(--on-primary)]"
            onClick={() => setActiveCategory(null)}
            type="button"
          >
            All
          </button>
          {emojiCategories.map((category) => (
            <button
              key={category.name}
              aria-pressed={activeCategory === category.name}
              className="min-h-12 rounded-2xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] aria-pressed:bg-[var(--primary)] aria-pressed:text-[var(--on-primary)]"
              onClick={() => setActiveCategory(category.name)}
              type="button"
            >
              {category.name}
            </button>
          ))}
        </div>
      </ToolPanel>

      {categories.length > 0 ? (
        categories.map((category) => (
          <ToolPanel key={category.name} title={category.name}>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {category.emojis.map((entry) => (
                <button
                  key={entry.name}
                  aria-label={`Copy ${entry.name}`}
                  className="flex h-14 items-center justify-center rounded-2xl border border-[var(--border)] text-2xl hover:bg-[var(--surface-hover)]"
                  onClick={() => void copy(entry.emoji, entry.name)}
                  type="button"
                >
                  <span aria-hidden="true">{entry.emoji}</span>
                </button>
              ))}
            </div>
          </ToolPanel>
        ))
      ) : (
        <p className="text-sm text-[var(--text-secondary)]" role="status">
          No emojis match "{search}". Try a shorter word.
        </p>
      )}

      <p aria-label="Copy status" aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Copying writes the emoji to the system clipboard. Rendering depends on the device emoji
        font, so some entries may show as boxes on older Android versions. The catalog is bundled
        and static; nothing is saved or uploaded.
      </p>
    </div>
  )
}
