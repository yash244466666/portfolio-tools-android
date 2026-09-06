import {
  bytesToBase64,
  generatedFileBytes,
  maximumBridgeGeneratedFileBytes,
  sanitizeGeneratedFileName,
  validatedGeneratedFileBytes,
} from "@/platform/shared/files"

describe("generated file safety", () => {
  it("removes path separators, control characters, and unsafe empty names", () => {
    expect(sanitizeGeneratedFileName(" ../private\\report\u0000.txt ")).toBe("-private-report-.txt")
    expect(sanitizeGeneratedFileName("...")).toBe("yash-tools-output")
    expect(Array.from(sanitizeGeneratedFileName("😀".repeat(130)))).toHaveLength(30)
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

  it("rejects malformed and over-limit generated bridge data", () => {
    expect(() =>
      validatedGeneratedFileBytes({
        name: "invalid.bin",
        mimeType: "application/octet-stream",
        data: "not base64!",
        encoding: "base64",
      }),
    ).toThrow(TypeError)
    expect(() =>
      validatedGeneratedFileBytes({
        name: "large.txt",
        mimeType: "text/plain",
        data: "a".repeat(maximumBridgeGeneratedFileBytes + 1),
        encoding: "utf8",
      }),
    ).toThrow(RangeError)
  })
})

describe("bytesToBase64", () => {
  it("encodes standard vectors across chunk boundaries", () => {
    expect(bytesToBase64(new TextEncoder().encode("abc"))).toBe("YWJj")
    expect(bytesToBase64(new Uint8Array([0, 255, 128]))).toBe("AP+A")
    const large = new Uint8Array(0x8000 + 17)
    for (let index = 0; index < large.length; index++) large[index] = index % 256
    expect(atob(bytesToBase64(large)).length).toBe(large.length)
  })
})
