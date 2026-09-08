import { describe, expect, it } from "vitest"
import { buildVcard, escapeVcardText, vcardFilename } from "./vcard"

describe("escapeVcardText", () => {
  it("escapes backslash, semicolon, comma, and newlines", () => {
    expect(escapeVcardText("Smith; Jr")).toBe("Smith\\; Jr")
    expect(escapeVcardText("a,b\\c\nd")).toBe("a\\,b\\\\c\\nd")
  })
})

describe("vcardFilename", () => {
  it("suggests a sanitized name and never returns an empty base", () => {
    expect(vcardFilename("Ada", "Lovelace")).toBe("ada-lovelace.vcf")
    expect(vcardFilename("Ada María", "O'Brien")).toBe("ada-mar-a-o-brien.vcf")
    expect(vcardFilename("", "")).toBe("contact.vcf")
  })
})

describe("buildVcard", () => {
  it("builds a CRLF-terminated VCARD with N and FN", () => {
    const result = buildVcard({ firstName: "Ada", lastName: "Lovelace" })
    expect(result).toEqual({
      status: "ok",
      card: [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Lovelace;Ada;;;",
        "FN:Ada Lovelace",
        "END:VCARD",
      ].join("\r\n"),
      filename: "ada-lovelace.vcf",
    })
  })

  it("includes optional properties only when present, escaped", () => {
    const result = buildVcard({
      firstName: "Grace",
      lastName: "Hopper",
      organization: "Acme; Inc",
      phone: "+1 555 123 4567",
      email: "grace@example.com",
      url: "https://example.com/grace",
      address: "1 Main St, Springfield",
    })
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.card).toContain("ORG:Acme\\; Inc")
    expect(result.card).toContain("TEL;TYPE=VOICE:+1 555 123 4567")
    expect(result.card).toContain("EMAIL;TYPE=INTERNET:grace@example.com")
    expect(result.card).toContain("URL:https://example.com/grace")
    expect(result.card).toContain("ADR;TYPE=HOME:;;1 Main St\\, Springfield;;;;")
  })

  it("accepts only https website URLs", () => {
    const http = buildVcard({
      firstName: "Ada",
      lastName: "Lovelace",
      organization: "",
      phone: "",
      email: "",
      url: "http://example.com",
      address: "",
    })
    expect(http).toEqual({ status: "error", message: "Enter an https website URL." })
  })

  it("requires at least one name", () => {
    expect(buildVcard({ firstName: " ", lastName: "" }).status).toBe("error")
  })
})
