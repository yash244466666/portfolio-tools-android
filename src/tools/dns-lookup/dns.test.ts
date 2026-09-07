import { describe, expect, it } from "vitest"
import {
  buildQueryUrl,
  describeRcode,
  formatRecordsForCopy,
  maximumDomainLength,
  maximumRecords,
  maximumResponseChars,
  parseDnsResponse,
  recordTypeLabel,
  recordTypes,
  validateDomainName,
  type DnsRecord,
} from "./dns"

/** Rows trimmed from a real captured Cloudflare DoH response for example.com A. */
const capturedAnswerRows = [
  { name: "example.com", type: 1, TTL: 116, data: "172.66.147.243" },
  { name: "example.com", type: 1, TTL: 116, data: "104.20.23.154" },
]

describe("record type set", () => {
  it("offers exactly the supported mnemonic types", () => {
    expect([...recordTypes]).toEqual(["A", "AAAA", "CNAME", "MX", "NS", "TXT"])
  })

  it("labels common rtype numbers", () => {
    expect(recordTypeLabel(1)).toBe("A")
    expect(recordTypeLabel(5)).toBe("CNAME")
    expect(recordTypeLabel(15)).toBe("MX")
    expect(recordTypeLabel(16)).toBe("TXT")
    expect(recordTypeLabel(28)).toBe("AAAA")
    expect(recordTypeLabel(257)).toBe("CAA")
  })

  it("labels unknown and invalid rtype numbers without throwing", () => {
    expect(recordTypeLabel(999)).toBe("TYPE999")
    expect(recordTypeLabel(1.5)).toBe("UNKNOWN")
    expect(recordTypeLabel(-1)).toBe("UNKNOWN")
  })
})

describe("describeRcode", () => {
  it("describes the standard response codes", () => {
    expect(describeRcode(0)).toContain("No error")
    expect(describeRcode(3)).toContain("NXDOMAIN")
    expect(describeRcode(2)).toContain("SERVFAIL")
    expect(describeRcode(5)).toContain("REFUSED")
  })

  it("describes out-of-band codes without inventing a name", () => {
    expect(describeRcode(99)).toContain("99")
    expect(describeRcode(16)).toContain("16")
  })
})

