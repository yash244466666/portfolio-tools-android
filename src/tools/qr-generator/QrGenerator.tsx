import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import {
  bytesToBase64,
  canvasPngBytes,
  createQrMatrix,
  drawQrToCanvas,
  isValidQrInputSize,
  maximumQrInputBytes,
  planQrRender,
  qrErrorCorrectionLevels,
  qrPngFileName,
  qrPngMimeType,
  qrPixelSizes,
  qrInputBytes,
  type QrErrorCorrectionLevel,
  type QrPixelSize,
} from "./qr"

export default function QrGenerator() {
  const { files } = usePlatform()
  const [text, setText] = useState("")
  const [size, setSize] = useState<QrPixelSize>(256)
  const [level, setLevel] = useState<QrErrorCorrectionLevel>("M")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)
  const [drawSupported, setDrawSupported] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const inputBytes = useMemo(() => qrInputBytes(text), [text])
  const overLimit = !isValidQrInputSize(text)
  const result = useMemo(
    () => (text && !overLimit ? createQrMatrix(text, level) : null),
    [text, level, overLimit],
  )
  const matrix = result?.status === "ok" ? result.matrix : null
  const plan = useMemo(() => (matrix ? planQrRender(matrix, size) : null), [matrix, size])

  // Paint the canvas whenever the symbol or output size changes; the backing-store
  // dimensions come from the plan, independent of the CSS display size.
  useEffect(() => {
    if (!matrix || !canvasRef.current) return
    const drawn = drawQrToCanvas(canvasRef.current, matrix, size)
    setDrawSupported(drawn.status === "ok")
  }, [matrix, size])

  async function exportPng(action: "share" | "save"): Promise<void> {
    const canvas = canvasRef.current
    if (!canvas || busy) return
    setBusy(true)
    try {
      const bytes = await canvasPngBytes(canvas)
      if (!bytes) {
        setStatus("The QR image could not be encoded. Try again.")
        return
      }
      const file = {
        name: qrPngFileName,
        mimeType: qrPngMimeType,
        data: bytesToBase64(bytes),
        encoding: "base64",
      } as const
      if (action === "share") {
        await files.share(file)
        setStatus("QR image shared.")
      } else {
        await files.saveAs(file)
        setStatus("QR image saved.")
      }
    } catch (error) {
      setStatus(toSafeErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setText("")
    setStatus("QR tool reset.")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel>
        <div className="grid gap-4">
          <Field
            error={
              overLimit
                ? `QR text is limited to ${maximumQrInputBytes} bytes; this input is ${inputBytes} bytes. Shorten the text.`
                : result?.status === "invalid"
                  ? result.message
                  : undefined
            }
            hint={`Processed locally and never saved or uploaded. ${maximumQrInputBytes} byte maximum.`}
            htmlFor="qr-text"
            label="QR text"
          >
            <textarea
              aria-describedby={
                overLimit || result?.status === "invalid" ? "qr-text-error" : "qr-text-hint"
              }
              className="app-input min-h-24 resize-y"
              id="qr-text"
              onChange={(event) => setText(event.target.value)}
              placeholder="Enter a URL or any text…"
              value={text}
            />
          </Field>
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-[var(--text)]" id="qr-size-label">
              Image size
            </p>
            <div aria-labelledby="qr-size-label" className="grid grid-cols-3 gap-2" role="group">
              {qrPixelSizes.map((value) => (
                <Button
                  aria-pressed={size === value}
                  key={value}
                  onClick={() => setSize(value)}
                  variant={size === value ? "primary" : "secondary"}
                >
                  {value}px
                </Button>
              ))}
            </div>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Pixel size of the generated PNG image.
            </p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-[var(--text)]" id="qr-level-label">
              Error correction
            </p>
            <div aria-labelledby="qr-level-label" className="grid grid-cols-4 gap-2" role="group">
              {qrErrorCorrectionLevels.map((value) => (
                <Button
                  aria-label={`Error correction level ${value}`}
                  aria-pressed={level === value}
                  key={value}
                  onClick={() => setLevel(value)}
                  variant={level === value ? "primary" : "secondary"}
                >
                  {value}
                </Button>
              ))}
            </div>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Higher correction survives more damage but holds less text.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button disabled={!matrix || busy} onClick={() => void exportPng("share")}>
              Share PNG
            </Button>
            <Button
              disabled={!matrix || busy}
              onClick={() => void exportPng("save")}
              variant="secondary"
            >
              Save PNG
            </Button>
            <Button disabled={!text && !status} onClick={reset} variant="quiet">
              Reset
            </Button>
          </div>
          {status ? (
            <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel title="QR code">
        <div className="grid justify-items-center gap-3">
          <canvas
            aria-label="QR code image of the entered text"
            className={`h-auto max-w-full rounded-xl border border-[var(--border)] bg-white ${
              matrix ? "" : "hidden"
            }`}
            ref={canvasRef}
            role="img"
          />
          {matrix && plan ? (
            <ResultReveal token={`${matrix.version}-${inputBytes}-${level}`} variant="quick">
              <p className="text-center text-sm text-[var(--text-secondary)]">
                {drawSupported
                  ? ""
                  : "The QR image cannot be displayed on this device, but sharing and saving still work. "}
                QR version {matrix.version}: {matrix.size} by {matrix.size} modules rendered at{" "}
                {plan.canvasPixels} by {plan.canvasPixels} pixels, error correction {level},
                encoding {inputBytes} byte{inputBytes === 1 ? "" : "s"}. Share or save the PNG image
                to scan it.
              </p>
            </ResultReveal>
          ) : overLimit ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Shorten the text to generate a QR code.
            </p>
          ) : result?.status === "invalid" ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Fix the text to generate a QR code.
            </p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              The QR code appears here as you type.
            </p>
          )}
        </div>
      </ToolPanel>
    </div>
  )
}
