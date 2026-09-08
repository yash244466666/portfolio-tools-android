import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  computeRmsLevel,
  createMicrophoneRecorderService,
  mapCaptureError,
  maximumRecordingBytes,
  maximumRecordingDurationMs,
  pickRecorderMimeType,
  validateRecordingOptions,
} from "./microphone-recorder"
import { PlatformError } from "@/platform/errors"

function fakeLifecycle() {
  const listeners: Array<(state: { active: boolean }) => void> = []
  return {
    current: () => ({ active: true }),
    subscribe: async (listener: (state: { active: boolean }) => void) => {
      listeners.push(listener)
      return () => {
        const index = listeners.indexOf(listener)
        if (index >= 0) listeners.splice(index, 1)
      }
    },
    goInactive: () => listeners.forEach((listener) => listener({ active: false })),
  }
}

/** Minimal MediaRecorder stand-in that emits fixed bytes on stop. */
class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = []
  static supported: string | null = "audio/webm;codecs=opus"
  static isTypeSupported(mimeType: string) {
    return FakeMediaRecorder.supported !== null && mimeType === FakeMediaRecorder.supported
  }

  mimeType: string
  state: "inactive" | "recording" = "inactive"
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: (() => void) | null = null
  #failOnStop = false

  constructor(_stream: MediaStream, options: { mimeType: string }) {
    this.mimeType = options.mimeType
    FakeMediaRecorder.instances.push(this)
  }

  start() {
    this.state = "recording"
    const chunk = new Blob([new Uint8Array(1024)], { type: this.mimeType })
    this.ondataavailable?.({ data: chunk })
  }

  failOnStop() {
    this.#failOnStop = true
  }

  errorMidTake() {
    this.onerror?.()
  }

  stop() {
    if (this.#failOnStop) {
      this.onerror?.()
      return
    }
    this.state = "inactive"
    // A real MediaRecorder emits the final dataavailable before onstop.
    this.ondataavailable?.({ data: new Blob([new Uint8Array(2048)], { type: this.mimeType }) })
    this.onstop?.()
  }
}

function fakeStream() {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
}

class FakeAudioContext {
  #node = { connect: vi.fn(), disconnect: vi.fn() }
  createMediaStreamSource = () => this.#node
  createAnalyser = () => ({
    fftSize: 1024,
    disconnect: vi.fn(),
    getFloatTimeDomainData: (buffer: Float32Array) => buffer.fill(0.25),
  })
  close = vi.fn().mockResolvedValue(undefined)
}

async function installFakes() {
  FakeMediaRecorder.instances = []
  FakeMediaRecorder.supported = "audio/webm;codecs=opus"
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder)
  vi.stubGlobal("AudioContext", FakeAudioContext)
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream()) },
    configurable: true,
  })
}

beforeEach(installFakes)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function newService() {
  const lifecycle = fakeLifecycle()
  return { lifecycle, service: createMicrophoneRecorderService({ lifecycle }) }
}

describe("microphone recorder policy helpers", () => {
  it("accepts bounds at the contract caps and rejects anything beyond", () => {
    expect(() =>
      validateRecordingOptions({
        maximumDurationMs: maximumRecordingDurationMs,
        maximumBytes: maximumRecordingBytes,
      }),
    ).not.toThrow()
    expect(() =>
      validateRecordingOptions({
        maximumDurationMs: maximumRecordingDurationMs + 1,
        maximumBytes: 1024,
      }),
    ).toThrow(PlatformError)
    expect(() =>
      validateRecordingOptions({
        maximumDurationMs: 1000,
        maximumBytes: maximumRecordingBytes + 1,
      }),
    ).toThrow(PlatformError)
    expect(() =>
      validateRecordingOptions({ maximumDurationMs: Number.NaN, maximumBytes: 1024 }),
    ).toThrow(PlatformError)
  })

  it("maps capture failures onto typed errors", () => {
    expect(mapCaptureError({ name: "NotAllowedError" }).code).toBe("MICROPHONE_PERMISSION_DENIED")
    expect(mapCaptureError({ name: "NotFoundError" }).code).toBe("MICROPHONE_UNAVAILABLE")
    expect(mapCaptureError({ name: "NotReadableError" }).code).toBe("MICROPHONE_UNAVAILABLE")
    expect(mapCaptureError(new Error("other")).code).toBe("RECORDING_FAILED")
  })

  it("picks opus first and rejects when nothing is supported", () => {
    expect(pickRecorderMimeType((type) => type.startsWith("audio/webm"))).toBe(
      "audio/webm;codecs=opus",
    )
    expect(pickRecorderMimeType((type) => type === "audio/webm")).toBe("audio/webm")
    expect(pickRecorderMimeType(() => false)).toBeNull()
  })

  it("computes bounded RMS levels", () => {
    expect(computeRmsLevel(new Float32Array(1024))).toBe(0)
    expect(computeRmsLevel(Float32Array.from({ length: 1024 }, () => 1))).toBe(1)
    expect(computeRmsLevel(Float32Array.from({ length: 1024 }, () => 0.2))).toBeLessThan(1)
    expect(computeRmsLevel(Float32Array.from({ length: 1024 }, () => 0.25))).toBe(1)
  })
})

