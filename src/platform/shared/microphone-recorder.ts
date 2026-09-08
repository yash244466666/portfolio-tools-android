import type {
  LifecycleService,
  MicrophoneRecorderService,
  RecordingFinalReason,
  RecordingResult,
  RecordingStartOptions,
} from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"

/**
 * Shared MicrophoneRecorderService implementation used by both platform
 * adapters. Capture happens entirely inside the WebView through the standard
 * getUserMedia/MediaRecorder pipeline; the Capacitor bridge maps the WebView
 * AUDIO_CAPTURE request to the runtime RECORD_AUDIO + MODIFY_AUDIO_SETTINGS
 * permission dialog (no CAMERA involvement for audio-only capture).
 *
 * Recording is foreground-only: the lifecycle subscription finalizes the take
 * when the platform reports inactive, releasing the microphone before the
 * Activity leaves the foreground. Nothing is persisted; the finalized bytes
 * exist only in memory until the tool exports them through the FileService.
 */

/** Contract-level caps; tools may pass smaller bounds, never larger ones. */
export const maximumRecordingDurationMs = 10 * 60 * 1000
export const maximumRecordingBytes = 32 * 1024 * 1024
/** The GIF-style floor: the shortest take that still produces a valid file. */
const minimumRecordingDurationMs = 0

export interface RecordingOptionsPolicy {
  maximumDurationMs: number
  maximumBytes: number
}

/** Pure validation of start options against the contract caps. */
export function validateRecordingOptions(options: RecordingOptionsPolicy): RecordingOptionsPolicy {
  const { maximumDurationMs: duration, maximumBytes: bytes } = options
  if (
    !Number.isFinite(duration) ||
    !Number.isSafeInteger(duration) ||
    duration <= minimumRecordingDurationMs ||
    duration > maximumRecordingDurationMs
  ) {
    throw new PlatformError(
      "RECORDING_INVALID_ARGUMENT",
      "The recording duration limit is invalid.",
    )
  }
  if (
    !Number.isFinite(bytes) ||
    !Number.isSafeInteger(bytes) ||
    bytes <= 0 ||
    bytes > maximumRecordingBytes
  ) {
    throw new PlatformError("RECORDING_INVALID_ARGUMENT", "The recording size limit is invalid.")
  }
  return { maximumDurationMs: duration, maximumBytes: bytes }
}

/** Maps a getUserMedia/MediaRecorder failure onto the typed error model. */
export function mapCaptureError(error: unknown): PlatformError {
  if (error instanceof PlatformError) return error
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name)
      : ""
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return new PlatformError(
        "MICROPHONE_PERMISSION_DENIED",
        "Microphone access was denied. Allow it in system settings for this app and try again.",
        true,
        error,
      )
    case "NotFoundError":
    case "OverconstrainedError":
      return new PlatformError(
        "MICROPHONE_UNAVAILABLE",
        "No microphone is available on this device.",
        true,
        error,
      )
    case "NotReadableError":
    case "AbortError":
      return new PlatformError(
        "MICROPHONE_UNAVAILABLE",
        "The microphone could not be started. Close other apps using it and try again.",
        true,
        error,
      )
    default:
      return new PlatformError(
        "RECORDING_FAILED",
        "Recording could not be started on this device.",
        true,
        error,
      )
  }
}

/** Chooses the best supported recording MIME type; null when none exists. */
export function pickRecorderMimeType(
  isTypeSupported: (mimeType: string) => boolean,
): string | null {
  for (const mimeType of ["audio/webm;codecs=opus", "audio/webm"]) {
    if (isTypeSupported(mimeType)) return mimeType
  }
  return null
}

/** Pure RMS level (0..1) from an analyser time-domain sample. */
export function computeRmsLevel(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i] ?? 0
    sum += sample * sample
  }
  const rms = Math.sqrt(sum / Math.max(1, samples.length))
  return Math.min(1, rms * 4)
}

interface RecorderState {
  stream: MediaStream
  recorder: MediaRecorder
  audioContext: AudioContext
  analyser: AnalyserNode
  source: MediaStreamAudioSourceNode
  chunks: Blob[]
  bytes: number
  startedAtWallClock: number
  durationTimer: number | null
  levelTimer: number | null
  lifecycleUnsubscribe: (() => void) | null
  options: RecordingStartOptions
  onLevel: ((level: number) => void) | undefined
  finalized: boolean
  result: Promise<RecordingResult> | null
}

export interface MicrophoneRecorderDeps {
  lifecycle: LifecycleService
}

