import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { formatXml, maximumXmlLength, minifyXml } from "./xml"

const limitLabel = maximumXmlLength.toLocaleString("en-US")

export default function XmlFormatter() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState("")

  function run(action: "format" | "minify") {
    const result = action === "format" ? formatXml(input) : minifyXml(input)
    setOutput(result.output)
    setMessage(result.message)
  }

  function reset() {
    setInput("")
    setOutput("")
    setMessage("")
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Paste XML">
        <Field
          error={message === "" ? undefined : message}
          hint={`Well-formed XML up to ${limitLabel} characters. Formatting never changes content.`}
          htmlFor="xml-formatter-input"
          label="XML input"
        >
          <textarea
            className="app-input min-h-48 font-mono"
            id="xml-formatter-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="<note><to>Ada</to></note>"
            spellCheck={false}
            value={input}
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => run("format")}>Format</Button>
          <Button onClick={() => run("minify")} variant="secondary">
            Minify
          </Button>
          <Button onClick={reset} variant="quiet">
            Clear
          </Button>
        </div>
      </ToolPanel>

      {output !== "" ? (
        <ToolPanel
          title="Result"
          action={
            message === "" ? (
              <CopyButton label="Copy result" onStatus={setStatus} value={output} />
            ) : null
          }
        >
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
            {output}
          </pre>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Validation uses the standard XML parser, so a document must be well-formed: every tag
        closed, attributes quoted, one root element. Minifying removes whitespace between tags but
        keeps whitespace inside text nodes, so the minified result parses to the same text. Both
        minification and formatting fail rather than silently altering content. Nothing is saved or
        uploaded; this tool has no network access.
      </p>
    </div>
  )
}
