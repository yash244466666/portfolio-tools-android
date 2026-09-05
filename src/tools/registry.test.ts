import { tools } from "@/tools/registry"

describe("tool registry", () => {
  it("has stable unique identifiers", () => {
    const ids = tools.map((tool) => tool.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true)
  })

  it("does not mark a tool enabled without an implementation", () => {
    expect(tools.filter((tool) => tool.status === "enabled").every((tool) => tool.component)).toBe(
      true,
    )
  })

  it("labels all network behavior in metadata", () => {
    expect(tools.filter((tool) => tool.network).map((tool) => tool.id)).toEqual([
      "currency-converter",
    ])
  })
})
