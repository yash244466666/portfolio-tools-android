/**
 * Pure bookmark storage model for the Bookmark Manager.
 *
 * This is durable tool data like the scratchpad, so the stored shape is versioned and
 * every load goes through an explicit migration gate: corrupt payloads start fresh, and
 * payloads written by a newer schema version are refused (and preserved) rather than
 * silently overwritten. The data is plain JSON in the app-private preference store —
 * it is never encrypted, and the UI must say so.
 *
 * Upstream (`components/tools/text/bookmark-manager.tsx`) normalized URLs by
 * prefixing any non-http string with `https://` and rendered the result as a
 * clickable anchor. Here every saved URL must resolve to an https URL, and
 * opening one goes through the platform external-browser service.
 */

/** Key inside the `yash-tools:v1:` preference namespace; `preferences.clear()` removes it. */
export const bookmarksStorageKey = "bookmarks:manager"

/** Current stored-bookmarks schema version. */
export const bookmarksSchemaVersion = 1

export const maximumBookmarks = 500
export const maximumTagLength = 24
export const maximumTagsPerBookmark = 10
export const maximumTitleLength = 200
export const maximumImportBytes = 1024 * 1024

export const bookmarksMimeType = "application/json"
export const bookmarksFileName = "bookmarks.json"

export interface Bookmark {
  id: string
  title: string
  url: string
  tags: string[]
  /** ISO 8601 timestamp. */
  createdAt: string
}

export interface StoredBookmarks {
  schemaVersion: typeof bookmarksSchemaVersion
  bookmarks: Bookmark[]
}

export type BookmarksMigrationResult =
  | { status: "ok"; bookmarks: Bookmark[] }
  /** Written by a newer schema version; keep it stored, refuse to open or overwrite it. */
  | { status: "newer-schema" }
  /** Not valid stored data; start fresh. */
  | { status: "invalid" }

export type UrlNormalization = { status: "ok"; url: string } | { status: "error"; message: string }

/**
 * Normalizes a user-typed URL to an https URL. A missing scheme gains
 * `https://`; explicit `http:` is rejected so a saved bookmark can always be
 * opened by the https-only external-browser service.
 */
export function normalizeBookmarkUrl(raw: string): UrlNormalization {
  const trimmed = raw.trim()
  if (trimmed === "") return { status: "error", message: "Enter a URL." }
  // An explicit scheme other than https is never salvaged by prefixing.
  if (!/^https:\/\//i.test(trimmed) && /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return { status: "error", message: "Only https links can be saved." }
  }
  const candidate = /^https:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== "https:") {
      return { status: "error", message: "Only https links can be saved." }
    }
    if (parsed.username !== "" || parsed.password !== "") {
      return { status: "error", message: "Remove the embedded credentials from the URL." }
    }
    return { status: "ok", url: parsed.toString() }
  } catch {
    return { status: "error", message: "Enter a valid URL, like example.com/page." }
  }
}

/** Splits a comma-separated tag input into clean lowercase tags. */
export function parseTags(raw: string): string[] {
  const tags = raw
    .split(",")
    .map((tag) => tag.trim().toLowerCase().slice(0, maximumTagLength))
    .filter((tag) => tag !== "")
  return [...new Set(tags)].slice(0, maximumTagsPerBookmark)
}

export function serializeBookmarks(bookmarks: Bookmark[]): StoredBookmarks {
  return { schemaVersion: bookmarksSchemaVersion, bookmarks }
}

function isValidBookmark(raw: unknown): raw is Bookmark {
  if (typeof raw !== "object" || raw === null) return false
  const record = raw as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    record.id !== "" &&
    typeof record.title === "string" &&
    record.title.length <= maximumTitleLength &&
    typeof record.url === "string" &&
    /^https:\/\//i.test(record.url) &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === "string") &&
    typeof record.createdAt === "string" &&
    !Number.isNaN(Date.parse(record.createdAt))
  )
}

/**
 * Validates and migrates a stored payload. Version 1 is the only current
 * schema; individual invalid entries are dropped so one corrupt bookmark
 * cannot take the whole collection down.
 */
export function migrateBookmarks(raw: unknown): BookmarksMigrationResult {
  if (typeof raw !== "object" || raw === null) return { status: "invalid" }
  const record = raw as Record<string, unknown>
  if (typeof record.schemaVersion !== "number" || !Number.isInteger(record.schemaVersion)) {
    return { status: "invalid" }
  }
  if (record.schemaVersion > bookmarksSchemaVersion) return { status: "newer-schema" }
  if (record.schemaVersion < bookmarksSchemaVersion) return { status: "invalid" }
  if (!Array.isArray(record.bookmarks)) return { status: "invalid" }
  return {
    status: "ok",
    bookmarks: record.bookmarks.filter(isValidBookmark).slice(0, maximumBookmarks),
  }
}

export interface ImportResult {
  imported: Bookmark[]
  skipped: number
}

/**
 * Parses an imported JSON document. Entries that are not valid https
 * bookmarks are skipped and counted, never silently dropped; the caller
 * assigns fresh IDs and timestamps for entries missing them.
 */
export function parseBookmarksImport(text: string, fallbackId: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { imported: [], skipped: 0 }
  }
  const raw =
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as Record<string, unknown>).bookmarks)
      ? (parsed as Record<string, unknown>).bookmarks
      : parsed
  if (!Array.isArray(raw)) return { imported: [], skipped: 0 }
  const imported: Bookmark[] = []
  let skipped = 0
  for (const entry of raw.slice(0, maximumBookmarks)) {
    if (typeof entry !== "object" || entry === null) {
      skipped += 1
      continue
    }
    const record = entry as Record<string, unknown>
    const title =
      typeof record.title === "string" ? record.title.trim().slice(0, maximumTitleLength) : ""
    const url = typeof record.url === "string" ? record.url.trim() : ""
    if (title === "" || !/^https:\/\//i.test(url)) {
      skipped += 1
      continue
    }
    const tags = Array.isArray(record.tags)
      ? [
          ...new Set(
            record.tags
              .filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "")
              .map((tag) => tag.trim().toLowerCase().slice(0, maximumTagLength)),
          ),
        ].slice(0, maximumTagsPerBookmark)
      : []
    imported.push({
      id:
        typeof record.id === "string" && record.id !== ""
          ? record.id
          : `${fallbackId}-${imported.length}`,
      title,
      url,
      tags,
      createdAt:
        typeof record.createdAt === "string" && !Number.isNaN(Date.parse(record.createdAt))
          ? record.createdAt
          : new Date(0).toISOString(),
    })
  }
  return { imported, skipped }
}

/** Case-insensitive substring filter across title, URL, and tags. */
export function filterBookmarks(bookmarks: Bookmark[], query: string): Bookmark[] {
  const trimmed = query.trim().toLowerCase()
  if (trimmed === "") return bookmarks
  return bookmarks.filter(
    (bookmark) =>
      bookmark.title.toLowerCase().includes(trimmed) ||
      bookmark.url.toLowerCase().includes(trimmed) ||
      bookmark.tags.some((tag) => tag.includes(trimmed)),
  )
}

export function formatBookmarkCount(filtered: number, total: number): string {
  const noun = total === 1 ? "bookmark" : "bookmarks"
  return filtered === total ? `${total} ${noun}` : `${filtered} of ${total} ${noun}`
}

/** Serializes the collection for the JSON export file. */
export function exportBookmarksJson(bookmarks: Bookmark[]): string {
  return JSON.stringify(serializeBookmarks(bookmarks), null, 2)
}
