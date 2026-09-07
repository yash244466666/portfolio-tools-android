import { describe, expect, it } from "vitest"
import { maximumOutputLength, maximumYamlLength, jsonToYaml, yamlToJson } from "./yaml-json"

describe("yamlToJson", () => {
  it("converts simple YAML mappings and lists", () => {
    expect(yamlToJson("name: Ada\nage: 36")).toEqual({
      output: '{\n  "name": "Ada",\n  "age": 36\n}',
      message: "",
    })
    expect(yamlToJson("- 1\n- 2").output).toBe("[\n  1,\n  2\n]")
  })

  it("keeps multi-word scalars and nested structures", () => {
    const result = yamlToJson("outer:\n  inner: hello world\nlist:\n  - a\n  - b")
    expect(result.message).toBe("")
    expect(JSON.parse(result.output)).toEqual({
      outer: { inner: "hello world" },
      list: ["a", "b"],
    })
  })

  it("rejects unsafe schema types even when syntactically valid", () => {
    // A js-yaml !!set-style mapping with duplicate keys is an error; a plain
    // executable-looking scalar parses as a string, never executed.
    const result = yamlToJson("!!python/object:os.system\nx: 1")
    expect(result.message).toContain("not valid")
    expect(result.output).toBe("")
  })

  it("reports invalid YAML with the parser reason", () => {
    expect(yamlToJson("key: [unclosed").message).not.toBe("")
    expect(yamlToJson("a: 1\na: 2").message).toContain("not valid")
  })

  it("treats empty input as an empty result without an error", () => {
    expect(yamlToJson("")).toEqual({ output: "", message: "" })
    expect(yamlToJson("   \n").message).toBe("")
  })

  it("rejects over-long input", () => {
    expect(yamlToJson(`a: ${"x".repeat(maximumYamlLength)}`).message).not.toBe("")
  })

  it("guards a huge output against the output limit", () => {
    // YAML anchors/aliases are the classic expansion case: a small alias list
    // re-serialized per alias would inflate far past the output limit.
    const anchor = `base: &b [${Array.from({ length: 100 }, (_, index) => index).join(",")}]`
    const aliases = Array.from({ length: 5000 }, (_, index) => `k${index}: *b`)
    const input = [anchor, ...aliases].join("\n")
    expect(input.length).toBeLessThanOrEqual(maximumYamlLength)
    expect(yamlToJson(input).message).toContain("output size limit")
  })
})

describe("jsonToYaml", () => {
  it("converts JSON objects and arrays to YAML", () => {
    expect(jsonToYaml('{"name":"Ada","age":36}')).toEqual({
      output: "name: Ada\nage: 36\n",
      message: "",
    })
    expect(jsonToYaml("[1,2]").output).toBe("- 1\n- 2\n")
  })

  it("wraps long lines at lineWidth 120", () => {
    const long = `{"text":"${"word ".repeat(40)}"}`
    const result = jsonToYaml(long)
    expect(result.message).toBe("")
    expect(result.output.split("\n").some((line) => line.length > 125)).toBe(false)
  })

  it("does not emit anchors or aliases for plain JSON", () => {
    const result = jsonToYaml('{"a":{"x":1},"b":{"x":1}}')
    expect(result.message).toBe("")
    expect(result.output).not.toContain("&")
    expect(result.output).not.toContain("*")
  })

  it("reports invalid JSON and too-deep nesting", () => {
    expect(jsonToYaml("{").message).toContain("not valid")
    // 25k nesting levels parse natively but exhaust the recursive serializer.
    const deep = `${"[".repeat(25_000)}${"]".repeat(25_000)}`
    expect(jsonToYaml(deep).message).toContain("nested too deeply")
  })

  it("rejects over-long input", () => {
    expect(jsonToYaml(`"${"x".repeat(maximumYamlLength)}"`).message).not.toBe("")
  })

  it("treats empty input as an empty result", () => {
    expect(jsonToYaml("")).toEqual({ output: "", message: "" })
  })

  it("round-trips through the YAML direction", () => {
    const original = '{"tools":[{"id":"a","n":1},{"id":"b","n":2}]}'
    const toYaml = jsonToYaml(original)
    expect(toYaml.message).toBe("")
    const back = yamlToJson(toYaml.output)
    expect(back.message).toBe("")
    expect(JSON.parse(back.output)).toEqual(JSON.parse(original))
  })
})

describe("bounds constants", () => {
  it("keeps the documented limits", () => {
    expect(maximumYamlLength).toBe(50_000)
    expect(maximumOutputLength).toBe(256 * 1024)
  })
})