describe("validateDomainName", () => {
  it("accepts ordinary hostnames and normalizes them", () => {
    expect(validateDomainName("example.com")).toEqual({ status: "ok", value: "example.com" })
    expect(validateDomainName("  Example.COM  ")).toEqual({ status: "ok", value: "Example.COM" })
    expect(validateDomainName("example.com.")).toEqual({ status: "ok", value: "example.com" })
    expect(validateDomainName("sub.domain.example.co.uk")).toEqual({
      status: "ok",
      value: "sub.domain.example.co.uk",
    })
    expect(validateDomainName("_dmarc.example.com")).toEqual({
      status: "ok",
      value: "_dmarc.example.com",
    })
    expect(validateDomainName("xn--e1afmkfd.xn--p1ai")).toEqual({
      status: "ok",
      value: "xn--e1afmkfd.xn--p1ai",
    })
    expect(validateDomainName("a-b.c-d")).toEqual({ status: "ok", value: "a-b.c-d" })
  })

  it("rejects empty, spaced, and malformed names with a reason", () => {
    expect(validateDomainName("").status).toBe("invalid")
    expect(validateDomainName("   ").status).toBe("invalid")
    expect(validateDomainName(".").status).toBe("invalid")
    expect(validateDomainName("exa mple.com").status).toBe("invalid")
    expect(validateDomainName("bad..name").status).toBe("invalid")
    expect(validateDomainName(".example.com").status).toBe("invalid")
    expect(validateDomainName("example.com..").status).toBe("invalid")
    expect(validateDomainName("-label.example.com").status).toBe("invalid")
    expect(validateDomainName("label-.example.com").status).toBe("invalid")
    expect(validateDomainName("exa_mple..com").status).toBe("invalid")
    const empty = validateDomainName("")
    if (empty.status === "invalid") expect(empty.reason.length).toBeGreaterThan(0)
  })

  it("enforces label and name length bounds", () => {
    expect(validateDomainName("a".repeat(63) + ".com").status).toBe("ok")
    expect(validateDomainName("a".repeat(64) + ".com").status).toBe("invalid")
    expect(validateDomainName("ab.".repeat(84) + "cd").status).toBe("invalid")
    const longest = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`
    expect(longest.length).toBe(253)
    expect(validateDomainName(longest).status).toBe("ok")
    expect(validateDomainName(`${longest}x`).status).toBe("invalid")
    expect(maximumDomainLength).toBe(253)
  })
})

describe("buildQueryUrl", () => {
  it("builds the HTTPS-only exact-origin query", () => {
    const url = buildQueryUrl("example.com", "A")
    expect(url.protocol).toBe("https:")
    expect(url.host).toBe("cloudflare-dns.com")
    expect(url.pathname).toBe("/dns-query")
    expect(url.searchParams.get("name")).toBe("example.com")
    expect(url.searchParams.get("type")).toBe("A")
  })

  it("encodes the query name and never interpolates raw input", () => {
    const url = buildQueryUrl("sub.example.com", "TXT")
    expect(url.search).toBe("?name=sub.example.com&type=TXT")
  })

  it("refuses to interpolate an unvalidated name or unknown type", () => {
    expect(() => buildQueryUrl("bad..name", "A")).toThrow(RangeError)
    expect(() => buildQueryUrl("", "A")).toThrow(RangeError)
    expect(() => buildQueryUrl("example.com", "ANY" as "A")).toThrow(RangeError)
  })
})

describe("parseDnsResponse", () => {
  it("parses the captured provider body", () => {
    const parsed = parseDnsResponse({
      Status: 0,
      TC: false,
      RD: true,
      RA: true,
      AD: true,
      CD: false,
      Question: [{ name: "example.com", type: 1 }],
      Answer: capturedAnswerRows,
    })
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    expect(parsed.records).toEqual([
      { name: "example.com", type: 1, TTL: 116, data: "172.66.147.243" },
      { name: "example.com", type: 1, TTL: 116, data: "104.20.23.154" },
    ])
  })

  it("keeps CNAME chain rows with their own type numbers", () => {
    const parsed = parseDnsResponse({
      Status: 0,
      Answer: [
        { name: "www.example.com", type: 5, TTL: 300, data: "example.com" },
        ...capturedAnswerRows,
      ],
    })
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    expect(parsed.records[0]?.type).toBe(5)
    expect(parsed.records.length).toBe(3)
  })

  it("maps a non-zero Status to a typed DNS error", () => {
    expect(
      parseDnsResponse({
        Status: 3,
        Question: [{ name: "nonexistent-xyz.com", type: 1 }],
        Authority: [{ name: "com", type: 6, TTL: 900, data: "a.gtld-servers.net." }],
      }),
    ).toEqual({ status: "dns-error", rcode: 3 })
    expect(parseDnsResponse({ Status: 2 })).toEqual({ status: "dns-error", rcode: 2 })
  })

  it("reports no-record for a NOERROR answer without rows", () => {
    expect(parseDnsResponse({ Status: 0 })).toEqual({ status: "no-record" })
    expect(parseDnsResponse({ Status: 0, Answer: [] })).toEqual({ status: "no-record" })
  })

  it("rejects bodies with the wrong shape", () => {
    expect(parseDnsResponse(null).status).toBe("malformed")
    expect(parseDnsResponse("x").status).toBe("malformed")
    expect(parseDnsResponse([]).status).toBe("malformed")
    expect(parseDnsResponse({}).status).toBe("malformed")
    expect(parseDnsResponse({ Status: "0" }).status).toBe("malformed")
    expect(parseDnsResponse({ Status: -1 }).status).toBe("malformed")
    expect(parseDnsResponse({ Status: 0.5 }).status).toBe("malformed")
    expect(parseDnsResponse({ Status: 0, Answer: {} }).status).toBe("malformed")
  })

  it("drops hostile rows instead of trusting them", () => {
    const parsed = parseDnsResponse({
      Status: 0,
      Answer: [
        { name: "example.com", type: 1, TTL: 116, data: "172.66.147.243" },
        { name: "example.com", type: 1, TTL: "116", data: "0.0.0.0" }, // string TTL
        { name: "example.com", type: 1, TTL: -1, data: "0.0.0.0" }, // negative TTL
        { name: "example.com", type: 1, TTL: 116 }, // missing data
        { name: "", type: 1, TTL: 116, data: "0.0.0.0" }, // empty name
        { name: "example.com", type: 1, TTL: 1.5, data: "0.0.0.0" }, // non-integer TTL
        "row",
        null,
      ],
    })
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    expect(parsed.records.length).toBe(1)
    expect(parsed.records[0]).toEqual({
      name: "example.com",
      type: 1,
      TTL: 116,
      data: "172.66.147.243",
    })
  })

  it("caps the number of kept records", () => {
    const many: unknown[] = []
    for (let index = 0; index < maximumRecords + 20; index++) {
      many.push({ name: "example.com", type: 16, TTL: 300, data: `chunk-${index}` })
    }
    const parsed = parseDnsResponse({ Status: 0, Answer: many })
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    expect(parsed.records.length).toBe(maximumRecords)
    expect(parsed.records[maximumRecords - 1]?.data).toBe(`chunk-${maximumRecords - 1}`)
  })
})

describe("formatRecordsForCopy", () => {
  it("joins tab-separated lines with the labeled type", () => {
    const records: DnsRecord[] = [
      { name: "example.com", type: 1, TTL: 116, data: "172.66.147.243" },
      { name: "example.com", type: 16, TTL: 60, data: "v=spf1 -all" },
    ]
    expect(formatRecordsForCopy(records)).toBe(
      "example.com\tA\t116\t172.66.147.243\nexample.com\tTXT\t60\tv=spf1 -all",
    )
  })

  it("returns an empty string for no records", () => {
    expect(formatRecordsForCopy([])).toBe("")
  })
})

describe("bounds", () => {
  it("keeps the documented provider bounds", () => {
    expect(maximumResponseChars).toBe(131_072)
    expect(maximumRecords).toBe(64)
  })
})
