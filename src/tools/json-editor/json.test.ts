import { describe, expect, it } from "vitest"
import {
  allExpandablePaths,
  buildJsonTree,
  formatJson,
  isValidJsonSize,
  maximumExpandAllNodes,
  maximumJsonBytes,
  maximumRenderedTreeNodes,
  minifyJson,
  parseJson,
} from "./json"

describe("JSON parsing vectors", () => {
  it("parses representative documents", () => {
    for (const document of [
      "{}",
      "[]",
      "null",
      "42",
      '"text"',
      "true",
      '{"a":1,"b":[1,2,{"c":null}],"d":{"e":false}}',
      '  {  "spaced" :  true  }  ',
      '"\\u0041\\n\\t"',
      "[1e3, -0.5, 2E-2]",
    ]) {
      expect(parseJson(document).status).toBe("ok")
    }
  })

  it("rejects malformed documents with a bounded message", () => {
    for (const document of ["{", "[1,]", '{"a" 1}', "nope", '{"a":undefined}', "''", "1 2"]) {
      const result = parseJson(document)
      expect(result.status).toBe("invalid")
      if (result.status !== "invalid") continue
      expect(result.message.length).toBeGreaterThan(0)
      expect(result.message.length).toBeLessThanOrEqual(200)
    }
  })

  it("never crashes on deeply nested input within the size cap", () => {
    // Modern engines parse nesting iteratively and succeed; older recursive engines raise
    // RangeError. Either way the hostile document must produce a typed result, never a
    // throw, and the tree keeps its own depth cap.
    const hostile = "[".repeat(60_000) + "]".repeat(60_000)
    const result = parseJson(hostile)
    expect(["ok", "invalid"]).toContain(result.status)
    if (result.status === "invalid") {
      expect(result.message.length).toBeGreaterThan(0)
    }
  })

  it("rejects oversized input before parsing", () => {
    expect(maximumJsonBytes).toBe(256 * 1024)
    expect(isValidJsonSize(" ".repeat(maximumJsonBytes))).toBe(true)
    const result = parseJson(" ".repeat(maximumJsonBytes + 1))
    expect(result.status).toBe("over-limit")
    expect(parseJson("").status).toBe("invalid")
  })

  it("keeps duplicate and prototype-named keys as plain data", () => {
    const parsed = parseJson('{"a":1,"a":2,"__proto__":{"x":1},"constructor":"y"}')
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    const record = parsed.value as Record<string, unknown>
    // JSON parsing keeps the last duplicate key and never invokes setters.
    expect(record["a"]).toBe(2)
    expect(record["__proto__"]).toEqual({ x: 1 })
    expect(Object.keys(record)).toContain("constructor")
    expect(typeof (record as { x?: unknown }).x).toBe("undefined")
  })

  it("formats and minifies valid documents and refuses invalid ones", () => {
    expect(formatJson('{"a":[1,2]}')).toEqual({
      status: "ok",
      text: '{\n  "a": [\n    1,\n    2\n  ]\n}',
    })
    expect(minifyJson('{ "a" : [ 1 , 2 ] }')).toEqual({ status: "ok", text: '{"a":[1,2]}' })
    expect(formatJson("{").status).toBe("invalid")
    expect(minifyJson("{").status).toBe("invalid")
    // Out-of-range numbers are valid JSON grammar; the engine serializes them as null.
    expect(minifyJson("[1e999]")).toEqual({ status: "ok", text: "[null]" })
  })
})

describe("JSON tree building", () => {
  const document = parseJson('{"user":{"name":"Ada","tags":["admin","dev"]},"count":3}')
  if (document.status !== "ok") throw new Error("expected ok")
  const value = document.value

  it("renders the root and expanded sections only", () => {
    const collapsed = buildJsonTree(value, new Set())
    expect(collapsed.entries).toHaveLength(1)
    expect(collapsed.entries[0]).toMatchObject({
      label: "root",
      path: "",
      type: "object",
      expandable: true,
      expanded: false,
    })

    const oneLevel = buildJsonTree(value, new Set([""]))
    expect(oneLevel.entries).toHaveLength(3)
    expect(oneLevel.entries.map((entry) => entry.label)).toEqual(["root", "user", "count"])
    expect(oneLevel.entries[1]).toMatchObject({ type: "object", expanded: false })

    const deep = buildJsonTree(value, new Set(["", "/user", "/user/tags"]))
    expect(deep.entries.map((entry) => entry.path)).toEqual([
      "",
      "/user",
      "/user/name",
      "/user/tags",
      "/user/tags/0",
      "/user/tags/1",
      "/count",
    ])
    expect(deep.entries[2]).toMatchObject({ type: "string", preview: '"Ada"' })
    expect(deep.entries[4]).toMatchObject({ type: "string", preview: '"admin"' })
    expect(deep.totalExpandable).toBe(3)
  })

  it("caps rendering for large documents", () => {
    const wide = parseJson(`[${Array.from({ length: 400 }, () => "[1,2,3]").join(",")}]`)
    if (wide.status !== "ok") throw new Error("expected ok")
    // Fully expanded tree far exceeds the render cap.
    const { paths } = allExpandablePaths(wide.value)
    const expanded = new Set(paths)
    const tree = buildJsonTree(wide.value, expanded)
    expect(tree.entries.length).toBe(maximumRenderedTreeNodes)
    expect(tree.capped).toBe(true)
  })

  it("bounds previews for long strings", () => {
    const longString = parseJson(`{"s":"${"x".repeat(500)}"}`)
    if (longString.status !== "ok") throw new Error("expected ok")
    const tree = buildJsonTree(longString.value, new Set([""]))
    expect(tree.entries[1]?.preview.length).toBeLessThanOrEqual(81)
    expect(tree.entries[1]?.preview.endsWith("…")).toBe(true)
  })

  it("stops expanding at the documented depth", () => {
    // A chain nested below the tree depth cap is still valid JSON.
    let deepValue: unknown = { leaf: true }
    for (let index = 0; index < 100; index++) deepValue = { nested: deepValue }
    const { paths } = allExpandablePaths(deepValue)
    const tree = buildJsonTree(deepValue, new Set(paths))
    expect(tree.capped).toBe(true)
    expect(tree.entries.every((entry) => entry.depth <= 64)).toBe(true)
  })
})

describe("expand-all limits", () => {
  it("refuses expand-all beyond the node cap", () => {
    const wide = parseJson(
      `[${Array.from({ length: maximumExpandAllNodes + 5 }, () => "[1]").join(",")}]`,
    )
    if (wide.status !== "ok") throw new Error("expected ok")
    const { paths, tooLarge } = allExpandablePaths(wide.value)
    expect(tooLarge).toBe(true)
    expect(paths.length).toBe(maximumExpandAllNodes)
  })

  it("collects every path for modest documents", () => {
    const modest = parseJson('{"a":{"b":[1]}}')
    if (modest.status !== "ok") throw new Error("expected ok")
    const result = allExpandablePaths(modest.value)
    expect(result).toEqual({ paths: ["", "/a", "/a/b"], tooLarge: false })
  })
})
