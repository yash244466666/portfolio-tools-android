// @vitest-environment node
import { hashText } from "@/tools/hash-generator/hash"

describe("text hashing", () => {
  it("matches the published SHA-256 empty-string vector", async () => {
    await expect(hashText("SHA-256", "")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )
  })

  it("hashes UTF-8 rather than UTF-16 code units", async () => {
    await expect(hashText("SHA-256", "✓")).resolves.toBe(
      "1dabba21cdad44541f6b15796f8d22978fc7ea10c46aeceeeeb66c23b3ac7604",
    )
  })
})