describe("microphone recorder service", () => {
  it("starts, finalizes on stop, and derives duration from wall-clock anchors", async () => {
    const { service } = newService()
    const levels: number[] = []
    await service.start(
      { maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes },
      { onLevel: (level: number) => levels.push(level) },
    )
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(levels.length).toBeGreaterThan(0)
    const result = await service.stop()
    expect(result.finalReason).toBe("user")
    expect(result.mimeType).toBe("audio/webm;codecs=opus")
    expect(result.data.byteLength).toBe(3072) // 1024 during capture + 2048 on stop
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("finalizes (does not error) at the size limit and reports the reason", async () => {
    const { service } = newService()
    // Each start() chunk is 1024 bytes, so a 1-byte cap finalizes immediately.
    await service.start({ maximumDurationMs: 60_000, maximumBytes: 1 })
    const result = await service.stop()
    expect(result.finalReason).toBe("size-limit")
  })

  it("finalizes when the lifecycle goes inactive and releases the take to stop()", async () => {
    const { lifecycle, service } = newService()
    await service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes })
    lifecycle.goInactive()
    const result = await service.stop()
    expect(result.finalReason).toBe("interrupted")
    // The recorder's final dataavailable chunk is included in interrupted takes too.
    expect(result.data.byteLength).toBe(3072)
  })

  it("discards the take on cancel and allows a fresh start", async () => {
    const { service } = newService()
    await service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes })
    await service.cancel()
    await expect(service.stop()).rejects.toMatchObject({ code: "RECORDING_NOT_ACTIVE" })
    await expect(
      service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes }),
    ).resolves.toBeUndefined()
  })

  it("rejects a second start while recording", async () => {
    const { service } = newService()
    await service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes })
    await expect(
      service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes }),
    ).rejects.toMatchObject({ code: "RECORDING_ALREADY_ACTIVE" })
    await service.cancel()
  })

  it("surfaces the unsupported state when no MIME type can be recorded", async () => {
    FakeMediaRecorder.supported = null
    const { service } = newService()
    await expect(
      service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes }),
    ).rejects.toMatchObject({ code: "MICROPHONE_UNSUPPORTED" })
  })

  it("surfaces the denied state from getUserMedia rejection", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn().mockRejectedValue({ name: "NotAllowedError" }) },
      configurable: true,
    })
    const { service } = newService()
    await expect(
      service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes }),
    ).rejects.toMatchObject({ code: "MICROPHONE_PERMISSION_DENIED" })
  })

  it("rejects an empty recording instead of handing back zero bytes", async () => {
    const { service } = newService()
    await service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes })
    const recorder = FakeMediaRecorder.instances[0]
    if (!recorder) throw new Error("expected a recorder instance")
    recorder.failOnStop()
    await expect(service.stop()).rejects.toMatchObject({ code: "RECORDING_FAILED" })
  })

  it("delivers a limit-finalized take through onFinalized immediately", async () => {
    const { service } = newService()
    const finalized: { reason: string; bytes: number }[] = []
    await service.start(
      { maximumDurationMs: 60_000, maximumBytes: 1 },
      {
        onFinalized: (result) => {
          finalized.push({ reason: result.finalReason, bytes: result.data.byteLength })
        },
      },
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(finalized).toEqual([{ reason: "size-limit", bytes: 3072 }])
    // stop() still resolves with the same take for late callers.
    const result = await service.stop()
    expect(result.finalReason).toBe("size-limit")
  })

  it("labels an encoder failure as a failed take, not a user stop", async () => {
    const { service } = newService()
    await service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes })
    const recorder = FakeMediaRecorder.instances[0]
    if (!recorder) throw new Error("expected a recorder instance")
    recorder.errorMidTake()
    const result = await service.stop()
    expect(result.finalReason).toBe("failed")
  })

  it("does not brick the service when start throws synchronously after assignment", async () => {
    const { service } = newService()
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(fakeStream())
    // A recorder constructor failure after stream acquisition must leave no state.
    const brokenPrototype = MediaRecorder as unknown as { isTypeSupported?: unknown }
    brokenPrototype.isTypeSupported = () => true
    const RealFake = FakeMediaRecorder
    vi.stubGlobal(
      "MediaRecorder",
      class {
        constructor() {
          throw new Error("constructor exploded")
        }
      },
    )
    void RealFake
    await expect(
      service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes }),
    ).rejects.toBeInstanceOf(Error)
    vi.stubGlobal("MediaRecorder", RealFake)
    // Recovery: a subsequent start must work.
    await expect(
      service.start({ maximumDurationMs: 60_000, maximumBytes: maximumRecordingBytes }),
    ).resolves.toBeUndefined()
  })
})
