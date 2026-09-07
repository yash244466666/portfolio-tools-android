import { describe, expect, it } from "vitest"
import { addSourceTag, buildCspHeader, commonSources, defaultDirectives } from "./csp"

describe("buildCspHeader", () => {
  it("emits the default-src directive when enabled", () => {
    const header = buildCspHeader(defaultDirectives())
    expect(header).toBe("default-src 'self'")
  })

  it("emits an empty string when no directive is enabled", () => {
    const directives = defaultDirectives().map((directive) => ({ ...directive, enabled: false }))
    expect(buildCspHeader(directives)).toBe("")
  })

  it("falls back to 'none' for an enabled directive with no sources", () => {
    const directives = defaultDirectives().map((directive) =>
      directive.id === "script-src" ? { ...directive, enabled: true, sources: "" } : directive,
    )
    expect(buildCspHeader(directives)).toContain("script-src 'none'")
  })

  it("joins multiple enabled directives with semicolons", () => {
    const directives = defaultDirectives().map((directive) =>
      directive.id === "img-src"
        ? { ...directive, enabled: true, sources: "https://cdn.example.com" }
        : directive,
    )
    const header = buildCspHeader(directives)
    expect(header).toBe("default-src 'self'; img-src https://cdn.example.com")
  })

  it("emits flag-only directives without sources", () => {
    const directives = defaultDirectives().map((directive) =>
      directive.id === "upgrade-insecure-requests" ? { ...directive, enabled: true } : directive,
    )
    expect(buildCspHeader(directives)).toContain("upgrade-insecure-requests")
    expect(buildCspHeader(directives)).not.toMatch(/upgrade-insecure-requests \S/)
  })

  it("trims surrounding whitespace from sources", () => {
    const directives = defaultDirectives().map((directive) =>
      directive.id === "style-src"
        ? { ...directive, enabled: true, sources: "  'self'  " }
        : directive,
    )
    expect(buildCspHeader(directives)).toContain("style-src 'self'")
  })
})

describe("addSourceTag", () => {
  it("appends a tag to the source list", () => {
    expect(addSourceTag("'self'", "*")).toBe("'self' *")
  })

  it("keeps an existing tag without duplicating it", () => {
    expect(addSourceTag("'self' *", "*")).toBe("'self' *")
  })

  it("adds to an empty list", () => {
    expect(addSourceTag("", "'none'")).toBe("'none'")
  })

  it("exposes the upstream common source tags", () => {
    expect(commonSources).toContain("'self'")
    expect(commonSources).toContain("'none'")
    expect(commonSources).toContain("'unsafe-inline'")
    expect(commonSources).toContain("'unsafe-eval'")
    expect(commonSources).toContain("*")
  })
})

describe("defaultDirectives", () => {
  it("starts with only default-src enabled", () => {
    const directives = defaultDirectives()
    expect(directives.find((directive) => directive.id === "default-src")?.enabled).toBe(true)
    expect(directives.filter((directive) => directive.enabled)).toHaveLength(1)
  })

  it("marks upgrade-insecure-requests as flag only", () => {
    expect(
      defaultDirectives().find((directive) => directive.id === "upgrade-insecure-requests")
        ?.flagOnly,
    ).toBe(true)
  })

  it("returns a fresh array on every call", () => {
    const first = defaultDirectives()
    const second = defaultDirectives()
    expect(first).not.toBe(second)
    expect(first).toEqual(second)
  })
})
