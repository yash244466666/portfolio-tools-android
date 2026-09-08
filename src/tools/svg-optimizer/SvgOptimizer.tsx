import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  formatSvgBytes,
  minifySvg,
  maximumSvgLength,
  prettyPrintSvg,
  svgSavingsPercent,
} from "./svg"

const limitLabel = maximumSvgLength.toLocaleString("en-US")

export default function SvgOptimizer() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [original, setOriginal] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState("")

  function run(action: "minify" | "pretty") {
    const result = action === "minify" ? minifySvg(input) : prettyPrintSvg(input)
    setOutput(result.output)
    setOriginal(result.message === "" ? input : "")
    setMessage(result.message)
  }

  function reset() {
    setInput("")
    setOutput("")
    setOriginal("")
    setMessage("")
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Paste SVG">
        <Field
          error={message === "" ? undefined : message}
          hint={`Well-formed SVG up to ${limitLabel} characters.`}
          htmlFor="svg-optimizer-input"
          label="SVG input"
        >
          <textarea
            className="app-input min-h-48 font-mono"
            id="svg-optimizer-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder={'<svg xmlns="http://www.w3.org/2000/svg">…</svg>'}
            spellCheck={false}
            value={input}
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => run("minify")}>Minify</Button>
          <Button onClick={() => run("pretty")} variant="secondary">
            Pretty print
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
          {original !== "" ? (
            <p className="mb-2 text-sm text-[var(--text-secondary)]">
              {formatSvgBytes(original)} becomes {formatSvgBytes(output)}
              {svgSavingsPercent(original, output) > 0
                ? ` (${svgSavingsPercent(original, output)}% smaller)`
                : ""}
            </p>
          ) : null}
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
            {output}
          </pre>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        The input is validated with the standard XML parser before any change. Minifying only
        removes comments and whitespace between tags, never whitespace inside text or attribute
        values, so the result renders identically. Nothing is saved or uploaded; this tool has no
        network access.
      </p>
    </div>
  )
}
