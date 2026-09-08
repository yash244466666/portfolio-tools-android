import { describe, expect, it } from "vitest"
import {
  canExportTake,
  canExportWav,
  exportFileName,
  finalReasonLabel,
  formatDuration,
  maximumTakeBytes,
  maximumTakeDurationMs,
  takeFormatLabel,
  wavEncodedBytes,
  wavSampleCount,
} from "./recording"
import { maximumBridgeGeneratedFileBytes } from "@/platform/shared/files"

describe("recording policy", () => {
  it("keeps the recorded design limits", () => {
    expect(maximumTakeDurationMs).toBe(600_000)
    expect(maximumTakeBytes).toBe(32 * 1024 * 1024)
  })

  it("computes WAV sizes from duration and sample rate", () => {
    expect(wavSampleCount(1000, 44100)).toBe(44100)
    expect(wavSampleCount(0, 44100)).toBe(0)
    expect(wavSampleCount(-1, 44100)).toBe(0)
    expect(wavSampleCount(1000, 0)).toBe(0)
    expect(wavEncodedBytes(0)).toBe(44)
    expect(wavEncodedBytes(100)).toBe(244)
  })

  it("bounds WAV export by the platform bridge cap", () => {
    // 5 MiB / (2 bytes per sample * 44100 Hz) ≈ 59.2 seconds.
    const limitSeconds = (maximumBridgeGeneratedFileBytes - 44) / 2 / 44100
    expect(canExportWav(Math.floor(limitSeconds * 1000))).toBe(true)
    expect(canExportWav(Math.ceil((limitSeconds + 1) * 1000))).toBe(false)
    expect(canExportWav(0)).toBe(true)
  })

  it("bounds take export by the platform bridge cap", () => {
    expect(canExportTake(maximumBridgeGeneratedFileBytes)).toBe(true)
    expect(canExportTake(maximumBridgeGeneratedFileBytes + 1)).toBe(false)
    expect(canExportTake(0)).toBe(false)
    expect(canExportTake(Number.NaN)).toBe(false)
  })

  it("formats export filenames from the taken-at clock only", () => {
    const at = new Date(2026, 8, 8, 13, 4, 5).getTime()
    expect(exportFileName("webm", at)).toBe("recording-20260908-130405.webm")
    expect(exportFileName("wav", at)).toBe("recording-20260908-130405.wav")
  })

  it("formats durations as mm:ss without rounding up", () => {
    expect(formatDuration(0)).toBe("00:00")
    expect(formatDuration(65_400)).toBe("01:05")
    expect(formatDuration(600_000)).toBe("10:00")
    expect(formatDuration(-5)).toBe("00:00")
  })

  it("labels actual container/codec and final reasons honestly", () => {
    expect(takeFormatLabel("audio/webm;codecs=opus")).toBe("WebM (Opus)")
    expect(takeFormatLabel("audio/webm")).toBe("WebM")
    expect(takeFormatLabel("audio/unknown")).toBe("audio/unknown")
    expect(finalReasonLabel("duration-limit")).toContain("10-minute")
    expect(finalReasonLabel("size-limit")).toContain("32 MB")
    expect(finalReasonLabel("interrupted")).toContain("left the foreground")
    expect(finalReasonLabel("user")).toBe("Recording saved.")
  })
})
