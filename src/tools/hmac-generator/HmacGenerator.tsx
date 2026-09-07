import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { getHmacAlgorithm, hmacAlgorithms, hmacSign, type HmacAlgorithm } from "./hmac"

export default function HmacGenerator() {
  const [message, setMessage] = useState("")
  const [secret, setSecret] = useState("")
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>("SHA-256")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")

  async function generate() {
    try {
      const signature = await hmacSign(algorithm, secret, message)
      setOutput(signature)
      setError("")
    } catch {
      setError("HMAC generation failed. Web Crypto must be available on this device.")
      setOutput("")
    }
  }

  function clear() {
    setMessage("")
    setSecret("")
    setOutput("")
    setError("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Message">
        <label className="sr-only" htmlFor="hmac-message">
          Message
        </label>
        <textarea
          className="app-input min-h-28 font-mono"
          id="hmac-message"
          maxLength={10000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Enter message to HMAC..."
          value={message}
        />
      </ToolPanel>

      <ToolPanel title="Secret key">
        <label className="sr-only" htmlFor="hmac-secret">
          Secret key
        </label>
        <input
          autoComplete="off"
          className="app-input font-mono"
          id="hmac-secret"
          maxLength={10000}
          onChange={(event) => setSecret(event.target.value)}
          placeholder="Enter secret key..."
          spellCheck={false}
          type="text"
          value={secret}
        />
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          The secret stays on this device and is never stored. It is cleared when you leave the
          tool.
        </p>
      </ToolPanel>

      <ToolPanel title="Algorithm">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Hash algorithm</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {hmacAlgorithms.map((candidate) => (
              <label
                className={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-medium ${
                  algorithm === candidate
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={candidate}
              >
                <input
                  checked={algorithm === candidate}
                  className="sr-only"
                  name="hmac-algorithm"
                  onChange={() => setAlgorithm(getHmacAlgorithm(candidate))}
                  type="radio"
                  value={candidate}
                />
                {candidate}
              </label>
            ))}
          </div>
        </fieldset>
      </ToolPanel>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void generate()} variant="secondary">
          Generate HMAC
        </Button>
        <Button onClick={clear} variant="quiet">
          Clear
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      ) : null}

      {output ? (
        <ToolPanel
          action={<CopyButton label="Copy HMAC" onStatus={setStatus} sensitive value={output} />}
          title={`HMAC-${algorithm.replace("SHA-", "")}`}
        >
          <p className="break-all font-mono text-sm text-[var(--text)]">{output}</p>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
