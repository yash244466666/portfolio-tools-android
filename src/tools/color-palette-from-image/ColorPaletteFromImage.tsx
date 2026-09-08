import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import type { PickedFile } from "@/platform/contracts"
import { getRelativeLuminance, hexToRgb } from "@/tools/color-picker/color-utils"
import { base64ToBytes, decodeImage, samplePixels } from "./palette-io"
import { defaultPaletteCount, extractPalette, formatPaletteCss, type PaletteEntry } from "./palette"

const maximumInputBytes = 16 * 1024 * 1024
const acceptedMimeTypes = ["image/png", "image/jpeg", "image/webp"]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Black or white text whichever contrasts better on the swatch color. */
function readableTextOn(hex: string): string {
  const rgb = hexToRgb(hex)
  if (rgb === null) return "#000000"
  const luminance = getRelativeLuminance(rgb)
  return luminance > 0.5 ? "#000000" : "#ffffff"
}

export default function ColorPaletteFromImage() {
  const { files, clipboard } = usePlatform()
  const [picked, setPicked] = useState<PickedFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [palette, setPalette] = useState<PaletteEntry[]>([])
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  // The preview URL is disposable; every replacement and the unmount revoke it.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const pickImage = useCallback(async () => {
    if (busy) return
    setError("")
    setStatus("")
    try {
      const [selected] = await files.pick({
        accept: [...acceptedMimeTypes],
        maximumBytes: maximumInputBytes,
      })
      if (!selected) {
        setStatus("Image selection cancelled.")
        return
      }
      setPicked(selected)
      setPalette([])
      setBusy(true)
      const content = await files.readContent(selected, { maximumBytes: maximumInputBytes })
      const bytes = base64ToBytes(content.data)
      const bitmap = await decodeImage(bytes)
      const entries = extractPalette(samplePixels(bitmap), defaultPaletteCount)
      setPreviewUrl(
        URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: selected.mimeType })),
      )
      setPalette(entries)
      setStatus(`Extracted ${entries.length} colors from ${formatBytes(selected.size)} image.`)
    } catch (pickError) {
      setStatus("")
      setError(toSafeErrorMessage(pickError))
    } finally {
      setBusy(false)
    }
  }, [busy, files])

  function reset() {
    setPicked(null)
    setPreviewUrl("")
    setPalette([])
    setError("")
    setStatus("Palette tool reset.")
  }

  async function copySwatch(hex: string) {
    try {
      await clipboard.writeText(hex)
      setStatus(`Copied ${hex}.`)
    } catch (copyError) {
      setStatus(toSafeErrorMessage(copyError))
    }
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Source image">
        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button disabled={busy} onClick={() => void pickImage()}>
              {picked ? "Choose another image" : "Choose image"}
            </Button>
            <Button disabled={!picked || busy} onClick={reset} variant="secondary">
              Reset
            </Button>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Pick a PNG, JPEG, or WebP image up to {formatBytes(maximumInputBytes)}. Colors are
            extracted on this device from a downscaled copy; the image is never uploaded.
          </p>
          {previewUrl && picked ? (
            <figure className="grid max-w-xs gap-1">
              <img
                alt={`Preview of the selected image, ${formatBytes(picked.size)}`}
                className="w-full rounded-xl border border-[var(--border)]"
                src={previewUrl}
              />
              <figcaption className="text-xs text-[var(--text-secondary)]">
                Selected: {formatBytes(picked.size)}{" "}
                {picked.mimeType.replace("image/", "").toUpperCase()} image.
              </figcaption>
            </figure>
          ) : null}
          {error ? (
            <p className="text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      {palette.length > 0 ? (
        <ToolPanel
          action={
            <CopyButton
              label="Copy palette"
              onStatus={setStatus}
              value={formatPaletteCss(palette)}
            />
          }
          title="Extracted palette"
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="list">
            {palette.map((entry) => (
              <li className="grid gap-1" key={entry.hex}>
                <button
                  aria-label={`Copy ${entry.hex}`}
                  className="flex h-16 items-center justify-center rounded-xl border border-[var(--border)] text-xs font-medium"
                  onClick={() => void copySwatch(entry.hex)}
                  style={{ backgroundColor: entry.hex, color: readableTextOn(entry.hex) }}
                  type="button"
                >
                  Copy
                </button>
                <p className="text-center font-mono text-xs text-[var(--text-secondary)]">
                  {entry.hex}
                </p>
              </li>
            ))}
          </ul>
          <pre
            className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5"
            aria-label="Palette as CSS custom properties"
          >
            {formatPaletteCss(palette)}
          </pre>
        </ToolPanel>
      ) : null}
    </div>
  )
}
