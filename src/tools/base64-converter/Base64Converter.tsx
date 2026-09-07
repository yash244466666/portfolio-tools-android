import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { Button } from "@/components/ui/Button"
import { decodeBase64, encodeBase64, maximumBase64Chars } from "./base64"

const failureMessages: Record<string, string> = {
  "invalid-base64": "This is not valid Base64. Check for stray characters or broken padding.",
  "invalid-utf8": "The bytes decode, but they are not valid UTF-8 text, so no result is shown.",
  "too-long": `The input exceeds the ${maximumBase64Chars.toLocaleString("en-US")} character limit. Shorten it to continue.`,
}

export default function Base64Converter() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | undefined>(undefined)

  function run(kind: "encode" | "decode") {
    const outcome = kind === "encode" ? encodeBase64(input) : decodeBase64(input)
    if (outcome.status === "ok") {
      setOutput(outcome.value)
      setFailure(undefined)
    } else {
      setOutput(null)
      setFailure(failureMessages[outcome.status] ?? "The conversion failed.")
    }
  }

  function reset() {
    setInput("")
    setOutput(null)
    setFailure(undefined)
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={failure}
          hint="Encode converts UTF-8 text to Base64; Decode converts Base64 back to text."
          htmlFor="base64-input"
          label="Input"
        >
          <textarea
            aria-describedby={failure ? "base64-input-error" : "base64-input-hint"}
            className="app-input min-h-32 resize-y font-mono"
            id="base64-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Enter text to encode, or Base64 to decode…"
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

      <ToolPanel
        action={
          output !== null ? (
            <CopyButton label="Copy" onStatus={() => undefined} value={output} />
          ) : undefined
        }
        title="Result"
      >
        {output === null ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter text above, then choose Encode or Decode.
          </p>
        ) : (
          <p className="break-all font-mono text-sm">{output || "—"}</p>
        )}
      </ToolPanel>
      <p className="text-sm text-[var(--text-secondary)]">
        Encoding uses the UTF-8 bytes of the text, and decoding accepts optional padding and
        whitespace. Conversion happens on this device and the file mode is not included.
      </p>
    </div>
  )
}
