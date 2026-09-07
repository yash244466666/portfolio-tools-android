import { describe, expect, it } from "vitest"
import {
  buildMetaTags,
  defaultMetaTagInput,
  escapeMetaHtml,
  hasAnyMetaTagContent,
  maximumMetaFieldChars,
} from "./meta-tags"

describe("escapeMetaHtml", () => {
  it("escapes attribute-breaking and injection characters", () => {
    expect(escapeMetaHtml('a"b<c>d&e')).toBe("a&quot;b&lt;c&gt;d&amp;e")
  })
})

describe("buildMetaTags", () => {
  it("emits primary tags with the upstream comment and line order", () => {
    const output = buildMetaTags({
      ...defaultMetaTagInput,
      title: "My Website",
      description: "A brief description",
      viewport: "",
      robots: "",
    })
    expect(output).toBe(
      [
        "<!-- Primary Meta Tags -->",
        "<title>My Website</title>",
        '<meta name="description" content="A brief description" />',
      ].join("\n"),
    )
  })

  it("escapes quotes in a value instead of breaking the attribute", () => {
    const output = buildMetaTags({ ...defaultMetaTagInput, title: 'My "Site"' })
    expect(output).toContain("<title>My &quot;Site&quot;</title>")
    expect(output).not.toContain('My "Site"')
  })

  it("escapes angle brackets and ampersands in attribute values", () => {
    const output = buildMetaTags({ ...defaultMetaTagInput, author: "A & B <x>" })
    expect(output).toContain("A &amp; B &lt;x&gt;")
  })

  it("includes viewport and robots defaults and omits empty optional fields", () => {
    const output = buildMetaTags({ ...defaultMetaTagInput, title: "T" })
    expect(output).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    )
    expect(output).toContain('<meta name="robots" content="index, follow" />')
    expect(output).not.toContain('rel="canonical"')
    expect(output).not.toContain("og:")
    expect(output).not.toContain("twitter:")
  })

  it("emits the Open Graph block only when an OG field is set", () => {
    const output = buildMetaTags({ ...defaultMetaTagInput, ogImage: "https://example.com/i.png" })
    expect(output).toContain("<!-- Open Graph / Facebook -->")
    expect(output).toContain('<meta property="og:type" content="website" />')
    expect(output).toContain('<meta property="og:image" content="https://example.com/i.png" />')
    expect(output).not.toContain("og:title")
    expect(output).not.toContain("<!-- Twitter -->")
  })

  it("emits the Twitter block only when a Twitter field is set", () => {
    const output = buildMetaTags({
      ...defaultMetaTagInput,
      twCard: "summary",
      twTitle: "T",
    })
    expect(output).toContain("<!-- Twitter -->")
    expect(output).toContain('<meta name="twitter:card" content="summary" />')
    expect(output).toContain('<meta name="twitter:title" content="T" />')
    expect(output).not.toContain("<!-- Open Graph / Facebook -->")
  })
})

describe("meta tag bounds", () => {
  it("caps field length at 300 characters", () => {
    expect(maximumMetaFieldChars).toBe(300)
  })

  it("detects whether any field has content", () => {
    // The defaults (viewport, robots) already produce output.
    expect(hasAnyMetaTagContent(defaultMetaTagInput)).toBe(true)
    const cleared = { ...defaultMetaTagInput, viewport: "", robots: "" }
    expect(hasAnyMetaTagContent(cleared)).toBe(false)
    expect(hasAnyMetaTagContent({ ...cleared, keywords: "a, b" })).toBe(true)
  })
})
