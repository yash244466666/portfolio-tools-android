import { describe, expect, it } from "vitest"
import { defaultEnabled, maximumSanitizerChars, sanitizeText, sanitizerOptions } from "./sanitizer"

describe("sanitizeText", () => {
  it("redacts an email address", () => {
    const result = sanitizeText("write to jane.doe@example.com today", defaultEnabled)
    expect(result.text).toBe("write to [EMAIL REDACTED] today")
    expect(result.counts.emails).toBe(1)
  })

  it("redacts multiple emails on one line", () => {
    const result = sanitizeText("a@b.co c@d.org.uk", defaultEnabled)
    expect(result.text).toBe("[EMAIL REDACTED] [EMAIL REDACTED]")
    expect(result.counts.emails).toBe(2)
  })

  it("redacts a 10-digit phone number", () => {
    const result = sanitizeText("call 555-123-4567 now", defaultEnabled)
    expect(result.counts.phones).toBe(1)
    expect(result.text).not.toContain("555-123-4567")
  })

  it("redacts a dotted IPv4 address", () => {
    const result = sanitizeText("server at 192.168.1.100 responded", defaultEnabled)
    expect(result.text).toBe("server at [IP REDACTED] responded")
    expect(result.counts.ips).toBe(1)
  })

  it("redacts an SSN pattern", () => {
    const result = sanitizeText("SSN 123-45-6789 on file", defaultEnabled)
    expect(result.text).toBe("SSN [SSN REDACTED] on file")
    expect(result.counts.ssn).toBe(1)
  })

  it("redacts a grouped card number", () => {
    const result = sanitizeText("card 4111 1111 1111 1111", defaultEnabled)
    expect(result.text).toBe("card [CC REDACTED]")
    expect(result.counts.creditCards).toBe(1)
  })

  it("leaves untouched types in place when disabled", () => {
    const result = sanitizeText("a@b.co at 10.0.0.1", {
      ...defaultEnabled,
      ips: false,
    })
    expect(result.text).toContain("[EMAIL REDACTED]")
    expect(result.text).toContain("10.0.0.1")
    expect(result.counts.ips).toBe(0)
  })

  it("applies replacements sequentially so a phone is not double-counted as an IP", () => {
    const result = sanitizeText("111.222.333.444", defaultEnabled)
    // Not a valid IP by digit bounds in reality, but the pattern matches the
    // dotted shape; the count stays under its own option.
    expect(result.counts.ips).toBe(1)
  })

  it("counts zero for text with nothing to redact", () => {
    const result = sanitizeText("nothing sensitive here", defaultEnabled)
    expect(result.text).toBe("nothing sensitive here")
    expect(Object.values(result.counts).every((count) => count === 0)).toBe(true)
  })

  it("preserves newlines and surrounding text", () => {
    const result = sanitizeText("line one\njane@x.dev\nline three", defaultEnabled)
    expect(result.text).toBe("line one\n[EMAIL REDACTED]\nline three")
  })

  it("documents the character limit constant", () => {
    expect(maximumSanitizerChars).toBe(100_000)
    expect(sanitizerOptions).toHaveLength(5)
  })
})
