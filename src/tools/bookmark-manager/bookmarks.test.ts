import { describe, expect, it } from "vitest"
import {
  bookmarksSchemaVersion,
  exportBookmarksJson,
  filterBookmarks,
  formatBookmarkCount,
  migrateBookmarks,
  normalizeBookmarkUrl,
  parseBookmarksImport,
  parseTags,
  serializeBookmarks,
  type Bookmark,
} from "./bookmarks"

const sample: Bookmark = {
  id: "abc",
  title: "Docs",
  url: "https://example.com/page",
  tags: ["reference"],
  createdAt: "2026-01-01T00:00:00.000Z",
}

describe("normalizeBookmarkUrl", () => {
  it("adds the https scheme when missing", () => {
    expect(normalizeBookmarkUrl("example.com/page")).toEqual({
      status: "ok",
      url: "https://example.com/page",
    })
  })

  it("keeps an explicit https URL", () => {
    expect(normalizeBookmarkUrl("https://example.com")).toEqual({
      status: "ok",
      url: "https://example.com/",
    })
  })

  it("rejects cleartext and non-https schemes", () => {
    expect(normalizeBookmarkUrl("http://example.com")?.status).toBe("error")
    expect(normalizeBookmarkUrl("javascript:alert(1)").status).toBe("error")
    expect(normalizeBookmarkUrl("data:text/html,hi").status).toBe("error")
    expect(normalizeBookmarkUrl("ftp://example.com").status).toBe("error")
  })

  it("rejects embedded credentials", () => {
    expect(normalizeBookmarkUrl("https://user:pass@example.com").status).toBe("error")
  })

  it("rejects garbage URLs", () => {
    expect(normalizeBookmarkUrl("").status).toBe("error")
    expect(normalizeBookmarkUrl("https://").status).toBe("error")
  })
})

describe("parseTags", () => {
  it("trims, lowercases, and deduplicates", () => {
    expect(parseTags(" Docs , docs, REFERENCE ")).toEqual(["docs", "reference"])
  })

  it("caps tag count and length", () => {
    const tags = parseTags("a,b,c,d,e,f,g,h,i,j,k,l,m")
    expect(tags).toHaveLength(10)
    expect(parseTags(`${"x".repeat(30)},ok`)[0]).toBe("x".repeat(24))
  })
})

describe("migrateBookmarks", () => {
  it("accepts the current schema and drops invalid entries", () => {
    const result = migrateBookmarks({
      schemaVersion: bookmarksSchemaVersion,
      bookmarks: [sample, { id: "bad" }, "nope"],
    })
    expect(result.status).toBe("ok")
    if (result.status === "ok") expect(result.bookmarks).toEqual([sample])
  })

  it("refuses newer schema versions", () => {
    expect(
      migrateBookmarks({ schemaVersion: bookmarksSchemaVersion + 1, bookmarks: [] }).status,
    ).toBe("newer-schema")
  })

  it("rejects corrupt payloads", () => {
    expect(migrateBookmarks(null).status).toBe("invalid")
    expect(migrateBookmarks([sample]).status).toBe("invalid")
    expect(migrateBookmarks({ schemaVersion: 1 }).status).toBe("invalid")
  })
})

describe("parseBookmarksImport", () => {
  it("imports valid https entries and skips the rest", () => {
    const result = parseBookmarksImport(
      JSON.stringify({
        bookmarks: [
          sample,
          { title: "No url" },
          { url: "http://insecure.example" },
          { title: "Raw", url: "https://raw.example", tags: ["a", "a", 5] },
        ],
      }),
      "fresh",
    )
    expect(result.imported).toHaveLength(2)
    expect(result.skipped).toBe(2)
    expect(result.imported[1]?.id).toBe("fresh-1")
    expect(result.imported[1]?.tags).toEqual(["a"])
  })

  it("returns zero counts for unparseable documents", () => {
    expect(parseBookmarksImport("not json", "x")).toEqual({ imported: [], skipped: 0 })
    expect(parseBookmarksImport("42", "x")).toEqual({ imported: [], skipped: 0 })
  })
})

describe("filterBookmarks", () => {
  const bookmarks = [
    sample,
    { ...sample, id: "b", title: "Inbox", url: "https://mail.example.com", tags: ["daily"] },
  ]

  it("matches title, URL, and tags case-insensitively", () => {
    expect(filterBookmarks(bookmarks, "inbox")).toHaveLength(1)
    expect(filterBookmarks(bookmarks, "MAIL")).toHaveLength(1)
    expect(filterBookmarks(bookmarks, "ref")).toHaveLength(1)
    expect(filterBookmarks(bookmarks, "  ")).toHaveLength(2)
  })
})

describe("export", () => {
  it("round-trips through migrate", () => {
    const exported = exportBookmarksJson([sample])
    const result = migrateBookmarks(JSON.parse(exported))
    expect(result.status).toBe("ok")
    if (result.status === "ok") expect(result.bookmarks).toEqual([sample])
  })
})

describe("formatBookmarkCount", () => {
  it("describes filtered and total counts", () => {
    expect(formatBookmarkCount(5, 5)).toBe("5 bookmarks")
    expect(formatBookmarkCount(2, 5)).toBe("2 of 5 bookmarks")
    expect(formatBookmarkCount(1, 1)).toBe("1 bookmark")
  })
})

describe("serializeBookmarks", () => {
  it("stamps the current schema version", () => {
    expect(serializeBookmarks([sample])).toEqual({
      schemaVersion: bookmarksSchemaVersion,
      bookmarks: [sample],
    })
  })
})
