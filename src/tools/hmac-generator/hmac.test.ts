import { describe, expect, it } from "vitest"
import { getHmacAlgorithm, hmacSign, expectedHmacHexLength } from "./hmac"

describe("getHmacAlgorithm", () => {
  it("falls back to SHA-256", () => {
    expect(getHmacAlgorithm("SHA-512")).toBe("SHA-512")
    expect(getHmacAlgorithm("MD5")).toBe("SHA-256")
  })
})

describe("hmacSign", () => {
  it("matches RFC 4231 test case 2 (HMAC-SHA-256)", async () => {
    // RFC 4231 test case 2: key "Jefe", data "what do ya want for nothing?"
    const signature = await hmacSign("SHA-256", "Jefe", "what do ya want for nothing?")
    expect(signature).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843")
  })

  it("matches RFC 4231 test case 1 for SHA-384 and SHA-512", async () => {
    // RFC 4231 test case 1: key 0x0b repeated 20 times, data "Hi There"
    const key = "".repeat(20)
    expect(await hmacSign("SHA-384", key, "Hi There")).toBe(
      "afd03944d84895626b0825f4ab46907f15f9dadbe4101ec682aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6",
    )
    expect(await hmacSign("SHA-512", key, "Hi There")).toBe(
      "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854",
    )
  })

  it("produces the documented hex length per algorithm", async () => {
    for (const algorithm of ["SHA-256", "SHA-384", "SHA-512"] as const) {
      const signature = await hmacSign(algorithm, "key", "message")
      expect(signature.length).toBe(expectedHmacHexLength(algorithm))
    }
  })

  it("differs when the key or message changes", async () => {
    const first = await hmacSign("SHA-256", "key", "message")
    const second = await hmacSign("SHA-256", "keys", "message")
    const third = await hmacSign("SHA-256", "key", "message ")
    expect(first).not.toBe(second)
    expect(first).not.toBe(third)
  })
})
