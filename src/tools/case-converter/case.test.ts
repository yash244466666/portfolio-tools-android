import { describe, expect, it } from "vitest"
import { caseConversions, maximumCaseChars } from "./case"

function convert(id: string, text: string): string {
  const conversion = caseConversions.find((entry) => entry.id === id)
  if (!conversion) throw new Error(`missing conversion: ${id}`)
  return conversion.convert(text)
}

describe("case conversions", () => {
  it("exposes all eight conversions with stable ids and labels", () => {
    expect(caseConversions.map((entry) => entry.id)).toEqual([
      "upper",
      "lower",
      "title",
      "sentence",
      "camel",
      "pascal",
      "snake",
      "kebab",
    ])
    expect(maximumCaseChars).toBe(100_000)
  })

  it("uppercases and lowercases with locale-independent basics", () => {
    expect(convert("upper", "hello World")).toBe("HELLO WORLD")
    expect(convert("lower", "HELLO World")).toBe("hello world")
    expect(convert("upper", "")).toBe("")
  })

  it("title-cases words while keeping apostrophes and leading punctuation", () => {
    expect(convert("title", "hello world")).toBe("Hello World")
    expect(convert("title", "don't stop me now")).toBe("Don't Stop Me Now")
    expect(convert("title", "\t“quoted” text")).toBe("\t“Quoted” Text")
    expect(convert("title", "multiple   spaces\tkept")).toBe("Multiple   Spaces\tKept")
  })

  it("sentence-cases each segment and skips leading whitespace", () => {
    expect(convert("sentence", "hello WORLD. goodbye Moon!")).toBe("Hello world. Goodbye moon!")
    // Regression: the upstream implementation produced "  hI There" for this input.
    expect(convert("sentence", "  hI There")).toBe("  Hi there")
    // ":" is not a sentence boundary, so the whole following segment is one sentence.
    expect(convert("sentence", "first?SECOND:third")).toBe("First?Second:third")
    expect(convert("sentence", "...still works")).toBe("...Still works")
  })

  it("builds identifier-style conversions from Unicode word runs", () => {
    expect(convert("camel", "Hello world foo")).toBe("helloWorldFoo")
    expect(convert("camel", "user_profile-ID")).toBe("userProfileId")
    expect(convert("pascal", "hello world")).toBe("HelloWorld")
    expect(convert("snake", "Hello World 42")).toBe("hello_world_42")
    expect(convert("snake", "don't")).toBe("don_t")
    expect(convert("kebab", "Hello World")).toBe("hello-world")
  })

  it("keeps non-ASCII words instead of dropping them", () => {
    // Regression: the upstream ASCII-only splitter discarded non-ASCII words.
    expect(convert("camel", "Grüße von München")).toBe("grüßeVonMünchen")
    expect(convert("snake", "Ωμέγα Άλφα")).toBe("ωμέγα_άλφα")
    expect(convert("pascal", "naïve café")).toBe("NaïveCafé")
  })

  it("handles empty and wordless input", () => {
    for (const id of ["camel", "pascal", "snake", "kebab"] as const) {
      expect(convert(id, "")).toBe("")
      expect(convert(id, "!!! ??? ...")).toBe("")
    }
    expect(convert("title", "")).toBe("")
    expect(convert("sentence", "")).toBe("")
  })

  it("keeps astral-plane letters intact as single graphemes", () => {
    // Mathematical bold letters (U+1D41A…) sit outside the BMP. Whether the
    // engine maps their case is engine-dependent; the invariant being pinned is
    // that the cluster is never torn into lone surrogates by capitalization.
    expect(convert("pascal", "𝐚𝐛𝐜 def")).toBe("𝐚𝐛𝐜Def")
    expect(convert("camel", "𝐚𝐛𝐜 def")).toBe("𝐚𝐛𝐜Def")
  })
})
