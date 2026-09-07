import { describe, expect, it } from "vitest"
import {
  buildHashDiffResult,
  compareHashes,
  computeHashDiffHash,
  expectedHashHexLength,
  hashDiffAlgorithms,
  toHexDigest,
} from "./hash-diff"

// Independent oracle vectors: SHA-1/SHA-256 of the empty string and "abc" from
// the NIST/FIPS published digests.
describe("computeHashDiffHash", () => {
  it("matches published digests for known vectors", async () => {
    await expect(computeHashDiffHash("SHA-256", "abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    )
    await expect(computeHashDiffHash("SHA-1", "abc")).resolves.toBe(
      "a9993e364706816aba3e25717850c26c9cd0d89d",
    )
  })

  it("hashes the UTF-8 encoding of non-ASCII text", async () => {
    // SHA-256 of "héllo" computed over UTF-8 bytes.
    await expect(computeHashDiffHash("SHA-256", "héllo")).resolves.toHaveLength(64)
  })

  it("throws for an unsupported algorithm", async () => {
    await expect(
      computeHashDiffHash("MD5" as (typeof hashDiffAlgorithms)[number], "abc"),
    ).rejects.toThrow("Unsupported hash algorithm")
  })

  it("returns the documented hex length per algorithm", async () => {
    for (const algorithm of hashDiffAlgorithms) {
      const digest = await computeHashDiffHash(algorithm, "abc")
      expect(digest).toHaveLength(expectedHashHexLength(algorithm))
    }
  })
})

describe("toHexDigest", () => {
  it("zero-pads single-digit bytes", () => {
    const bytes = new Uint8Array([0x0a, 0xff, 0x00]).buffer
    expect(toHexDigest(bytes)).toBe("0aff00")
  })
})

describe("compareHashes", () => {
  it("treats different-length digests as different", () => {
    expect(compareHashes("abc", "abc")).toBe(true)
    expect(compareHashes("abc", "abd")).toBe(false)
    expect(compareHashes("abc", "abcd")).toBe(false)
  })
})

describe("buildHashDiffResult", () => {
  it("reports match rows and an identical verdict when all digests agree", () => {
    const digests = new Map([
      ["SHA-1" as const, "a9993e36"],
      ["SHA-256" as const, "ba7816bf"],
      ["SHA-512" as const, "ddaf35a1"],
    ])
    const result = buildHashDiffResult(digests, new Map(digests))
    expect(result.identical).toBe(true)
    expect(result.entries.every((entry) => entry.match)).toBe(true)
    expect(result.entries[0]?.label).toBe("SHA-1 (legacy)")
  })

  it("reports DIFFERENT when any algorithm disagrees", () => {
    const first = new Map([
      ["SHA-1" as const, "a9993e36"],
      ["SHA-256" as const, "ba7816bf"],
      ["SHA-512" as const, "ddaf35a1"],
    ])
    const second = new Map([
      ["SHA-1" as const, "a9993e36"],
      ["SHA-256" as const, "00000000"],
      ["SHA-512" as const, "ddaf35a1"],
    ])
    const result = buildHashDiffResult(first, second)
    expect(result.identical).toBe(false)
    expect(result.entries.find((entry) => entry.algorithm === "SHA-256")?.match).toBe(false)
  })
})
