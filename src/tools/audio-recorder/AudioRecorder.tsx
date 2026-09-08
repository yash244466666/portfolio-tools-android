import { useEffect, useRef, useState } from "react"
import { Mic, Square, Download, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ToolPanel } from "@/components/ui/ToolPanel"
import type { RecordingResult } from "@/platform/contracts"
import { isCancellationError, PlatformError, toSafeErrorMessage } from "@/platform/errors"
import { usePlatform } from "@/platform/platform-context"
import { maximumBridgeGeneratedFileBytes, bytesToBase64 } from "@/platform/shared/files"
import {
  maximumRecordingBytes,
  maximumRecordingDurationMs,
} from "@/platform/shared/microphone-recorder"
import {
  canExportTake,
  exportFileName,
  finalReasonLabel,
  formatDuration,
  takeFormatLabel,
} from "./recording"
import { downmixToMono, encodeWav } from "./wav-encoder"

type Phase = "initial" | "starting" | "recording" | "finalizing" | "done"

interface DoneTake {
  result: Pick<RecordingResult, "data" | "mimeType" | "durationMs" | "finalReason">
  bytes: number
  takenAtMs: number
}

const levelBars = 28
const maximumExportBytesNote =
  "Exports are capped at 5 MB per file. Longer takes stay playable here but cannot be exported in this version."

