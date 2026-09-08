import { useCallback, useEffect, useRef, useState } from "react"
import { Film, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ToolPanel } from "@/components/ui/ToolPanel"
import type { PickedFile } from "@/platform/contracts"
import { isCancellationError, toSafeErrorMessage } from "@/platform/errors"
import { usePlatform } from "@/platform/platform-context"
import { bytesToBase64 } from "@/platform/shared/files"
import { createGifConversion, type GifConversion } from "./gif-client"
import {
  defaultFps,
  defaultOutputWidth,
  exportCapNote,
  maximumDurationSeconds,
  maximumFrames,
  maximumFps,
  maximumInputBytes,
  maximumOutputBytes,
  maximumOutputWidth,
  metadataTimeoutMs,
  minimumFps,
  canExportOutput,
  computeFramePlan,
  resolveOutputDimensions,
  seekTimeoutMs,
  suggestedGifName,
  validateDuration,
  validateOutputSize,
  validatePickedVideo,
} from "./gif-policy"

type Phase =
  | "initial"
  | "picking"
  | "invalid-mime"
  | "over-size"
  | "unsupported-codec"
  | "decode-failure"
  | "extracting"
  | "encoding"
  | "done"
  | "over-limit-output"
  | "cancelled"

interface DoneGif {
  url: string
  bytes: Uint8Array<ArrayBuffer>
  byteLength: number
  width: number
  height: number
  frameCount: number
  durationLabel: string
  sourceName: string
}

const MediaErrorSrcNotSupported = 4

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function loadMetadata(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer)
      video.onloadedmetadata = null
      video.onerror = null
    }
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error("metadata-timeout"))
    }, timeoutMs)
    video.onloadedmetadata = () => {
      cleanup()
      resolve()
    }
    video.onerror = () => {
      cleanup()
      const code = video.error?.code
      reject(new Error(code === MediaErrorSrcNotSupported ? "unsupported" : "decode"))
    }
    video.load()
  })
}

function seekTo(
  video: HTMLVideoElement,
  timestampSeconds: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error("decode"))
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      video.removeEventListener("seeked", onSeeked)
      video.removeEventListener("error", onError)
    }
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error("seek-timeout"))
    }, timeoutMs)
    video.addEventListener("seeked", onSeeked)
    video.addEventListener("error", onError)
    video.currentTime = timestampSeconds
  })
}

const phaseHeadings: Partial<Record<Phase, string>> = {
  "invalid-mime": "This file is not a video",
  "over-size": "This video is too large",
  "unsupported-codec": "This video's format is not supported here",
  "decode-failure": "This video could not be decoded",
  "over-limit-output": "The GIF exceeded the output size limit",
}

