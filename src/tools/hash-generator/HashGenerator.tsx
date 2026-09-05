import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { hashAlgorithms, hashTextAll, type HashAlgorithm } from "@/tools/hash-generator/hash"

export default function HashGenerator() {
  const [input, setInput] = useState("")
  const [hashes, setHashes] = useState<Record<HashAlgorithm, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")

  async function generate() {
    if (!input) return
    setLoading(true)
    setError("")
    try {
      setHashes(await hashTextAll(input))
      setStatus("Hashes generated locally.")
    } catch {
      setHashes(null)
      setError(
        "Hash generation is unavailable on this device. Update Android System WebView and try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setInput("")
    setHashes(null)
    setError("")
    setStatus("Hash tool reset.")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel>
        <div className="grid gap-4">
          <Field
            error={error || undefined}
            hint="Text is processed in memory and is not saved. SHA-1 is included only for compatibility and is not collision-resistant."
            htmlFor="hash-input"
            label="Text to hash"
          >
            <textarea
              aria-describedby={error ? "hash-input-error" : "hash-input-hint"}
              autoCapitalize="off"
              autoComplete="off"
              className="app-input min-h-36 resize-y font-mono"
              id="hash-input"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Enter text"
              spellCheck={false}
              value={input}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button disabled={!input || loading} onClick={() => void generate()}>
              {loading ? "Generating…" : "Generate hashes"}
            </Button>
            <Button disabled={!input && !hashes} onClick={reset} variant="secondary">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      {hashes ? (
        <div className="grid gap-3">
          {hashAlgorithms.map((algorithm) => (
            <ToolPanel
              action={
                <CopyButton
                  label={`Copy ${algorithm}`}
                  onStatus={setStatus}
                  value={hashes[algorithm]}
                />
              }
              key={algorithm}
              title={algorithm}
            >
              <p className="break-all font-mono text-sm leading-6 text-[var(--text-secondary)]">
                {hashes[algorithm]}
              </p>
            </ToolPanel>
          ))}
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  )
}
