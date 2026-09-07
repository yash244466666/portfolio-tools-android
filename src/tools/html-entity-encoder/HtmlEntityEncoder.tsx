import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  applyHtmlEntityMode,
  getHtmlEntityMode,
  htmlEntityModeLabels,
  htmlEntityModes,
  type HtmlEntityMode,
} from "./html-entity"

export default function HtmlEntityEncoder() {
  const [mode, setMode] = useState<HtmlEntityMode>("encode")
  const [input, setInput] = useState("")
  const [status, setStatus] = useState("")

  const output = applyHtmlEntityMode(mode, input)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Mode">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Conversion mode</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {htmlEntityModes.map((candidate) => (
              <label
                className={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-medium ${
                  mode === candidate
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={candidate}
              >
                <input
                  checked={mode === candidate}
                  className="sr-only"
                  name="html-entity-mode"
                  onChange={() => setMode(getHtmlEntityMode(candidate))}
                  type="radio"
                  value={candidate}
                />
                {htmlEntityModeLabels[candidate]}
              </label>
            ))}
          </div>
        </fieldset>
      </ToolPanel>

      <ToolPanel title="Input">
        <label className="sr-only" htmlFor="html-entity-input">
          Input text
        </label>
        <textarea
          className="app-input min-h-40 font-mono"
          id="html-entity-input"
          maxLength={10000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Enter text with HTML entities or special characters..."
          value={input}
        />
      </ToolPanel>

      <ToolPanel
        action={
          output === "" ? null : (
            <CopyButton label="Copy output" onStatus={setStatus} value={output} />
          )
        }
        title="Output"
      >
        <label className="sr-only" htmlFor="html-entity-output">
          Converted output
        </label>
        <textarea
          aria-readonly="true"
          className="app-input min-h-40 font-mono"
          id="html-entity-output"
          readOnly
          value={output}
        />
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          {mode === "decode"
            ? "Decoding accepts the five reserved entities, common named entities, and decimal or hexadecimal numeric entities. Anything else is left as-is."
            : mode === "escape-html"
              ? 'Escape HTML encodes & < > and " but leaves the apostrophe untouched.'
              : "Encode converts the five reserved characters & < > \" ' into their entities."}
        </p>
        <p aria-live="polite" className="sr-only" role="status">
          {status}
        </p>
      </ToolPanel>
    </div>
  )
}