export function createMicrophoneRecorderService(
  deps: MicrophoneRecorderDeps,
): MicrophoneRecorderService {
  let state: RecorderState | null = null
  // Set while a finalize is completing after the state was torn down, so a
  // late stop() still resolves with the finalized take instead of erroring.
  let lastResult: Promise<RecordingResult> | null = null

  function teardown(state: RecorderState): void {
    if (state.durationTimer !== null) window.clearInterval(state.durationTimer)
    if (state.levelTimer !== null) window.clearInterval(state.levelTimer)
    state.lifecycleUnsubscribe?.()
    state.lifecycleUnsubscribe = null
    try {
      state.source.disconnect()
      state.analyser.disconnect()
    } catch {
      // Nodes are already detached when the context is closing.
    }
    void state.audioContext.close().catch(() => undefined)
    state.stream.getTracks().forEach((track) => track.stop())
  }

  function finalize(state: RecorderState, reason: RecordingFinalReason): void {
    if (state.finalized) return
    state.finalized = true
    teardown(state)

    const recorder = state.recorder
    const chunks = state.chunks
    const startedAtWallClock = state.startedAtWallClock
    const mimeType = recorder.mimeType || "audio/webm"

    state.result = new Promise<RecordingResult>((resolve, reject) => {
      const finish = () => {
        const blob = new Blob(chunks, { type: mimeType })
        if (blob.size === 0) {
          reject(
            new PlatformError("RECORDING_FAILED", "The recording was empty and was discarded."),
          )
          return
        }
        blob
          .arrayBuffer()
          .then((data) => {
            resolve({
              data,
              mimeType,
              durationMs: Math.max(0, Date.now() - startedAtWallClock),
              finalReason: reason,
            })
          })
          .catch(() => {
            reject(
              new PlatformError(
                "RECORDING_FAILED",
                "The recording could not be finalized. Please try again.",
              ),
            )
          })
      }
      if (recorder.state === "inactive") {
        finish()
        return
      }
      recorder.onstop = finish
      recorder.onerror = () => {
        reject(
          new PlatformError(
            "RECORDING_FAILED",
            "The recording failed and was discarded. Please try again.",
          ),
        )
      }
      try {
        recorder.stop()
      } catch (error) {
        reject(mapCaptureError(error))
      }
    })
    lastResult = state.result
  }

  return {
    async start(options, onLevel) {
      if (state && !state.finalized) {
        throw new PlatformError("RECORDING_ALREADY_ACTIVE", "A recording is already in progress.")
      }
      state = null
      lastResult = null
      const policy = validateRecordingOptions(options)

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new PlatformError(
          "MICROPHONE_UNSUPPORTED",
          "This device or browser does not support microphone capture.",
        )
      }

      const recorderPrototype = MediaRecorder as unknown as {
        isTypeSupported?: (mimeType: string) => boolean
      }
      const mimeType =
        typeof recorderPrototype.isTypeSupported === "function"
          ? pickRecorderMimeType(recorderPrototype.isTypeSupported.bind(recorderPrototype))
          : null
      if (!mimeType) {
        throw new PlatformError(
          "MICROPHONE_UNSUPPORTED",
          "This device cannot encode audio recordings in a supported format.",
        )
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (error) {
        throw mapCaptureError(error)
      }

      try {
        const recorder = new MediaRecorder(stream, { mimeType })
        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 1024
        source.connect(analyser)

        const next: RecorderState = {
          stream,
          recorder,
          audioContext,
          analyser,
          source,
          chunks: [],
          bytes: 0,
          startedAtWallClock: Date.now(),
          durationTimer: null,
          levelTimer: null,
          lifecycleUnsubscribe: null,
          options: policy,
          onLevel,
          finalized: false,
          result: null,
        }
        state = next

        recorder.ondataavailable = (event) => {
          if (event.data.size <= 0) return
          next.chunks.push(event.data)
          next.bytes += event.data.size
          if (next.bytes >= next.options.maximumBytes) {
            finalize(next, "size-limit")
          }
        }
        recorder.onerror = () => finalize(next, "user")

        // Duration and size limits finalize (never error) per the recorded design.
        const remaining = Math.max(0, policy.maximumDurationMs)
        next.durationTimer = window.setInterval(() => {
          if (Date.now() - next.startedAtWallClock >= remaining) {
            finalize(next, "duration-limit")
          }
        }, 200)

        if (onLevel) {
          const buffer = new Float32Array(analyser.fftSize)
          next.levelTimer = window.setInterval(() => {
            analyser.getFloatTimeDomainData(buffer)
            onLevel(computeRmsLevel(buffer))
          }, 100)
        }

        // Foreground-only: finalize (never drop) when the app leaves the foreground.
        deps.lifecycle
          .subscribe((lifecycleState) => {
            if (!lifecycleState.active && state === next && !next.finalized) {
              finalize(next, "interrupted")
            }
          })
          .then((unsubscribe) => {
            if (next.finalized) {
              void unsubscribe()
            } else {
              next.lifecycleUnsubscribe = () => void unsubscribe()
            }
          })
          .catch(() => {
            // Without a lifecycle source the take still ends on Stop or the limits.
          })

        recorder.start(250)
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop())
        if (error instanceof PlatformError) throw error
        throw mapCaptureError(error)
      }
    },

    async stop() {
      const current = state
      if (current && current.result) {
        const result = current.result
        state = null
        return result
      }
      if (lastResult && !current) {
        const result = lastResult
        lastResult = null
        return result
      }
      if (!current) {
        throw new PlatformError("RECORDING_NOT_ACTIVE", "No recording is in progress.")
      }
      finalize(current, "user")
      state = null
      return current.result as Promise<RecordingResult>
    },

    async cancel() {
      const current = state
      if (!current) return
      state = null
      lastResult = null
      if (!current.finalized) {
        current.finalized = true
        try {
          if (current.recorder.state !== "inactive") current.recorder.stop()
        } catch {
          // The recorder is already gone; the tracks below release the mic.
        }
      }
      teardown(current)
    },
  }
}
