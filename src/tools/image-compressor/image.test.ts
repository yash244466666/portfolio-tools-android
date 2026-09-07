import { describe, expect, it } from "vitest"
import {
  clampQuality,
  compressedFileName,
  defaultQuality,
  formatBytes,
  imageWidthOptions,
  isSupportedImageMimeType,
  isValidDecodedPixels,
  isValidInputSize,
  maximumDecodedPixels,
  maximumInputBytes,
  planOutputFormat,
  planResize,
  savingsPercent,
} from "./image"

describe("image input limits", () => {
  it("accepts bounded inputs and rejects empty or oversized ones", () => {
    expect(maximumInputBytes).toBe(16 * 1024 * 1024)
    expect(maximumDecodedPixels).toBe(24_000_000)
    expect(isValidInputSize(1)).toBe(true)
    expect(isValidInputSize(maximumInputBytes)).toBe(true)
    expect(isValidInputSize(0)).toBe(false)
    expect(isValidInputSize(maximumInputBytes + 1)).toBe(false)
  })

  it("bounds decoded pixels at 24 megapixels", () => {
    expect(isValidDecodedPixels(6000, 4000)).toBe(true) // 24 MP exactly
    expect(isValidDecodedPixels(6001, 4000)).toBe(false)
    expect(isValidDecodedPixels(0, 100)).toBe(false)
    expect(isValidDecodedPixels(100, 0)).toBe(false)
    expect(isValidDecodedPixels(-1, 5)).toBe(false)
  })

  it("accepts only the supported image types", () => {
    expect(isSupportedImageMimeType("image/png")).toBe(true)
    expect(isSupportedImageMimeType("image/jpeg")).toBe(true)
    expect(isSupportedImageMimeType("image/webp")).toBe(true)
    for (const unsupported of ["image/gif", "image/svg+xml", "image/avif", "text/plain"]) {
      expect(isSupportedImageMimeType(unsupported)).toBe(false)
    }
  })
})

describe("resize planning", () => {
  it("downscales wide images while preserving aspect ratio", () => {
    expect(planResize(3840, 2160, 1920)).toEqual({ width: 1920, height: 1080, resized: true })
    expect(planResize(4000, 1000, 1000)).toEqual({ width: 1000, height: 250, resized: true })
  })

  it("never upscales and keeps small images unchanged", () => {
    expect(planResize(800, 600, 1920)).toEqual({ width: 800, height: 600, resized: false })
    expect(planResize(1920, 1080, 1920)).toEqual({ width: 1920, height: 1080, resized: false })
  })

  it("keeps at least one pixel per side and rejects zero dimensions", () => {
    expect(planResize(0, 0, 1920)).toEqual({ width: 0, height: 0, resized: false })
    const plan = planResize(1, 10000, 800)
    expect(plan.width).toBe(1)
    expect(plan.height).toBeGreaterThanOrEqual(1)
  })

  it("offers the documented discrete width options", () => {
    expect(imageWidthOptions).toEqual([800, 1280, 1920, 2560])
  })
})

describe("output format planning", () => {
  it("keeps PNG lossless and re-encodes JPEG and WebP as JPEG", () => {
    expect(planOutputFormat("image/png")).toEqual({
      mimeType: "image/png",
      useQuality: false,
      extension: "png",
    })
    expect(planOutputFormat("image/jpeg")).toEqual({
      mimeType: "image/jpeg",
      useQuality: true,
      extension: "jpg",
    })
    expect(planOutputFormat("image/webp")).toEqual({
      mimeType: "image/jpeg",
      useQuality: true,
      extension: "jpg",
    })
  })

  it("derives a sanitized output name from the original", () => {
    expect(compressedFileName("photo.jpg", "jpg")).toBe("compressed-photo.jpg")
    expect(compressedFileName("weird.name.png", "png")).toBe("compressed-weird.name.png")
    expect(compressedFileName("", "jpg")).toBe("compressed-image.jpg")
    expect(compressedFileName(".hidden", "png")).toBe("compressed-image.png")
  })
})

describe("quality and reporting", () => {
  it("clamps the quality slider", () => {
    expect(clampQuality(0.8)).toBe(0.8)
    expect(clampQuality(0.05)).toBe(0.1)
    expect(clampQuality(2)).toBe(1)
    expect(clampQuality(Number.NaN)).toBe(defaultQuality)
  })

  it("formats byte sizes for display", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2048)).toBe("2.0 KB")
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB")
  })

  it("computes savings and treats zero-byte originals safely", () => {
    expect(savingsPercent(1000, 250)).toBe(75)
    expect(savingsPercent(1000, 1000)).toBe(0)
    expect(savingsPercent(1000, 2000)).toBe(-100)
    expect(savingsPercent(0, 100)).toBe(0)
  })
})
