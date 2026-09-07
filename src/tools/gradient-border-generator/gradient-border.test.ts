import { describe, expect, it } from "vitest"
import {
  buildGradientBorderCss,
  buildGradientBorderPreviewStyles,
  defaultGradientBorderInput,
} from "./gradient-border"

describe("buildGradientBorderCss", () => {
  it("matches the documented snippet for the default input", () => {
    expect(buildGradientBorderCss(defaultGradientBorderInput)).toBe(
      `.gradient-border {
  position: relative;
  background: hsl(0 0% 100%);
  border-radius: 12px;
  padding: 1rem;
}

.gradient-border::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 12px;
  padding: 3px;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}`,
    )
  })

  it("interpolates every knob", () => {
    const css = buildGradientBorderCss({
      startColor: "#ff0000",
      endColor: "#00ff00",
      angle: 0,
      borderWidth: 20,
      borderRadius: 0,
    })
    expect(css).toContain("border-radius: 0px;")
    expect(css).toContain("padding: 20px;")
    expect(css).toContain("background: linear-gradient(0deg, #ff0000, #00ff00);")
  })
})

describe("buildGradientBorderPreviewStyles", () => {
  it("paints the gradient ring with the same knobs", () => {
    const { outer, inner } = buildGradientBorderPreviewStyles(defaultGradientBorderInput)
    expect(outer.background).toBe("linear-gradient(135deg, #6366f1, #06b6d4)")
    expect(outer.borderRadius).toBe("12px")
    expect(outer.padding).toBe("3px")
    expect(inner.borderRadius).toBe("9px")
  })

  it("never produces a negative inner radius", () => {
    const { inner } = buildGradientBorderPreviewStyles({
      ...defaultGradientBorderInput,
      borderWidth: 20,
      borderRadius: 5,
    })
    expect(inner.borderRadius).toBe("0px")
  })
})
