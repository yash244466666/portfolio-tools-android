import { generatedFileBytes, sanitizeGeneratedFileName } from "@/platform/shared/files"

describe("generated file safety", () => {
  it("removes path separators, control characters, and unsafe empty names", () => {
    expect(sanitizeGeneratedFileName(" ../private\\report\u0000.txt ")).toBe("-private-report-.txt")
    expect(sanitizeGeneratedFileName("...")).toBe("yash-tools-output")
  })

  it("decodes UTF-8 and Base64 into the same bytes used for save and share", () => {
    expect(
      new TextDecoder().decode(
        generatedFileBytes({
          name: "output.txt",
          mimeType: "text/plain",
          data: "✓",
          encoding: "utf8",
        }),
      ),
    ).toBe("✓")
    expect(
      Array.from(
        generatedFileBytes({
          name: "pixel.bin",
          mimeType: "application/octet-stream",
          data: "AP+A",
          encoding: "base64",
        }),
      ),
    ).toEqual([0, 255, 128])
  })
})
