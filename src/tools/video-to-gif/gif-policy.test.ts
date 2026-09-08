import { describe, expect, it } from "vitest"
import {
  computeFramePlan,
  canExportOutput,
  exportCapNote,
  maximumExportBytes,
  maximumFrames,
  maximumInputBytes,
  maximumOutputBytes,
  maximumOutputWidth,
  overSizeMessage,
  resolveOutputDimensions,
  suggestedGifName,
  validateDuration,
  validateFps,
  validateOutputSize,
  validateOutputWidth,
  validatePickedVideo,
} from "./gif-policy"

describe("validatePickedVideo", () => {
  it("accepts video MIME types and video-looking names", () => {
    expect(validatePickedVideo({ mimeType: "video/mp4", size: 1024 })).toBeNull()
    expect(validatePickedVideo({ mimeType: "video/webm", size: 1024 })).toBeNull()
    expect(validatePickedVideo({ mimeType: "", size: 1024, name: "clip.mov" })).toBeNull()
  })

  it("rejects non-video files with a distinct invalid-MIME error", () => {
    const problem = validatePickedVideo({ mimeType: "image/png", size: 10 })
    expect(problem?.code).toBe("invalid-mime")
    expect(problem?.message).toMatch(/only video files/i)
  })

  it("rejects oversized picks with a distinct over-size error", () => {
    const problem = validatePickedVideo({ mimeType: "video/mp4", size: maximumInputBytes + 1 })
    expect(problem?.code).toBe("over-size")
    expect(problem?.message).toMatch(/16 MB/)
    expect(overSizeMessage).toBe(problem?.message)
  })
})

describe("validateOutputWidth", () => {
  it("accepts the 2-640 range and rejects outside values", () => {
    expect(validateOutputWidth(2)).toBeNull()
    expect(validateOutputWidth(640)).toBeNull()
    expect(validateOutputWidth(320)).toBeNull()
    expect(validateOutputWidth(0)).toMatch(/between 2 and 640/)
    expect(validateOutputWidth(641)).toMatch(/between 2 and 640/)
    expect(validateOutputWidth(Number.NaN)).toMatch(/between 2 and 640/)
  })
})

describe("validateDuration", () => {
  it("rejects NaN, Infinity, and non-positive durations", () => {
    expect(validateDuration(Number.NaN)).toMatch(/could not be read/i)
    expect(validateDuration(Number.POSITIVE_INFINITY)).toMatch(/could not be read/i)
    expect(validateDuration(0)).toMatch(/could not be read/i)
    expect(validateDuration(-1)).toMatch(/could not be read/i)
  })

  it("rejects durations above the take limit distinctly", () => {
    expect(validateDuration(31)).toMatch(/limited to 30 seconds/i)
    expect(validateDuration(30)).toBeNull()
  })
})

describe("validateFps", () => {
  it("accepts the 1-15 range and rejects outside values", () => {
    expect(validateFps(1)).toBeNull()
    expect(validateFps(15)).toBeNull()
    expect(validateFps(0)).toMatch(/between 1 and 15/)
    expect(validateFps(16)).toMatch(/between 1 and 15/)
    expect(validateFps(Number.NaN)).toMatch(/between 1 and 15/)
  })
})

describe("computeFramePlan", () => {
  it("computes the frame count and intervals for a normal take", () => {
    const plan = computeFramePlan(10, 5)
    expect(typeof plan).toBe("object")
    if (typeof plan !== "string") {
      expect(plan.frameCount).toBe(50)
      expect(plan.frameIntervalSeconds).toBeCloseTo(0.2)
      expect(plan.frameIntervalMs).toBeCloseTo(200)
    }
  })

  it("caps the frame count at the 100-frame limit and reports the truncation", () => {
    const plan = computeFramePlan(30, 15)
    expect(typeof plan).toBe("object")
    if (typeof plan !== "string") {
      expect(plan.frameCount).toBe(maximumFrames)
      expect(plan.truncated).toBe(true)
      expect(plan.includedSeconds).toBeCloseTo(maximumFrames / 15)
    }
  })

  it("marks a plan that fits the frame budget as not truncated", () => {
    const plan = computeFramePlan(10, 5)
    expect(typeof plan).toBe("object")
    if (typeof plan !== "string") {
      expect(plan.truncated).toBe(false)
      expect(plan.includedSeconds).toBeCloseTo(10)
    }
  })

  it("rejects a plan that would produce zero frames with raised-fps advice", () => {
    const plan = computeFramePlan(0.05, 15)
    expect(typeof plan).toBe("string")
    if (typeof plan === "string") {
      expect(plan).toMatch(/too short/i)
      expect(plan).toMatch(/raise the frame rate/i)
    }
  })

  it("propagates duration and fps validation", () => {
    expect(typeof computeFramePlan(Number.NaN, 5)).toBe("string")
    expect(typeof computeFramePlan(10, 99)).toBe("string")
  })
})

describe("resolveOutputDimensions", () => {
  it("preserves the aspect ratio and evens the dimensions", () => {
    expect(resolveOutputDimensions(1280, 720, 320)).toEqual({ width: 320, height: 180 })
    // 40 x 21 aspect at width 40 rounds to an odd height that must be evens.
    expect(resolveOutputDimensions(100, 53, 40)).toEqual({ width: 40, height: 20 })
  })

  it("clamps the requested width to the tool maximum", () => {
    expect(resolveOutputDimensions(1920, 1080, 9999)).toEqual({
      width: maximumOutputWidth,
      height: 360,
    })
  })

  it("rejects unreadable video dimensions", () => {
    expect(typeof resolveOutputDimensions(0, 0, 320)).toBe("string")
    expect(typeof resolveOutputDimensions(Number.NaN, 720, 320)).toBe("string")
  })

  it("falls back to the default width for non-finite requests", () => {
    const dims = resolveOutputDimensions(1280, 720, Number.NaN)
    expect(typeof dims).toBe("object")
    if (typeof dims !== "string") expect(dims.width).toBe(320)
  })
})

describe("output and export limits", () => {
  it("reports over-limit output distinctly", () => {
    expect(validateOutputSize(maximumOutputBytes)).toBeNull()
    expect(validateOutputSize(maximumOutputBytes + 1)).toMatch(/32 MB/)
  })

  it("bounds exports by the 5 MB Save As bridge", () => {
    expect(canExportOutput(maximumExportBytes)).toBe(true)
    expect(canExportOutput(maximumExportBytes + 1)).toBe(false)
    expect(exportCapNote).toMatch(/5 MB/)
  })
})

describe("suggestedGifName", () => {
  it("strips the source extension and appends .gif", () => {
    expect(suggestedGifName("holiday clip.MP4")).toBe("holiday clip.gif")
  })

  it("sanitizes separators and unsafe characters", () => {
    expect(suggestedGifName("folder/subdir/name.webm")).toBe("folder-subdir-name.gif")
    expect(suggestedGifName("a<b>?c.mov")).toBe("a-b-c.gif")
  })

  it("falls back when nothing usable remains", () => {
    expect(suggestedGifName("...")).toBe("yash-tools-output.gif")
  })
})
