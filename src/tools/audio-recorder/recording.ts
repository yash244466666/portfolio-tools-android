/**
 * Pure recording-policy helpers for the Audio Recorder tool.
 *
 * The recorded design caps takes at 10 minutes and 32 MiB (the platform
 * contract clamps to the same caps). Generated-file export crosses the
 * platform Save As bridge, whose own hard cap is 5 MiB per file, so the
 * tool discloses and enforces that ceiling on export instead of letting
 * the platform reject the write.
 */

import { maximumBridgeGeneratedFileBytes } from "@/platform/shared/files"
import {
  maximumRecordingBytes,
  maximumRecordingDurationMs,
} from "@/platform/shared/microphone-recorder"

// Tool-level aliases of the contract caps, so the policy has one source.
export const maximumTakeDurationMs = maximumRecordingDurationMs
export const maximumTakeBytes = maximumRecordingBytes

export type ExportFormat = "webm" | "wav"

/** Number of 16-bit PCM samples (per channel) a WAV export of a take needs. */
export function wavSampleCount(durationMs: number, sampleRate: number): number {
  if (
    !Number.isFinite(durationMs) ||
    durationMs < 0 ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0
  ) {
    return 0
  }
  return Math.ceil((durationMs / 1000) * sampleRate)
}

export function wavEncodedBytes(sampleCount: number): number {
  // 44-byte RIFF header + mono 16-bit PCM payload.
  return 44 + Math.max(0, sampleCount) * 2
}

/** True when a take of this duration can be exported as 16-bit mono WAV. */
export function canExportWav(durationMs: number, sampleRate = 44100): boolean {
  return wavEncodedBytes(wavSampleCount(durationMs, sampleRate)) <= maximumBridgeGeneratedFileBytes
}

/** True when the recorded take itself fits the export bridge cap. */
export function canExportTake(takeBytes: number): boolean {
  return (
    Number.isSafeInteger(takeBytes) && takeBytes > 0 && takeBytes <= maximumBridgeGeneratedFileBytes
  )
}

/** Display filename for an export; never derived from user input. */
export function exportFileName(format: ExportFormat, takenAtMs: number): string {
  const date = new Date(takenAtMs)
  const pad = (value: number) => String(value).padStart(2, "0")
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `recording-${stamp}.${format}`
}

const takeFormatLabels: Record<string, string> = {
  "audio/webm;codecs=opus": "WebM (Opus)",
  "audio/webm": "WebM",
}

/** Honest display label for the take's actual container/codec. */
export function takeFormatLabel(mimeType: string): string {
  return takeFormatLabels[mimeType] ?? mimeType
}

/** mm:ss display for the in-progress timer and the finalized take. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

/** Maps a finalized take onto a plain-language status line (non-color cue). */
export function finalReasonLabel(reason: string): string {
  switch (reason) {
    case "duration-limit":
      return "Recording stopped automatically at the 10-minute limit."
    case "size-limit":
      return "Recording stopped automatically at the 32 MB size limit."
    case "interrupted":
      return "Recording stopped because the app left the foreground."
    case "failed":
      return "Recording stopped early because of a recording error. The take may be incomplete."
    default:
      return "Recording saved."
  }
}
