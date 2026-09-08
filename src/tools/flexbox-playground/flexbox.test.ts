import { describe, expect, it } from "vitest"
import {
  alignItemsOptions,
  buildFlexContainerCss,
  clampFlexFactor,
  clampFlexGap,
  createFlexItem,
  flexGapBounds,
  justifyContentOptions,
  normalizeFlexBasis,
} from "./flexbox"

describe("flex container CSS", () => {
  it("emits the default declaration", () => {
    expect(
      buildFlexContainerCss({
        direction: "row",
        justifyContent: "flex-start",
        alignItems: "stretch",
        flexWrap: "nowrap",
        gap: 8,
      }),
    ).toBe(
      [
        "display: flex;",
        "flex-direction: row;",
        "justify-content: flex-start;",
        "align-items: stretch;",
        "flex-wrap: nowrap;",
        "gap: 8px;",
      ].join("\n"),
    )
  })

  it("passes every closed-list value through unchanged", () => {
    for (const direction of ["row", "row-reverse", "column", "column-reverse"] as const) {
      expect(
        buildFlexContainerCss({
          direction,
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 0,
        }),
      ).toContain(`flex-direction: ${direction};`)
    }
    expect(justifyContentOptions).toHaveLength(6)
    expect(alignItemsOptions).toHaveLength(5)
    expect(flexGapBounds).toEqual({ min: 0, max: 32 })
  })

  it("clamps the gap to the slider bounds", () => {
    expect(clampFlexGap(-5)).toBe(0)
    expect(clampFlexGap(50)).toBe(32)
    expect(clampFlexGap(8.4)).toBe(8)
    expect(clampFlexGap(Number.NaN)).toBe(0)
  })

  it("clamps grow and shrink factors", () => {
    expect(clampFlexFactor(7)).toBe(5)
    expect(clampFlexFactor(-2)).toBe(0)
    expect(clampFlexFactor(Number.NaN)).toBe(0)
  })
})

describe("flex item helpers", () => {
  it("creates default items with deterministic ids", () => {
    expect(createFlexItem(1)).toEqual({
      id: "flex-item-1",
      label: "Item 1",
      flexGrow: 0,
      flexShrink: 1,
      flexBasis: "auto",
    })
  })

  it("normalizes the flex-basis text input", () => {
    expect(normalizeFlexBasis("")).toBe("auto")
    expect(normalizeFlexBasis("  auto ")).toBe("auto")
    expect(normalizeFlexBasis("AUTO")).toBe("auto")
    expect(normalizeFlexBasis("0")).toBe("0")
    expect(normalizeFlexBasis("0px")).toBe("0")
    expect(normalizeFlexBasis("120px")).toBe("120px")
    expect(normalizeFlexBasis(" 50% ")).toBe("50%")
  })

  it("falls back to auto for out-of-range or arbitrary basis text", () => {
    expect(normalizeFlexBasis("-5px")).toBe("auto")
    expect(normalizeFlexBasis("2000px")).toBe("auto")
    expect(normalizeFlexBasis("150%")).toBe("auto")
    expect(normalizeFlexBasis("calc(100% - 2rem)")).toBe("auto")
    expect(normalizeFlexBasis(";} background:url(x)")).toBe("auto")
  })
})
