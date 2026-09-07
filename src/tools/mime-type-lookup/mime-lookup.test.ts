import { describe, expect, it } from "vitest"
import { allMimeTypes } from "./mime-types"
import { filterMimeTypes, getMimeTab } from "./mime-lookup"

describe("MIME dataset integrity", () => {
  it("contains at least the audited entry count with unique extension/type pairs", () => {
    expect(allMimeTypes.length).toBe(90)
    const pairs = allMimeTypes.map((entry) => `${entry.mimeType}|${entry.extension}`)
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it("keeps every extension dotted and every MIME type slash-namespaced", () => {
    for (const entry of allMimeTypes) {
      expect(entry.extension.startsWith(".")).toBe(true)
      expect(entry.mimeType).toMatch(/^[a-z]+\/[a-z0-9.+-]+$/)
      expect(entry.description.length).toBeGreaterThan(0)
    }
  })

  it("matches independent oracle mappings", () => {
    expect(filterMimeTypes(".pdf", "ext-to-mime")[0]?.mimeType).toBe("application/pdf")
    expect(filterMimeTypes(".png", "ext-to-mime")[0]?.mimeType).toBe("image/png")
    expect(filterMimeTypes(".html", "ext-to-mime")[0]?.mimeType).toBe("text/html")
    expect(filterMimeTypes(".json", "ext-to-mime")[0]?.mimeType).toBe("application/json")
  })
})

describe("filterMimeTypes", () => {
  it("returns the full dataset for an empty query", () => {
    expect(filterMimeTypes("", "ext-to-mime")).toEqual(allMimeTypes)
    expect(filterMimeTypes("", "mime-to-ext")).toEqual(allMimeTypes)
  })

  it("matches the primary field for the active direction only", () => {
    // ".pdf" as a MIME query must not match the extension field.
    expect(filterMimeTypes(".pdf", "mime-to-ext")).toEqual([])
    expect(filterMimeTypes("pdf", "ext-to-mime").length).toBe(1)
    // Descriptions match in both directions.
    expect(filterMimeTypes("image", "mime-to-ext").length).toBeGreaterThan(1)
  })

  it("exposes direction labels and copy targets", () => {
    const forward = getMimeTab("ext-to-mime")
    const reverse = getMimeTab("mime-to-ext")
    expect(forward.label).toBe("Extension to MIME")
    expect(reverse.label).toBe("MIME to Extension")
    const entry = allMimeTypes[0]!
    expect(forward.copyTarget(entry)).toBe(entry.mimeType)
    expect(reverse.copyTarget(entry)).toBe(entry.extension)
  })
})
