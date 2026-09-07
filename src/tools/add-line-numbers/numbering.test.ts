import { describe, expect, it } from "vitest"
import {
  addLineNumbers,
  defaultNumberingOptions,
  maximumStartNumber,
  numberingSeparatorOptions,
} from "./numbering"

describe("addLineNumbers", () => {
  it("numbers every line with auto padding aligned to the widest number", () => {
    expect(addLineNumbers("alpha\nbeta\ngamma\ndelta\necho", defaultNumberingOptions)).toBe(
      "1. alpha\n2. beta\n3. gamma\n4. delta\n5. echo",
    )
    // Ten lines: the widest number is two digits, so space padding aligns rows.
    const ten = addLineNumbers(
      Array.from({ length: 10 }, (_, i) => `l${i + 1}`).join("\n"),
      defaultNumberingOptions,
    )
    expect(ten.split("\n")[0]).toBe(" 1. l1")
    expect(ten.split("\n")[9]).toBe("10. l10")
  })

  it("supports each built-in separator and a custom one", () => {
    expect(addLineNumbers("a\nb", { ...defaultNumberingOptions, separator: "colon" })).toBe(
      "1: a\n2: b",
    )
    expect(addLineNumbers("a\nb", { ...defaultNumberingOptions, separator: "bracket" })).toBe(
      "1] a\n2] b",
    )
    expect(addLineNumbers("a\nb", { ...defaultNumberingOptions, separator: "paren" })).toBe(
      "1) a\n2) b",
    )
    expect(addLineNumbers("a\nb", { ...defaultNumberingOptions, separator: "dash" })).toBe(
      "1- a\n2- b",
    )
    expect(
      addLineNumbers("a\nb", {
        ...defaultNumberingOptions,
        separator: "custom",
        customSeparator: " => ",
      }),
    ).toBe("1 => a\n2 => b")
    expect(numberingSeparatorOptions.map((option) => option.id)).toEqual([
      "dot",
      "colon",
      "bracket",
      "paren",
      "dash",
      "custom",
    ])
  })

  it("honors the start number and disables padding on request", () => {
    const options = { ...defaultNumberingOptions, startNumber: 9, padding: "none" as const }
    expect(addLineNumbers("a\nb\nc", options)).toBe("9. a\n10. b\n11. c")
    expect(addLineNumbers("a\nb\nc", { ...options, padding: "auto" })).toBe(" 9. a\n10. b\n11. c")
    expect(addLineNumbers("", defaultNumberingOptions)).toBe("1. ")
  })

  it("validates the start-number bounds", () => {
    expect(() => addLineNumbers("a", { ...defaultNumberingOptions, startNumber: -1 })).toThrow(
      RangeError,
    )
    expect(() =>
      addLineNumbers("a", { ...defaultNumberingOptions, startNumber: maximumStartNumber + 1 }),
    ).toThrow(RangeError)
    expect(() => addLineNumbers("a", { ...defaultNumberingOptions, startNumber: 1.5 })).toThrow(
      RangeError,
    )
  })
})
