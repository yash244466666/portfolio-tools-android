import { formatXml, formatXmlDocument, minifyXml, maximumXmlLength, validateXml } from "./xml"

describe("validateXml", () => {
  it("accepts well-formed documents", () => {
    expect(validateXml("<root><child>text</child></root>")).toEqual({
      ok: true,
      message: "Valid XML.",
    })
    expect(validateXml('<?xml version="1.0"?><a/>')).toEqual({ ok: true, message: "Valid XML." })
    expect(validateXml('<!DOCTYPE note SYSTEM "note.dtd"><note/>')).toEqual({
      ok: true,
      message: "Valid XML.",
    })
  })

  it("rejects malformed documents without echoing input", () => {
    const result = validateXml("<root><child></root>")
    expect(result.ok).toBe(false)
    expect(result.message).toBe("The XML is not well-formed.")
    expect(result.message).not.toContain("child")
    expect(validateXml("just text").ok).toBe(false)
    expect(validateXml("<root attr=broken/>").ok).toBe(false)
  })

  it("rejects empty input", () => {
    expect(validateXml("").message).toBe("Enter some XML first.")
    expect(validateXml("   \n  ").ok).toBe(false)
  })

  it("enforces the length limit", () => {
    const long = "<a>" + "x".repeat(maximumXmlLength) + "</a>"
    const result = validateXml(long)
    expect(result.ok).toBe(false)
    expect(result.message).toContain("limited to 50,000")
  })
})

describe("formatXml", () => {
  it("indents nested elements with two spaces per level", () => {
    expect(formatXml("<root><child><leaf>text</leaf></child></root>")).toEqual({
      output: ["<root>", "  <child>", "    <leaf>text</leaf>", "  </child>", "</root>"].join("\n"),
      message: "",
    })
  })

  it("handles self-closing tags, comments, and declarations", () => {
    const formatted = formatXml(
      '<?xml version="1.0"?><note><meta/><!-- note body --><body>hi</body></note>',
    )
    expect(formatted.message).toBe("")
    expect(formatted.output).toBe(
      [
        '<?xml version="1.0"?>',
        "<note>",
        "  <meta/>",
        "  <!-- note body -->",
        "  <body>hi</body>",
        "</note>",
      ].join("\n"),
    )
  })

  it("re-indents an already-formatted document without changing content", () => {
    const source = ["<root>", "    <child/>", "</root>"].join("\n")
    expect(formatXmlDocument(source)).toBe(["<root>", "  <child/>", "</root>"].join("\n"))
  })

  it("refuses malformed input", () => {
    expect(formatXml("<a><b></a>").message).toBe("The XML is not well-formed.")
    expect(formatXml("<a><b></a>").output).toBe("")
  })
})

describe("minifyXml", () => {
  it("collapses whitespace between tags", () => {
    expect(minifyXml("<root>\n  <child>text</child>\n</root>")).toEqual({
      output: "<root><child>text</child></root>",
      message: "",
    })
  })

  it("preserves whitespace inside text nodes", () => {
    const result = minifyXml("<root>\n  <p>hello   spaced world</p>\n</root>")
    expect(result.output).toBe("<root><p>hello   spaced world</p></root>")
  })

  it("does not touch a document with no inter-tag whitespace", () => {
    expect(minifyXml("<root><child/></root>").output).toBe("<root><child/></root>")
  })

  it("refuses malformed input", () => {
    expect(minifyXml("<a>").message).toBe("The XML is not well-formed.")
  })
})
