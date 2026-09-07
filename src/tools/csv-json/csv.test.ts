import { describe, expect, it } from "vitest"
import {
  csvToJson,
  formatCsvRow,
  jsonToCsv,
  maximumCsvLength,
  parseCsv,
  serializeJsonValue,
} from "./csv"

describe("parseCsv", () => {
  it("parses simple rows and drops the trailing record break", () => {
    expect(parseCsv("a,b\nc,d", ",")).toEqual({
      rows: [
        ["a", "b"],
        ["c", "d"],
      ],
      message: "",
    })
    expect(parseCsv("a,b\n", ",")).toEqual({ rows: [["a", "b"]], message: "" })
    expect(parseCsv("a,b\r\nc,d", ",")).toEqual({
      rows: [
        ["a", "b"],
        ["c", "d"],
      ],
      message: "",
    })
  })

  it("keeps quoted fields with delimiters, escaped quotes, and embedded newlines", () => {
    const parsed = parseCsv('x,"a,b",c\n"line1\nline2",y', ",")
    expect(parsed.message).toBe("")
    expect(parsed.rows).toEqual([
      ["x", "a,b", "c"],
      ["line1\nline2", "y"],
    ])
    const escaped = parseCsv('"say ""hi"""', ",")
    expect(escaped.rows).toEqual([['say "hi"']])
  })

  it("honors non-comma delimiters", () => {
    expect(parseCsv("a;b\nc;d", ";").rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
    expect(parseCsv("a\tb", "\t").rows).toEqual([["a", "b"]])
  })

  it("reports unterminated quotes instead of throwing", () => {
    expect(parseCsv('"open', ",").message).not.toBe("")
    expect(parseCsv('"open\nmore', ",").message).not.toBe("")
  })
})

describe("csvToJson", () => {
  it("uses header names when present", () => {
    const result = csvToJson("name,age\nAda,36\nGrace,45", { delimiter: ",", hasHeader: true })
    expect(result.message).toBe("")
    expect(result.rows).toEqual([
      { name: "Ada", age: "36" },
      { name: "Grace", age: "45" },
    ])
  })

  it("generates column names without a header row", () => {
    const result = csvToJson("Ada,36", { delimiter: ",", hasHeader: false })
    expect(result.rows).toEqual([{ "column-1": "Ada", "column-2": "36" }])
  })

  it("preserves extra cells under generated names instead of dropping them", () => {
    const result = csvToJson("a,b\n1,2,3", { delimiter: ",", hasHeader: true })
    expect(result.unevenRowCount).toBe(1)
    expect(result.rows).toEqual([{ a: "1", b: "2", "column-3": "3" }])
  })

  it("keeps quoted multi-line fields as one row", () => {
    const result = csvToJson('note,text\n"two\nlines",ok', { delimiter: ",", hasHeader: true })
    expect(result.rows).toEqual([{ note: "two\nlines", text: "ok" }])
    expect(result.unevenRowCount).toBe(0)
  })

  it("rejects over-long input", () => {
    expect(
      csvToJson("a".repeat(maximumCsvLength + 1), { delimiter: ",", hasHeader: false }).message,
    ).not.toBe("")
  })

  it("propagates parse errors", () => {
    expect(csvToJson('"x', { delimiter: ",", hasHeader: false }).message).not.toBe("")
  })
})

describe("formatCsvRow", () => {
  it("quotes cells containing delimiters, quotes, or line breaks", () => {
    expect(formatCsvRow(["a,b", 'c"d', "e\nf"], ",")).toBe('"a,b","c""d","e\nf"')
    expect(formatCsvRow(["plain"], ",")).toBe("plain")
    expect(formatCsvRow(["a;b"], ";")).toBe('"a;b"')
  })

  it("neutralizes formula-trigger leading characters", () => {
    expect(formatCsvRow(["=SUM(A1)"], ",")).toBe("'=SUM(A1)")
    expect(formatCsvRow(["+1", "-2", "@cmd"], ",")).toBe("'+1,'-2,'@cmd")
    expect(formatCsvRow(["2+2"], ",")).toBe("2+2")
  })
})

describe("serializeJsonValue", () => {
  it("stringifies scalars plainly and nested values as JSON", () => {
    expect(serializeJsonValue("text")).toBe("text")
    expect(serializeJsonValue(3)).toBe("3")
    expect(serializeJsonValue(true)).toBe("true")
    expect(serializeJsonValue(null)).toBe("")
    expect(serializeJsonValue(undefined)).toBe("")
    expect(serializeJsonValue({ a: 1 })).toBe('{"a":1}')
    expect(serializeJsonValue([1, 2])).toBe("[1,2]")
  })
})

describe("jsonToCsv", () => {
  it("converts an array of records with a header row", () => {
    const result = jsonToCsv('[{"name":"Ada","age":36}]', { delimiter: "," })
    expect(result.message).toBe("")
    expect(result.csv).toBe("name,age\nAda,36")
  })

  it("unions keys across rows", () => {
    const result = jsonToCsv('[{"a":1},{"a":2,"b":3}]', { delimiter: "," })
    expect(result.csv).toBe("a,b\n1,\n2,3")
  })

  it("stringifies nested values and counts them", () => {
    const result = jsonToCsv('[{"a":{"b":1},"c":[2]}]', { delimiter: "," })
    expect(result.csv).toBe('a,c\n"{""b"":1}",[2]')
    expect(result.nestedCellCount).toBe(2)
  })

  it("neutralizes formula-trigger cells and counts them", () => {
    const result = jsonToCsv('[{"cmd":"=rm -rf","sum":"+1"}]', { delimiter: "," })
    expect(result.csv).toBe("cmd,sum\n'=rm -rf,'+1")
    expect(result.neutralizedCellCount).toBe(2)
  })

  it("wraps a single object as one row", () => {
    expect(jsonToCsv('{"a":1,"b":true}', { delimiter: "," }).csv).toBe("a,b\n1,true")
  })

  it("handles arrays of arrays with generated headers", () => {
    expect(jsonToCsv("[[1,2],[3,4]]", { delimiter: "," }).csv).toBe("column-1,column-2\n1,2\n3,4")
  })

  it("reports invalid JSON, non-object roots, and mixed arrays", () => {
    expect(jsonToCsv("{", { delimiter: "," }).message).not.toBe("")
    expect(jsonToCsv("42", { delimiter: "," }).message).not.toBe("")
    expect(jsonToCsv('[{"a":1},2]', { delimiter: "," }).message).not.toBe("")
  })

  it("returns an empty result for an empty array", () => {
    const result = jsonToCsv("[]", { delimiter: "," })
    expect(result.message).toBe("")
    expect(result.csv).toBe("")
  })

  it("rejects over-long input", () => {
    expect(jsonToCsv(`"${"x".repeat(maximumCsvLength)}"`, { delimiter: "," }).message).not.toBe("")
  })
})
