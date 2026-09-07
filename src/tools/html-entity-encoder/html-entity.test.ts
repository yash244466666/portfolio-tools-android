import { describe, expect, it } from "vitest"
import {
  applyHtmlEntityMode,
  decodeEntities,
  encodeEntities,
  escapeHtml,
  getHtmlEntityMode,
} from "./html-entity"

describe("encodeEntities", () => {
  it("encodes the five reserved characters", () => {
    expect(encodeEntities("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;")
    expect(encodeEntities("a & b < c > d \" e ' f")).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &#39; f",
    )
    expect(encodeEntities("plain")).toBe("plain")
  })
})

describe("escapeHtml", () => {
  it("leaves the apostrophe untouched like upstream", () => {
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;'")
    expect(escapeHtml("no specials")).toBe("no specials")
  })
})

describe("decodeEntities", () => {
  it("decodes the named and numeric entities with oracle vectors", () => {
    expect(decodeEntities("&amp;&lt;&gt;&quot;&#39;")).toBe("&<>\"'")
    expect(decodeEntities("&#65;&#x42;")).toBe("AB")
    expect(decodeEntities("&copy; 2026")).toBe("© 2026")
    expect(decodeEntities("&mdash; &hellip;")).toBe("— …")
  })

  it("leaves unknown or malformed entities unchanged", () => {
    expect(decodeEntities("&unknownname;")).toBe("&unknownname;")
    expect(decodeEntities("&#zz;")).toBe("&#zz;")
    expect(decodeEntities("&#x110000;")).toBe("&#x110000;")
    expect(decodeEntities("ampersand alone & stays")).toBe("ampersand alone & stays")
    expect(decodeEntities("<script>alert(1)</script>")).toBe("<script>alert(1)</script>")
  })
})

describe("applyHtmlEntityMode", () => {
  it("routes to the selected mode", () => {
    expect(applyHtmlEntityMode("encode", "<a>")).toBe("&lt;a&gt;")
    expect(applyHtmlEntityMode("decode", "&lt;a&gt;")).toBe("<a>")
    expect(applyHtmlEntityMode("escape-html", '<a href="x">')).toBe("&lt;a href=&quot;x&quot;&gt;")
  })
})

describe("getHtmlEntityMode", () => {
  it("falls back to encode for unknown ids", () => {
    expect(getHtmlEntityMode("decode")).toBe("decode")
    expect(getHtmlEntityMode("nope")).toBe("encode")
  })
})
