import { describe, expect, it } from "vitest"
import {
  countWords,
  decodeNoteContent,
  isValidNoteSize,
  maximumNoteBytes,
  migrateNote,
  notesSchemaVersion,
  serializeNote,
  type StoredNote,
} from "./notes"

describe("stored note serialization and migration", () => {
  it("round-trips a note through the current schema", () => {
    const saved = serializeNote("hello note", new Date("2026-09-06T12:00:00Z"))
    expect(saved).toEqual({
      schemaVersion: notesSchemaVersion,
      text: "hello note",
      updatedAt: "2026-09-06T12:00:00.000Z",
    })
    const migrated = migrateNote(saved)
    expect(migrated.status).toBe("ok")
    if (migrated.status !== "ok") return
    expect(migrated.note).toEqual(saved)
  })

  it("accepts any stored note shape it could have written", () => {
    const note: StoredNote = {
      schemaVersion: 1,
      text: 'multi\nline\nnote with 😀 and "quotes"',
      updatedAt: new Date().toISOString(),
    }
    expect(migrateNote(note).status).toBe("ok")
  })

  it("refuses payloads written by a newer schema version without touching them", () => {
    const future = { schemaVersion: notesSchemaVersion + 1, text: "future", updatedAt: "x" }
    expect(migrateNote(future)).toEqual({ status: "newer-schema" })
  })

  it("treats corrupt payloads as invalid so the note starts fresh", () => {
    for (const corrupt of [
      null,
      undefined,
      "string",
      42,
      {},
      { schemaVersion: 1 },
      { schemaVersion: 1, text: 7, updatedAt: "2026-09-06T12:00:00Z" },
      { schemaVersion: 1, text: "x", updatedAt: "not a date" },
      { schemaVersion: 0, text: "x", updatedAt: "2026-09-06T12:00:00Z" },
      { schemaVersion: 1.5, text: "x", updatedAt: "2026-09-06T12:00:00Z" },
      { schemaVersion: "1", text: "x", updatedAt: "2026-09-06T12:00:00Z" },
    ]) {
      expect(migrateNote(corrupt)).toEqual({ status: "invalid" })
    }
  })

  it("bounds note size by UTF-8 bytes", () => {
    expect(maximumNoteBytes).toBe(256 * 1024)
    expect(isValidNoteSize("a".repeat(maximumNoteBytes))).toBe(true)
    expect(isValidNoteSize("a".repeat(maximumNoteBytes + 1))).toBe(false)
    expect(isValidNoteSize("😀".repeat(maximumNoteBytes / 4 + 1))).toBe(false)
  })
})

describe("note import decoding", () => {
  it("decodes base64 content reads back into text", () => {
    const encoder = new TextEncoder()
    const encoded = btoa(String.fromCharCode(...encoder.encode("héllo 😀 note")))
    expect(decodeNoteContent(encoded)).toBe("héllo 😀 note")
  })

  it("replaces invalid UTF-8 instead of throwing", () => {
    // 0xFF is not valid UTF-8; the decoder must replace it, never crash the import.
    const hostile = btoa(String.fromCharCode(0xff, 0x41, 0xfe))
    expect(decodeNoteContent(hostile)).toContain("A")
  })
})

describe("word counting", () => {
  it("counts words and handles whitespace-only input", () => {
    expect(countWords("")).toBe(0)
    expect(countWords("   \n\t  ")).toBe(0)
    expect(countWords("one")).toBe(1)
    expect(countWords("  two   words  ")).toBe(2)
    expect(countWords("line one\nline two")).toBe(4)
  })
})
