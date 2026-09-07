import { describe, expect, it } from "vitest"
import {
  buildTextShadowDeclaration,
  buildTextShadowValue,
  createTextShadowLayer,
  maximumTextShadowLayers,
} from "./text-shadow"

describe("createTextShadowLayer", () => {
  it("carries the documented default layer values", () => {
    expect(createTextShadowLayer("layer-1")).toEqual({
      id: "layer-1",
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: "#6366f1",
    })
  })
})

describe("buildTextShadowDeclaration", () => {
  it("joins layers in paint order", () => {
    const first = createTextShadowLayer("a")
    const second = {
      ...createTextShadowLayer("b"),
      offsetX: -3,
      offsetY: 5,
      blur: 0,
      color: "#ff0000",
    }
    expect(buildTextShadowDeclaration([first, second])).toBe(
      "text-shadow: 2px 2px 4px #6366f1, -3px 5px 0px #ff0000;",
    )
  })

  it("emits a single-layer declaration", () => {
    expect(buildTextShadowDeclaration([createTextShadowLayer("only")])).toBe(
      "text-shadow: 2px 2px 4px #6366f1;",
    )
  })
})

describe("buildTextShadowValue", () => {
  it("strips the declaration prefix for the inline preview", () => {
    expect(buildTextShadowValue([createTextShadowLayer("only")])).toBe("2px 2px 4px #6366f1")
  })
})

describe("layer limit", () => {
  it("bounds the number of stackable layers", () => {
    expect(maximumTextShadowLayers).toBe(8)
  })
})
