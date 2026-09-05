import type { PlatformError } from "@/platform/errors"
import { validatedExternalUrl } from "@/platform/shared/urls"

describe("external URL validation", () => {
  it("allows ordinary HTTPS URLs", () => {
    expect(validatedExternalUrl(new URL("https://example.com/help?q=1"))).toBe(
      "https://example.com/help?q=1",
    )
  })

  it.each(["http://example.com", "https://user:secret@example.com", "file:///tmp/report"])(
    "rejects unsafe external URL %s",
    (value) => {
      expect(() => validatedExternalUrl(new URL(value))).toThrowError(
        expect.objectContaining<Partial<PlatformError>>({ code: "EXTERNAL_URL_REJECTED" }),
      )
    },
  )
})
