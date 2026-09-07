/**
 * Pure scratchpad storage model for the Notes tool.
 *
 * This is the repository's first durable tool data, so the stored shape is versioned and
 * every load goes through an explicit migration gate: corrupt payloads start fresh, and
 * payloads written by a newer schema version are refused (and preserved) rather than
 * silently overwritten. The data is plain text in the app-private preference store — it
 * is never encrypted, and the UI must say so.
 */

/** Key inside the `yash-tools:v1:` preference namespace; `preferences.clear()` removes it. */
export const notesStorageKey = "notes:scratchpad"

/** Current stored-note schema version. */
export const notesSchemaVersion = 1

/** Note content bound, matching the other large-text tools. */
export const maximumNoteBytes = 256 * 1024

export const noteFileName = "scratchpad.txt"
export const noteMimeType = "text/plain"

export interface StoredNote {
  schemaVersion: typeof notesSchemaVersion
  text: string
  /** ISO 8601 timestamp of the last successful save. */
  updatedAt: string
}

export type NoteMigrationResult =
  | { status: "ok"; note: StoredNote }
  /** Written by a newer schema version; keep it stored, refuse to open or overwrite it. */
  | { status: "newer-schema" }
  /** Not a valid stored note; start fresh. */
  | { status: "invalid" }

export function isValidNoteSize(text: string): boolean {
  return new TextEncoder().encode(text).byteLength <= maximumNoteBytes
}

export function serializeNote(text: string, updatedAt: Date): StoredNote {
  return { schemaVersion: notesSchemaVersion, text, updatedAt: updatedAt.toISOString() }
}

/**
 * Validates and migrates a stored note. Version 1 is the only current schema, so any
 * higher version is reported as `newer-schema` instead of being coerced or dropped.
 */
export function migrateNote(raw: unknown): NoteMigrationResult {
  if (typeof raw !== "object" || raw === null) return { status: "invalid" }
  const record = raw as Record<string, unknown>
  if (record.schemaVersion === undefined) return { status: "invalid" }
  if (typeof record.schemaVersion !== "number" || !Number.isInteger(record.schemaVersion)) {
    return { status: "invalid" }
  }
  if (record.schemaVersion > notesSchemaVersion) return { status: "newer-schema" }
  if (record.schemaVersion < notesSchemaVersion) {
    // No older schema ever shipped; anything below 1 is corrupt.
    return { status: "invalid" }
  }
  if (typeof record.text !== "string" || typeof record.updatedAt !== "string") {
    return { status: "invalid" }
  }
  if (Number.isNaN(Date.parse(record.updatedAt))) return { status: "invalid" }
  return {
    status: "ok",
    note: { schemaVersion: notesSchemaVersion, text: record.text, updatedAt: record.updatedAt },
  }
}

/** Decodes a bounded base64 content read back into text. */
export function decodeNoteContent(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  // Invalid UTF-8 is replaced, never thrown, so a hostile file cannot crash the import.
  return new TextDecoder().decode(bytes)
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0
}
