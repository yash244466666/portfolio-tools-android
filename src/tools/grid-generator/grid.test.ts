import { describe, expect, it } from "vitest"
import { buildGridContainerCss, buildGridCss, buildGridPlacementCss, clampGridGap } from "./grid"

describe("grid container CSS", () => {
  it("emits the default template declaration", () => {
    expect(buildGridContainerCss({ columns: "1fr 1fr 1fr", rows: "auto", gap: 8 })).toBe(
      [
        "display: grid;",
        "grid-template-columns: 1fr 1fr 1fr;",
        "grid-template-rows: auto;",
        "gap: 8px;",
      ].join("\n"),
    )
  })

  it("skips an emptied template instead of emitting a dangling declaration", () => {
    expect(buildGridContainerCss({ columns: "1fr", rows: "   ", gap: 0 })).toBe(
      "display: grid;\ngrid-template-columns: 1fr;\ngap: 0px;",
    )
    expect(buildGridContainerCss({ columns: "", rows: "auto", gap: 0 })).toBe(
      "display: grid;\ngrid-template-rows: auto;\ngap: 0px;",
    )
  })

  it("clamps the gap to the slider bounds", () => {
    expect(clampGridGap(-1)).toBe(0)
    expect(clampGridGap(99)).toBe(32)
  })
})

describe("grid placement CSS", () => {
  it("emits only the placements that override auto", () => {
    expect(
      buildGridPlacementCss([
        { label: "Item 1", column: "1 / 3", row: "auto" },
        { label: "Item 2", column: "auto", row: "2" },
        { label: "Item 3", column: "auto", row: "auto" },
      ]),
    ).toBe("/* Item 1 */ grid-column: 1 / 3;\n/* Item 2 */ grid-row: 2;")
  })

  it("treats whitespace-only placements as auto", () => {
    expect(buildGridPlacementCss([{ label: "Item 1", column: "  ", row: " " }])).toBe("")
  })
})

describe("combined grid CSS", () => {
  it("appends placement lines after the container", () => {
    expect(
      buildGridCss({ columns: "repeat(2, 1fr)", rows: "auto", gap: 8 }, [
        { label: "Item 1", column: "1 / 3", row: "auto" },
      ]),
    ).toBe(
      [
        "display: grid;",
        "grid-template-columns: repeat(2, 1fr);",
        "grid-template-rows: auto;",
        "gap: 8px;",
        "/* Item 1 */ grid-column: 1 / 3;",
      ].join("\n"),
    )
  })

  it("returns container-only CSS when nothing is placed", () => {
    expect(buildGridCss({ columns: "1fr", rows: "1fr", gap: 0 }, [])).toBe(
      "display: grid;\ngrid-template-columns: 1fr;\ngrid-template-rows: 1fr;\ngap: 0px;",
    )
  })
})
