import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import {
  bookmarksFileName,
  bookmarksMimeType,
  bookmarksSchemaVersion,
  bookmarksStorageKey,
  exportBookmarksJson,
  filterBookmarks,
  formatBookmarkCount,
  maximumBookmarks,
  maximumImportBytes,
  maximumTagLength,
  maximumTitleLength,
  migrateBookmarks,
  normalizeBookmarkUrl,
  parseBookmarksImport,
  parseTags,
  serializeBookmarks,
  type Bookmark,
} from "./bookmarks"

export default function BookmarkManager() {
  const { preferences, files, browser, random } = usePlatform()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loaded, setLoaded] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [tags, setTags] = useState("")
  const [search, setSearch] = useState("")
  const [formError, setFormError] = useState("")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void preferences
      .get<unknown>(bookmarksStorageKey)
      .then((raw) => {
        const result = migrateBookmarks(raw)
        if (result.status === "ok") {
          setBookmarks(result.bookmarks)
        } else if (result.status === "newer-schema") {
          setBlocked(true)
          setStatus("Stored bookmarks were written by a newer app version and are kept untouched.")
        }
        setLoaded(true)
      })
      .catch(() => {
        setBlocked(true)
        setStatus("Saved bookmarks could not be read on this device.")
        setLoaded(true)
      })
  }, [preferences])

  const persist = useCallback(
    (updated: Bookmark[]) => {
      void preferences
        .set(bookmarksStorageKey, serializeBookmarks(updated))
        .then(() => setBookmarks(updated))
        .catch((saveError) => setStatus(toSafeErrorMessage(saveError)))
    },
    [preferences],
  )

  function handleAdd() {
    if (blocked) return
    const normalized = normalizeBookmarkUrl(url)
    if (normalized.status === "error") {
      setFormError(normalized.message)
      return
    }
    const trimmedTitle = title.trim()
    if (trimmedTitle === "") {
      setFormError("Enter a title.")
      return
    }
    if (bookmarks.length >= maximumBookmarks) {
      setFormError(`At most ${maximumBookmarks} bookmarks can be stored.`)
      return
    }
    const bookmark: Bookmark = {
      id: random.uuid(),
      title: trimmedTitle.slice(0, maximumTitleLength),
      url: normalized.url,
      tags: parseTags(tags),
      createdAt: new Date().toISOString(),
    }
    setFormError("")
    setTitle("")
    setUrl("")
    setTags("")
    persist([bookmark, ...bookmarks])
    setStatus(`Saved ${bookmark.title}.`)
  }

  function handleDelete(id: string) {
    if (blocked) return
    persist(bookmarks.filter((bookmark) => bookmark.id !== id))
    setStatus("Bookmark removed.")
  }

  function handleClearAll() {
    if (blocked || bookmarks.length === 0) return
    const confirmed = window.confirm(
      `Remove all ${bookmarks.length} bookmark${bookmarks.length === 1 ? "" : "s"}? This cannot be undone.`,
    )
    if (!confirmed) return
    void preferences.remove(bookmarksStorageKey).then(() => {
      setBookmarks([])
      setStatus("All bookmarks removed.")
    })
  }

  async function handleExport() {
    if (busy) return
    setBusy(true)
    setFormError("")
    try {
      await files.saveAs({
        name: bookmarksFileName,
        mimeType: bookmarksMimeType,
        data: exportBookmarksJson(bookmarks),
        encoding: "utf8",
      })
      setStatus(`Exported ${bookmarks.length} bookmark${bookmarks.length === 1 ? "" : "s"}.`)
    } catch (exportError) {
      setStatus(toSafeErrorMessage(exportError))
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    if (busy) return
    setBusy(true)
    setFormError("")
    try {
      const [picked] = await files.pick({
        accept: [bookmarksMimeType],
        maximumBytes: maximumImportBytes,
      })
      if (!picked) {
        setStatus("Import cancelled.")
        return
      }
      const content = await files.readContent(picked, { maximumBytes: maximumImportBytes })
      const binary = atob(content.data)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index)
      }
      const text = new TextDecoder().decode(bytes)
      const result = parseBookmarksImport(text, random.uuid())
      if (result.imported.length === 0) {
        setStatus("No valid https bookmarks were found in that file.")
        return
      }
      const merged = [...result.imported, ...bookmarks].slice(0, maximumBookmarks)
      persist(merged)
      setStatus(
        `Imported ${result.imported.length} bookmark${result.imported.length === 1 ? "" : "s"}` +
          (result.skipped > 0
            ? `; ${result.skipped} entr${result.skipped === 1 ? "y" : "ie"}${result.skipped === 1 ? "" : "s"} skipped.`
            : "."),
      )
    } catch (importError) {
      setStatus(toSafeErrorMessage(importError))
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen(bookmark: Bookmark) {
    try {
      await browser.open(new URL(bookmark.url))
    } catch (openError) {
      setStatus(toSafeErrorMessage(openError))
    }
  }

  const filtered = filterBookmarks(bookmarks, search)

  if (blocked) {
    return (
      <ToolPanel title="Bookmarks">
        <p className="text-sm text-[var(--text-secondary)]">{status}</p>
      </ToolPanel>
    )
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Add bookmark">
        <div className="grid gap-3">
          <Field htmlFor="bookmark-title" label="Title">
            <input
              className="app-input"
              id="bookmark-title"
              maxLength={maximumTitleLength}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Project documentation"
              value={title}
            />
          </Field>
          <Field
            hint="Only https links can be saved and opened."
            htmlFor="bookmark-url"
            label="URL"
          >
            <input
              className="app-input"
              id="bookmark-url"
              inputMode="url"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/page"
              value={url}
            />
          </Field>
          <Field
            hint={`Comma-separated; at most 10 tags of ${maximumTagLength} characters each.`}
            htmlFor="bookmark-tags"
            label="Tags"
          >
            <input
              className="app-input"
              id="bookmark-tags"
              onChange={(event) => setTags(event.target.value)}
              placeholder="docs, reference"
              value={tags}
            />
          </Field>
          <Button
            disabled={blocked || title.trim() === "" || url.trim() === ""}
            onClick={handleAdd}
          >
            Add bookmark
          </Button>
          {formError ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel title="Saved bookmarks">
        <div className="grid gap-3">
          <Field htmlFor="bookmark-search" label="Search">
            <input
              className="app-input"
              id="bookmark-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, URL, or tag"
              value={search}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button disabled={busy || bookmarks.length === 0} onClick={() => void handleExport()}>
              Export JSON
            </Button>
            <Button disabled={busy} onClick={() => void handleImport()} variant="secondary">
              Import JSON
            </Button>
            <Button disabled={bookmarks.length === 0} onClick={handleClearAll} variant="quiet">
              Remove all
            </Button>
          </div>
          {status ? (
            <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
          {loaded && bookmarks.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
              No bookmarks yet. Add one above.
            </p>
          ) : null}
          {loaded && bookmarks.length > 0 && filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
              No bookmarks match the search.
            </p>
          ) : null}
          <ul className="grid gap-2" role="list">
            {filtered.map((bookmark) => (
              <li className="rounded-2xl border border-[var(--border)] p-3" key={bookmark.id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">
                    {bookmark.title}
                  </h3>
                  <Button
                    aria-label={`Delete ${bookmark.title}`}
                    onClick={() => handleDelete(bookmark.id)}
                    variant="quiet"
                  >
                    Delete
                  </Button>
                </div>
                <button
                  aria-label={`Open ${bookmark.title} in the browser`}
                  className="mt-1 block w-full truncate py-3 text-left text-xs leading-6 text-[var(--primary)] underline"
                  onClick={() => void handleOpen(bookmark)}
                  type="button"
                >
                  {bookmark.url}
                </button>
                {bookmark.tags.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1" role="list">
                    {bookmark.tags.map((tag) => (
                      <li
                        className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                        key={tag}
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          {bookmarks.length > 0 ? (
            <p className="text-center text-xs text-[var(--text-secondary)]">
              {formatBookmarkCount(filtered.length, bookmarks.length)} · schema v
              {bookmarksSchemaVersion}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Bookmarks are stored on this device in the app-private preference store as plain JSON — they
        are not encrypted. Nothing is uploaded; opening a link leaves the app through the system
        browser and only https links can be saved.
      </p>
    </div>
  )
}
