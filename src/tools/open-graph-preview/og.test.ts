import { describe, expect, it } from "vitest"
import {
  buildOpenGraphSummary,
  maximumOgHtmlLength,
  parseOpenGraphTags,
  serializeOpenGraphTags,
} from "./og"

const documentHead = [
  "<head>",
  '<meta charset="utf-8" />',
  "<title>Upstream</title>",
  '<meta property="og:title" content="Launch day" />',
  '<meta property="og:description" content="Everything new." />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta content="fallback-description" property="og:description" />',
  '<meta property="og:image" content="https://example.com/card.png" />',
  '<meta property="og:url" content="https://example.com/launch" />',
  '<meta property="og:type" content="article" />',
  "</head>",
].join("\n")

describe("parseOpenGraphTags", () => {
  it("extracts og: and twitter: tags in both attribute orders", () => {
    const tags = parseOpenGraphTags(documentHead)
    expect(tags).toContainEqual({ property: "og:title", content: "Launch day" })
    expect(tags).toContainEqual({
      property: "twitter:card",
      content: "summary_large_image",
    })
    // The two og:description tags have different content, so both survive
    // the content-based dedupe.
    expect(tags).toContainEqual({
      property: "og:description",
      content: "fallback-description",
    })
    expect(tags.some((tag) => tag.property === "charset")).toBe(false)
    expect(tags).toHaveLength(7)
  })

  it("keeps the first occurrence of an identically valued tag", () => {
    const tags = parseOpenGraphTags(
      '<meta property="og:title" content="first" /><meta property="og:title" content="first" />',
    )
    expect(tags).toEqual([{ property: "og:title", content: "first" }])
  })

  it("normalizes property casing", () => {
    const tags = parseOpenGraphTags('<meta PROPERTY="OG:Title" content="x" />')
    expect(tags).toEqual([{ property: "og:title", content: "x" }])
  })

  it("returns nothing for empty, oversize, or tag-free input", () => {
    expect(parseOpenGraphTags("")).toEqual([])
    expect(parseOpenGraphTags("<div>no meta tags</div>")).toEqual([])
    expect(
      parseOpenGraphTags(
        `<meta property="og:title" content="${"x".repeat(maximumOgHtmlLength)}" />`,
      ),
    ).toEqual([])
  })
})

describe("buildOpenGraphSummary", () => {
  it("prefers Open Graph values and fills gaps from Twitter Cards", () => {
    const summary = buildOpenGraphSummary(parseOpenGraphTags(documentHead))
    expect(summary).toEqual({
      title: "Launch day",
      description: "Everything new.",
      imageUrl: "https://example.com/card.png",
      url: "https://example.com/launch",
      type: "article",
      card: "summary_large_image",
    })
  })

  it("falls back to Twitter Card values when Open Graph is absent", () => {
    const summary = buildOpenGraphSummary(
      parseOpenGraphTags(
        '<meta name="twitter:title" content="Only Twitter" /><meta name="twitter:image" content="https://example.com/t.png" />',
      ),
    )
    expect(summary.title).toBe("Only Twitter")
    expect(summary.imageUrl).toBe("https://example.com/t.png")
    expect(summary.url).toBe("")
  })

  it("returns an all-empty summary without tags", () => {
    expect(buildOpenGraphSummary([]).title).toBe("")
  })
})

describe("serializeOpenGraphTags", () => {
  it("re-serializes tags as canonical meta elements", () => {
    const tags = parseOpenGraphTags(documentHead)
    const serialized = serializeOpenGraphTags(tags)
    expect(serialized.split("\n")).toHaveLength(tags.length)
    expect(serialized).toContain('<meta property="og:title" content="Launch day" />')
    expect(parseOpenGraphTags(serialized)).toEqual(tags)
  })
})
