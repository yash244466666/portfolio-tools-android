import { describe, expect, it } from "vitest"
import {
  animationDelayBounds,
  animationDurationBounds,
  animationTypeOptions,
  buildAnimationCss,
  buildAnimationShorthand,
  getKeyframes,
  parseIterations,
  timingFunctionOptions,
} from "./animation"

describe("animation shorthand", () => {
  it("emits the default shorthand", () => {
    expect(
      buildAnimationShorthand({
        type: "fadeIn",
        duration: 1,
        delay: 0,
        iterations: 1,
        timing: "ease",
      }),
    ).toBe("animation: fadeIn 1s ease 0s 1;")
  })

  it("maps zero iterations to infinite", () => {
    expect(
      buildAnimationShorthand({
        type: "rotate",
        duration: 2,
        delay: 0.5,
        iterations: 0,
        timing: "linear",
      }),
    ).toBe("animation: rotate 2s linear 0.5s infinite;")
  })

  it("clamps duration and delay to the slider bounds", () => {
    expect(animationDurationBounds).toEqual({ min: 0.1, max: 5 })
    expect(animationDelayBounds).toEqual({ min: 0, max: 3 })
    expect(
      buildAnimationShorthand({
        type: "pulse",
        duration: 10,
        delay: 9,
        iterations: 1,
        timing: "ease-in-out",
      }),
    ).toBe("animation: pulse 5s ease-in-out 3s 1;")
    expect(
      buildAnimationShorthand({
        type: "pulse",
        duration: 0,
        delay: -1,
        iterations: 1,
        timing: "ease",
      }),
    ).toBe("animation: pulse 0.1s ease 0s 1;")
  })
})

describe("iteration parsing", () => {
  it("treats zero as infinite and keeps non-negative integers", () => {
    expect(parseIterations("0")).toBe(0)
    expect(parseIterations("3")).toBe(3)
  })

  it("falls back to one iteration for invalid text", () => {
    expect(parseIterations("abc")).toBe(1)
    expect(parseIterations("-2")).toBe(1)
    expect(parseIterations("2.5")).toBe(1)
    expect(parseIterations("")).toBe(1)
  })

  it("caps runaway iteration counts", () => {
    expect(parseIterations("99999")).toBe(1000)
  })
})

describe("animation CSS output", () => {
  it("combines the rule and matching keyframes", () => {
    expect(
      buildAnimationCss({
        type: "fadeIn",
        duration: 1,
        delay: 0,
        iterations: 1,
        timing: "ease",
      }),
    ).toBe(
      `.animated-element {
  animation: fadeIn 1s ease 0s 1;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
    )
  })

  it("exposes keyframes for every listed animation type", () => {
    for (const { id, label } of animationTypeOptions) {
      expect(getKeyframes(id)).toContain("@keyframes")
      expect(getKeyframes(id)).toContain("@keyframes")
      expect(label.length).toBeGreaterThan(0)
    }
    expect(getKeyframes("bounce")).toContain("translateY(-30px)")
    expect(timingFunctionOptions).toHaveLength(5)
  })
})