export default function VideoToGif() {
  const { files } = usePlatform()
  const [phase, setPhase] = useState<Phase>("initial")
  const [selected, setSelected] = useState<PickedFile | null>(null)
  const [fps, setFps] = useState(defaultFps)
  const [outputWidth, setOutputWidth] = useState(defaultOutputWidth)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState<{ framesDone: number; frameCount: number } | null>(null)
  const [gif, setGif] = useState<DoneGif | null>(null)
  const [exportNote, setExportNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")

  const conversionRef = useRef<GifConversion | null>(null)
  const cancelledRef = useRef(false)
  const sourceUrlRef = useRef<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Preview object URLs are disposable; every replacement and the unmount
  // revoke them so the GIF bitmap does not outlive the screen.
  useEffect(() => {
    return () => {
      if (gif) URL.revokeObjectURL(gif.url)
    }
  }, [gif])

  // Cancel expensive work when navigating away: terminate the Worker, close
  // the video element, and revoke every object URL (section 21/26 cleanup).
  useEffect(() => {
    return () => {
      cancelledRef.current = true
      conversionRef.current?.dispose()
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
      sourceUrlRef.current = null
      if (videoRef.current) {
        videoRef.current.removeAttribute("src")
        videoRef.current.load()
        videoRef.current = null
      }
    }
  }, [])

  const releaseSource = useCallback(() => {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    sourceUrlRef.current = null
    if (videoRef.current) {
      videoRef.current.removeAttribute("src")
      videoRef.current.load()
      videoRef.current = null
    }
  }, [])

  const ensureConversion = useCallback(() => {
    if (!conversionRef.current) {
      conversionRef.current = createGifConversion()
    }
    return conversionRef.current
  }, [])

  const pickVideo = useCallback(async () => {
    setError("")
    setExportNote(null)
    setNotice("")
    setPhase("picking")
    try {
      const picked = await files.pick({
        accept: ["video/*"],
        multiple: false,
        maximumBytes: maximumInputBytes,
      })
      if (picked.length === 0) {
        setPhase("initial")
        setError("")
        return
      }
      const first = picked[0]
      if (!first) {
        setPhase("initial")
        return
      }
      const problem = validatePickedVideo(first)
      if (problem) {
        setError(problem.message)
        setPhase(problem.code)
        return
      }
      setSelected(first)
      setGif((current) => {
        if (current) URL.revokeObjectURL(current.url)
        return null
      })
      setExportNote(null)
      setPhase("initial")
      setError("")
    } catch (pickError) {
      setPhase("initial")
      if (!isCancellationError(pickError)) setError(toSafeErrorMessage(pickError))
    }
  }, [files])

  const convert = useCallback(async () => {
    if (!selected) return
    cancelledRef.current = false
    setError("")
    setExportNote(null)
    setNotice("")
    setGif((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
    setProgress(null)
    setPhase("extracting")

    let bytes: Uint8Array<ArrayBuffer>
    try {
      const content = await files.readContent(selected, { maximumBytes: maximumInputBytes })
      bytes = base64ToBytes(content.data)
    } catch (readError) {
      if (cancelledRef.current) return
      setError(
        isCancellationError(readError)
          ? "The video could not be read from the picker."
          : toSafeErrorMessage(readError),
      )
      setPhase("decode-failure")
      return
    }

    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true
    video.preload = "auto"
    videoRef.current = video
    const sourceUrl = URL.createObjectURL(
      new Blob([bytes.buffer], { type: selected.mimeType || "video/mp4" }),
    )
    sourceUrlRef.current = sourceUrl
    video.src = sourceUrl

    try {
      await loadMetadata(video, metadataTimeoutMs)
    } catch (loadError) {
      releaseSource()
      if (cancelledRef.current) return
      if ((loadError as Error).message === "unsupported") {
        setPhase("unsupported-codec")
        setError(
          "This device's video decoder cannot read this file's format. MP4/H.264 is the supported baseline; many WebM/VP9 inputs also work depending on the device.",
        )
      } else {
        setPhase("decode-failure")
        setError(
          "The video's metadata could not be read before the deadline. Please try another file.",
        )
      }
      return
    }

    const durationProblem = validateDuration(video.duration)
    if (durationProblem) {
      releaseSource()
      if (Number.isFinite(video.duration) && video.duration > maximumDurationSeconds) {
        setError(durationProblem)
        setPhase("initial")
      } else {
        setPhase("decode-failure")
        setError(durationProblem)
      }
      return
    }

    const plan = computeFramePlan(video.duration, fps)
    if (typeof plan === "string") {
      releaseSource()
      setError(plan)
      setPhase("initial")
      return
    }

    const dimensions = resolveOutputDimensions(video.videoWidth, video.videoHeight, outputWidth)
    if (typeof dimensions === "string") {
      releaseSource()
      setPhase("decode-failure")
      setError(dimensions)
      return
    }

    const conversion = ensureConversion()
    const started = conversion.start(
      {
        width: dimensions.width,
        height: dimensions.height,
        frameCount: plan.frameCount,
        frameIntervalMs: plan.frameIntervalMs,
        maximumOutputBytes: maximumOutputBytes,
      },
      {
        onProgress: (framesDone, frameCount) => {
          setProgress({ framesDone, frameCount })
        },
        onEncoding: () => {
          setPhase((current) => (current === "extracting" ? "encoding" : current))
        },
        onComplete: (result) => {
          releaseSource()
          const outputProblem = validateOutputSize(result.bytes.byteLength)
          if (outputProblem) {
            setError(outputProblem)
            setPhase("over-limit-output")
            return
          }
          const durationSeconds = (result.frameCount * plan.frameIntervalMs) / 1000
          const url = URL.createObjectURL(new Blob([result.bytes.buffer], { type: "image/gif" }))
          setGif({
            url,
            bytes: result.bytes,
            byteLength: result.bytes.byteLength,
            width: result.width,
            height: result.height,
            frameCount: result.frameCount,
            durationLabel: `${durationSeconds.toFixed(1)} s`,
            sourceName: selected.name,
          })
          setPhase("done")
          setError("")
        },
        onFailure: (code, message) => {
          // Stop the seek loop; the Worker has already given up on the take.
          cancelledRef.current = true
          releaseSource()
          if (code === "over-limit-output") {
            setPhase("over-limit-output")
            setError(
              message ||
                "The GIF exceeded the output size limit. Use a lower frame rate, a shorter take, or a smaller width.",
            )
            return
          }
          setPhase("decode-failure")
          setError(message || "The GIF encoding failed on this device.")
        },
      },
    )
    if (!started) {
      releaseSource()
      setError("This device cannot run the background conversion Worker needed for GIF encoding.")
      setPhase("initial")
      return
    }

    try {
      for (let index = 0; index < plan.frameCount; index += 1) {
        if (cancelledRef.current) return
        await seekTo(video, index * plan.frameIntervalSeconds, seekTimeoutMs)
        if (cancelledRef.current) return
        const bitmap = await createImageBitmap(video)
        conversion.addFrame(bitmap)
      }
      if (cancelledRef.current) return
      conversion.finish()
    } catch {
      if (cancelledRef.current) return
      cancelledRef.current = true
      conversion.cancel()
      releaseSource()
      setPhase("decode-failure")
      setError(
        "Frames could not be extracted from this video before the deadline. Please try another file.",
      )
    }
  }, [selected, fps, outputWidth, files, ensureConversion, releaseSource])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    conversionRef.current?.cancel()
    releaseSource()
    setPhase("cancelled")
    setError("")
  }, [releaseSource])

  const reset = useCallback(() => {
    cancelledRef.current = true
    conversionRef.current?.cancel()
    releaseSource()
    setGif((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
    setSelected(null)
    setProgress(null)
    setExportNote(null)
    setError("")
    setNotice("Tool reset. Nothing is retained.")
    setPhase("initial")
    setBusy(false)
  }, [releaseSource])

  const exportGif = useCallback(async () => {
    if (!gif) return
    setBusy(true)
    setExportNote(null)
    try {
      if (!canExportOutput(gif.byteLength)) {
        setExportNote(exportCapNote)
        return
      }
      await files.saveAs({
        name: suggestedGifName(gif.sourceName),
        mimeType: "image/gif",
        data: bytesToBase64(gif.bytes),
        encoding: "base64",
      })
      setExportNote("GIF saved.")
    } catch (exportError) {
      setExportNote(
        isCancellationError(exportError) ? "Save cancelled." : toSafeErrorMessage(exportError),
      )
    } finally {
      setBusy(false)
    }
  }, [files, gif])

  const converting = phase === "extracting" || phase === "encoding"
  const showSettings = !converting && phase !== "done" && phase !== "over-limit-output"
  const gifExportable = gif !== null && canExportOutput(gif.byteLength)
  const progressPercent =
    progress && progress.frameCount > 0
      ? Math.min(100, Math.round((progress.framesDone / progress.frameCount) * 100))
      : 0

  const statusText =
    phase === "picking"
      ? "Opening the picker…"
      : phase === "extracting"
        ? progress
          ? `Extracting and encoding frame ${Math.min(progress.framesDone + 1, progress.frameCount)} of ${progress.frameCount}…`
          : "Preparing the conversion…"
        : phase === "encoding"
          ? "Finishing the GIF encoding…"
          : phase === "done"
            ? "GIF ready. Export it below; it is kept in memory only."
            : phase === "cancelled"
              ? "Conversion cancelled. Nothing was kept."
              : phase === "over-limit-output"
                ? "Conversion stopped at the output size limit. Nothing invalid was kept."
                : phase === "invalid-mime" || phase === "over-size"
                  ? "The selected file was rejected. Choose a different video."
                  : notice ||
                    "Video to GIF works entirely on this device. Nothing is stored or sent anywhere."

  return (
    <div className="grid gap-4">
      <ToolPanel title="Pick a video">
        <p className="text-sm text-[var(--text-secondary)]">
          Convert a short video into a looping GIF on this device. A video can be at most{" "}
          {formatBytes(maximumInputBytes)}. MP4/H.264 is the supported baseline; many WebM/VP9
          inputs also work depending on the device. The video and the GIF never leave this device
          and are never stored.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={converting || phase === "picking"} onClick={() => void pickVideo()}>
            <Film aria-hidden="true" className="size-4" />
            {selected ? "Choose another video" : "Choose video"}
          </Button>
          {selected && (
            <Button onClick={reset} variant="quiet">
              <RotateCcw aria-hidden="true" className="size-4" /> Reset
            </Button>
          )}
        </div>
        {selected && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Selected a {formatBytes(selected.size)} video. It is sensitive session data: it is never
            written to storage and is discarded on reset, navigation, or close.
          </p>
        )}
      </ToolPanel>

      {showSettings && (
        <ToolPanel title="Conversion settings">
          <div className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-semibold" htmlFor="video-to-gif-fps">
                Frames per second ({fps})
              </label>
              <input
                className="app-input"
                id="video-to-gif-fps"
                max={maximumFps}
                min={minimumFps}
                onChange={(event) => setFps(Number(event.target.value))}
                type="range"
                value={fps}
              />
              <p className="text-xs text-[var(--text-secondary)]">
                Between {minimumFps} and {maximumFps} frames per second; higher rates produce more
                frames and larger GIFs.
              </p>
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-semibold" htmlFor="video-to-gif-width">
                Output width (px)
              </label>
              <input
                className="app-input"
                id="video-to-gif-width"
                max={maximumOutputWidth}
                min={2}
                onChange={(event) => setOutputWidth(Number(event.target.value))}
                type="number"
                value={outputWidth}
              />
              <p className="text-xs text-[var(--text-secondary)]">
                At most {maximumOutputWidth} px wide; the aspect ratio is preserved and dimensions
                are evened.
              </p>
            </div>
            <Button disabled={!selected} onClick={() => void convert()}>
              Convert to GIF
            </Button>
          </div>
        </ToolPanel>
      )}

      {converting && (
        <ToolPanel title="Converting">
          <div
            aria-hidden="true"
            className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{progressPercent}%</p>
          <div className="mt-3">
            <Button onClick={cancel} variant="quiet">
              <X aria-hidden="true" className="size-4" /> Cancel
            </Button>
          </div>
        </ToolPanel>
      )}

      {(phase === "done" || phase === "over-limit-output") && gif && (
        <>
          <ToolPanel title="GIF preview">
            <img
              alt={`Generated GIF, ${gif.width} by ${gif.height} pixels, ${gif.frameCount} frames`}
              className="max-h-72 w-full rounded-lg object-contain"
              src={gif.url}
            />
            <dl className="mt-3 grid gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Dimensions</dt>
                <dd className="font-mono">
                  {gif.width} × {gif.height} px
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Frames</dt>
                <dd className="font-mono">{gif.frameCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Duration</dt>
                <dd className="font-mono">{gif.durationLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Size</dt>
                <dd className="font-mono">{formatBytes(gif.byteLength)}</dd>
              </div>
            </dl>
          </ToolPanel>
          {phase === "done" && (
            <ToolPanel title="Export">
              <p className="text-sm text-[var(--text-secondary)]">
                Saving uses the system Save As dialog. The GIF is kept in memory only and is removed
                when you reset, navigate away, or close the app.
              </p>
              <div className="mt-3">
                <Button
                  disabled={busy || !gifExportable}
                  onClick={() => void exportGif()}
                  title={gifExportable ? undefined : exportCapNote}
                >
                  Save GIF
                </Button>
              </div>
              {exportNote && (
                <p className="mt-2 text-sm" role="status">
                  {exportNote}
                </p>
              )}
            </ToolPanel>
          )}
        </>
      )}

      {error && (
        <div
          className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface)] p-4 text-sm"
          role="alert"
        >
          <p className="font-medium">{phaseHeadings[phase] ?? "Conversion failed"}</p>
          <p className="mt-1 text-[var(--text-secondary)]">{error}</p>
        </div>
      )}

      <ToolPanel title="Limits and privacy" muted>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
          <li>
            Videos are capped at {formatBytes(maximumInputBytes)}, {maximumDurationSeconds} seconds,{" "}
            {maximumFrames} frames, and {maximumOutputWidth} px output width.
          </li>
          <li>
            The finished GIF is hard-capped at {formatBytes(maximumOutputBytes)}; conversions stop
            at the limit instead of producing an oversized file.
          </li>
          <li>{exportCapNote}</li>
          <li>
            The video and the GIF stay in memory on this device and are never stored, logged, or
            sent anywhere.
          </li>
        </ul>
      </ToolPanel>

      <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
        {statusText}
      </p>
    </div>
  )
}
