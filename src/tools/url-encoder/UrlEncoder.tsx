import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { Button } from "@/components/ui/Button"
import {
  decodeUrlComponent,
  encodeUrlComponent,
  maximumUrlChars,
  parseUrlParts,
  type UrlParts,
} from "./url"

const failureMessages: Record<string, string> = {
  "invalid-escape": "This is not a valid percent-encoded string. Check for stray % sequences.",
  "too-long": `The input exceeds the ${maximumUrlChars.toLocaleString("en-US")} character limit. Shorten it to continue.`,
}

const partLabels: readonly { key: keyof UrlParts; label: string }[] = [
  { key: "protocol", label: "Protocol" },
  { key: "hostname", label: "Hostname" },
  { key: "port", label: "Port" },
  { key: "pathname", label: "Path" },
  { key: "search", label: "Query" },
  { key: "hash", label: "Fragment" },
]

export default function UrlEncoder() {
  const [input, setInput] = useState("")
  const [encoded, setEncoded] = useState<string | null>(null)
  const [decoded, setDecoded] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | undefined>(undefined)

  function run(kind: "encode" | "decode") {
    const outcome = kind === "encode" ? encodeUrlComponent(input) : decodeUrlComponent(input)
    if (outcome.status === "ok") {
      setFailure(undefined)
      if (kind === "encode") {
        setEncoded(outcome.value)
        setDecoded(null)
      } else {
        setDecoded(outcome.value)
        setEncoded(null)
      }
    } else {
      setFailure(failureMessages[outcome.status] ?? "The conversion failed.")
      setEncoded(null)
      setDecoded(null)
    }
  }

  function reset() {
    setInput("")
    setEncoded(null)
    setDecoded(null)
    setFailure(undefined)
  }

  const parsed =
    input.length > 0 && input.length <= maximumUrlChars ? parseUrlParts(input) : undefined
  const parts = parsed?.status === "ok" ? parsed.parts : undefined
  const assumedHttps = parsed?.status === "ok" ? parsed.assumedHttps : false

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={failure}
          hint="Encode applies encodeURIComponent; Decode applies decodeURIComponent."
          htmlFor="url-input"
          label="Input"
        >
          <textarea
            aria-describedby={failure ? "url-input-error" : "url-input-hint"}
            className="app-input min-h-28 resize-y font-mono"
            id="url-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Enter a URL or text…"
            value={input}
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => run("encode")}>Encode</Button>
          <Button onClick={() => run("decode")} variant="secondary">
            Decode
          </Button>
          <Button onClick={reset} variant="quiet">
            Clear
          </Button>
        </div>
      </ToolPanel>

      {encoded !== null ? (
        <ToolPanel
          action={<CopyButton label="Copy" onStatus={() => undefined} value={encoded} />}
          title="Encoded"
        >
          <p className="break-all font-mono text-sm">{encoded || "—"}</p>
        </ToolPanel>
      ) : null}

      {decoded !== null ? (
        <ToolPanel
          action={<CopyButton label="Copy" onStatus={() => undefined} value={decoded} />}
          title="Decoded"
        >
          <p className="break-all font-mono text-sm">{decoded || "—"}</p>
        </ToolPanel>
      ) : null}

      {parts ? (
        <ToolPanel title="URL parts">
          {assumedHttps ? (
            <p className="mb-2 text-sm text-[var(--text-secondary)]" role="note">
              No scheme was given, so the parts below assume <code>https://</code>.
            </p>
          ) : null}
          <dl className="grid gap-2 sm:grid-cols-2">
            {partLabels.map((entry) => (
              <div
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
                key={entry.key}
              >
                <dt className="text-xs text-[var(--text-secondary)]">{entry.label}</dt>
                <dd className="break-all font-mono text-sm">{parts[entry.key]}</dd>
              </div>
            ))}
          </dl>
        </ToolPanel>
      ) : null}
      <p className="text-sm text-[var(--text-secondary)]">
        Encoding percent-encodes reserved characters like <code>/</code>, <code>?</code>, and{" "}
        <code>&amp;</code>. Everything happens on this device.
      </p>
    </div>
  )
}