export default function AudioRecorder() {
  const { microphone, files, lifecycle } = usePlatform()
  const [phase, setPhase] = useState<Phase>("initial")
  const [errorState, setErrorState] = useState<{ kind: string; message: string } | null>(null)
  const [take, setTake] = useState<DoneTake | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: levelBars }, () => 0.04),
  )
  const [elapsedMs, setElapsedMs] = useState(0)
  const [busy, setBusy] = useState(false)
  const [exportNote, setExportNote] = useState<string | null>(null)

  const startAnchorRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>("initial")
  const busyRef = useRef(false)
  const stopRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    phaseRef.current = phase
    busyRef.current = busy
  }, [phase, busy])

  // Release the preview object URL on every replacement and unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Display interval only; the finalized duration always comes from the
  // service's wall-clock anchor (ADR 0014 pattern).
  useEffect(() => {
    if (phase !== "recording") return
    const tick = () => {
      if (startAnchorRef.current !== null) {
        setElapsedMs(Date.now() - startAnchorRef.current)
      }
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [phase])

  function finishTake(result: RecordingResult, takenAtMs: number) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(new Blob([result.data], { type: result.mimeType }))
    setPreviewUrl(url)
    setTake({ result, bytes: result.data.byteLength, takenAtMs })
    setPhase("done")
    setExportNote(null)
  }

  async function handleStop() {
    if (phaseRef.current !== "recording") return
    setPhase("finalizing")
    setBusy(true)
    try {
      const result = await microphone.stop()
      finishTake(result, Date.now())
    } catch (error) {
      setErrorState({ kind: "failed", message: toSafeErrorMessage(error) })
      setPhase("initial")
    } finally {
      setBusy(false)
      startAnchorRef.current = null
    }
  }

  // Keep the lifecycle handler pointed at the latest stop function.
  useEffect(() => {
    stopRef.current = handleStop
  })

  // Cancel expensive work when navigating away: an in-app unmount must
  // release the microphone immediately (section 21/26 cleanup rules).
  useEffect(() => {
    return () => {
      void microphone.cancel()
    }
  }, [microphone])

  // Foreground-only: the service finalizes the take when the app leaves the
  // foreground; the tool retrieves it so the user finds it instead of losing it.
  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    const run = async () => {
      const off = await lifecycle.subscribe((state) => {
        if (state.active) return
        if (phaseRef.current === "recording" && !busyRef.current) {
          void stopRef.current()
        }
      })
      if (cancelled) void off()
      else unsubscribe = () => void off()
    }
    void run()
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [lifecycle])

  async function handleStart() {
    setErrorState(null)
    setExportNote(null)
    setBusy(true)
    setPhase("starting")
    setLevels(Array.from({ length: levelBars }, () => 0.04))
    try {
      await microphone.start(
        {
          maximumDurationMs: maximumRecordingDurationMs,
          maximumBytes: maximumRecordingBytes,
        },
        {
          onLevel: (level) => {
            setLevels((previous) => [...previous.slice(1), Math.max(0.04, Math.min(1, level))])
          },
          onFinalized: (result) => {
            finishTake(result, Date.now())
          },
        },
      )
      startAnchorRef.current = Date.now()
      setElapsedMs(0)
      setPhase("recording")
    } catch (error) {
      const message = toSafeErrorMessage(error)
      const kind =
        error instanceof PlatformError
          ? ({
              MICROPHONE_PERMISSION_DENIED: "denied",
              MICROPHONE_UNAVAILABLE: "unavailable",
              MICROPHONE_UNSUPPORTED: "unsupported",
            }[error.code as string] ?? "failed")
          : "failed"
      setErrorState({ kind, message })
      setPhase("initial")
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    setBusy(true)
    try {
      await microphone.cancel()
      setPhase("initial")
      setElapsedMs(0)
      startAnchorRef.current = null
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl("")
    setTake(null)
    setPhase("initial")
    setElapsedMs(0)
    setErrorState(null)
    setExportNote(null)
  }

  async function exportWebm() {
    if (!take) return
    setBusy(true)
    setExportNote(null)
    try {
      if (!canExportTake(take.bytes)) {
        setExportNote(maximumExportBytesNote)
        return
      }
      await files.saveAs({
        name: exportFileName("webm", take.takenAtMs),
        mimeType: take.result.mimeType,
        data: bytesToBase64(new Uint8Array(take.result.data)),
        encoding: "base64",
      })
      setExportNote("Recording exported.")
    } catch (error) {
      setExportNote(toSafeErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function exportWav() {
    if (!take) return
    setBusy(true)
    setExportNote(null)
    try {
      const context = new AudioContext()
      let wav: Uint8Array
      try {
        // decodeAudioData may detach its input, so decode a copy and keep the
        // take intact for a later WebM export; the context resamples to its
        // own sample rate, so the header must record that rate, not a constant.
        const decoded = await context.decodeAudioData(take.result.data.slice(0))
        wav = encodeWav(downmixToMono(decoded), context.sampleRate)
      } finally {
        void context.close().catch(() => undefined)
      }
      if (wav.byteLength > maximumBridgeGeneratedFileBytes) {
        setExportNote(maximumExportBytesNote)
        return
      }
      await files.saveAs({
        name: exportFileName("wav", take.takenAtMs),
        mimeType: "audio/wav",
        data: bytesToBase64(wav),
        encoding: "base64",
      })
      setExportNote("WAV export saved.")
    } catch (error) {
      if (isCancellationError(error)) {
        setExportNote("Save cancelled.")
      } else {
        setExportNote(
          "This recording could not be converted to WAV on this device. Export the original WebM instead.",
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const recording = phase === "recording" || phase === "starting" || phase === "finalizing"
  const takeExportable = take !== null && canExportTake(take.bytes)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Recorder">
        <div aria-hidden="true" className="flex h-16 items-end justify-center gap-[3px]">
          {levels.map((level, index) => (
            <div
              key={index}
              className="h-full w-1.5 origin-bottom rounded-full bg-[var(--primary)] transition-transform duration-[var(--motion-quick)]"
              style={{ transform: `scaleY(${Math.min(1, Math.max(0, 0.06 + level * 0.9))})` }}
            />
          ))}
        </div>
        <p
          className="mt-3 text-center font-mono text-4xl tabular-nums leading-none"
          role="timer"
          aria-label="Elapsed recording time"
        >
          {formatDuration(phase === "recording" ? elapsedMs : (take?.result.durationMs ?? 0))}
        </p>
        <p
          aria-live="polite"
          role="status"
          className="mt-2 text-center text-sm text-[var(--text-secondary)]"
        >
          {phase === "starting" && "Starting microphone…"}
          {phase === "recording" && "Recording — audio stays on this device"}
          {phase === "finalizing" && "Finishing the recording…"}
          {phase === "done" && take && finalReasonLabel(take.result.finalReason)}
          {phase === "initial" &&
            (errorState
              ? "Microphone recording is unavailable right now. Follow the recovery steps above."
              : "Microphone recording is offline-only. Nothing is stored or sent anywhere.")}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {!recording && phase !== "done" && (
            <Button onClick={() => void handleStart()} disabled={busy}>
              <Mic aria-hidden="true" className="size-4" /> Start recording
            </Button>
          )}
          {phase === "recording" && (
            <Button onClick={() => void handleStop()} variant="secondary" disabled={busy}>
              <Square aria-hidden="true" className="size-4" /> Stop
            </Button>
          )}
          {phase === "recording" && (
            <Button onClick={() => void handleCancel()} variant="quiet" disabled={busy}>
              Cancel
            </Button>
          )}
          {phase === "done" && (
            <Button onClick={reset} variant="quiet">
              <RotateCcw aria-hidden="true" className="size-4" /> Reset
            </Button>
          )}
        </div>
      </ToolPanel>

      {errorState && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface)] p-4 text-sm"
        >
          <p className="font-medium">
            {errorState.kind === "denied" && "Microphone access denied"}
            {errorState.kind === "unavailable" && "No microphone available"}
            {errorState.kind === "unsupported" && "Recording not supported"}
            {errorState.kind === "failed" && "Recording failed"}
          </p>
          <p className="mt-1 text-[var(--text-secondary)]">{errorState.message}</p>
        </div>
      )}

      {phase === "done" && take && previewUrl && (
        <>
          <ToolPanel title="Recording">
            <audio
              controls
              src={previewUrl}
              className="w-full"
              aria-label="Playback of the recorded audio"
            />
            <dl className="mt-3 grid gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Duration</dt>
                <dd className="font-mono">{formatDuration(take.result.durationMs)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Format</dt>
                <dd className="font-mono">{takeFormatLabel(take.result.mimeType)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Size</dt>
                <dd className="font-mono">{(take.bytes / 1024).toFixed(1)} KB</dd>
              </div>
            </dl>
          </ToolPanel>
          <ToolPanel title="Export">
            <p className="text-sm text-[var(--text-secondary)]">
              Saving uses the system Save As dialog. Recordings are kept in memory only and are
              removed when you reset, navigate away, or close the app.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => void exportWebm()}
                disabled={busy || !takeExportable}
                title={takeExportable ? undefined : maximumExportBytesNote}
              >
                <Download aria-hidden="true" className="size-4" /> Save WebM
              </Button>
              <Button onClick={() => void exportWav()} variant="secondary" disabled={busy}>
                <Download aria-hidden="true" className="size-4" /> Save WAV
              </Button>
            </div>
            {exportNote && (
              <p role="status" className="mt-2 text-sm">
                {exportNote}
              </p>
            )}
          </ToolPanel>
        </>
      )}

      <ToolPanel title="Limits and privacy">
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
          <li>Takes are hard-capped at 10 minutes or 32 MB and stop automatically at the limit.</li>
          <li>{maximumExportBytesNote}</li>
          <li>
            Recording is foreground-only: leaving the app stops and keeps the take. The system
            microphone indicator is always visible while recording.
          </li>
          <li>
            Recordings never leave this device and are never written to storage unless you export
            them.
          </li>
        </ul>
      </ToolPanel>
    </div>
  )
}
