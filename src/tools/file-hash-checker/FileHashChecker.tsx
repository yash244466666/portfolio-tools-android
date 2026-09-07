import { useCallback, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { isCancellationError, toSafeErrorMessage } from "@/platform/errors"
import type { ContentDigestAlgorithm, PickedFile } from "@/platform/contracts"

/** The picker bound; the native digest bridge streams, so no full-file copy ever exists. */
const maximumPickedBytes = 100 * 1024 * 1024

const digestRequests: ReadonlyArray<{
  algorithm: ContentDigestAlgorithm
  label: string
  /** SHA-1 is legacy by design and must be labeled, never marketed as collision-secure. */
  note?: string
}> = [
  { algorithm: "sha-256", label: "SHA-256" },
  { algorithm: "sha-1", label: "SHA-1", note: "Legacy — not collision-secure" },
  { algorithm: "sha-512", label: "SHA-512" },
]

interface DigestEntry {
  algorithm: ContentDigestAlgorithm
  label: string
  /** SHA-1 is legacy by design and must be labeled, never marketed as collision-secure. */
  note?: string
  digestHex: string
}

export default function FileHashChecker() {
  const { files } = usePlatform()
  const [picked, setPicked] = useState<PickedFile | null>(null)
  const [digests, setDigests] = useState<DigestEntry[]>([])
  const [computing, setComputing] = useState(false)
  const [computingLabel, setComputingLabel] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [abort, setAbort] = useState<AbortController | null>(null)

  const computeAll = useCallback(
    async (file: PickedFile) => {
      const controller = new AbortController()
      setAbort(controller)
      setComputing(true)
      setError("")
      try {
        const results: DigestEntry[] = []
        for (const request of digestRequests) {
          controller.signal.throwIfAborted()
          setComputingLabel(request.label)
          const digest = await files.digestContent(
            file,
            { algorithm: request.algorithm },
            controller.signal,
          )
          results.push({ ...request, digestHex: digest.digestHex })
          setDigests([...results])
        }
        setStatus(`Computed ${results.length} digests locally.`)
      } catch (digestError) {
        if (isCancellationError(digestError)) {
          setStatus("Hashing cancelled.")
        } else {
          setError(toSafeErrorMessage(digestError))
        }
      } finally {
        setComputing(false)
        setComputingLabel("")
        setAbort(null)
      }
    },
    [files],
  )

  const pickFile = useCallback(async () => {
    if (computing) return
    setError("")
    setStatus("")
    try {
      const selected = await files.pick({ accept: ["*/*"], maximumBytes: maximumPickedBytes })
      const first = selected[0]
      if (!first) {
        setStatus("No file selected.")
        return
      }
      setPicked(first)
      setDigests([])
      await computeAll(first)
    } catch (pickError) {
      setStatus(toSafeErrorMessage(pickError))
    }
  }, [computing, files, computeAll])

  function cancel() {
    abort?.abort()
  }

  function reset() {
    abort?.abort()
    setPicked(null)
    setDigests([])
    setError("")
    setStatus("File hash tool reset.")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Selected file">
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button disabled={computing} onClick={() => void pickFile()}>
              {picked ? "Choose another file" : "Choose file"}
            </Button>
            {computing ? (
              <Button onClick={cancel} variant="danger">
                Cancel
              </Button>
            ) : (
              <Button disabled={!picked} onClick={reset} variant="secondary">
                Reset
              </Button>
            )}
          </div>
          {picked ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Selected a {formatSize(picked.size)} file. Hashing streams the content natively on
              Android; the file never leaves this device and is never fully copied into JavaScript.
            </p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Pick any file up to {formatSize(maximumPickedBytes)} to compute SHA-256, SHA-1, and
              SHA-512 digests locally.
            </p>
          )}
          {computing ? (
            <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
              Computing {computingLabel} digest…
            </p>
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

      <ToolPanel title="Digests">
        {digests.length > 0 ? (
          <div className="grid gap-3">
            {digests.map((digest) => (
              <div className="grid gap-1" key={digest.algorithm}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {digest.label}
                    {digest.note ? (
                      <span className="ml-2 font-normal text-[var(--text-secondary)]">
                        {digest.note}
                      </span>
                    ) : null}
                  </p>
                  <CopyButton
                    label={`Copy ${digest.label}`}
                    onStatus={setStatus}
                    value={digest.digestHex}
                  />
                </div>
                <p className="break-all font-mono text-xs text-[var(--text)]">{digest.digestHex}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            {picked
              ? "Digests appear here as they are computed."
              : "Digests appear here after picking a file."}
          </p>
        )}
      </ToolPanel>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
