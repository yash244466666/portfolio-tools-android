import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  getMorseDirection,
  morseDirections,
  morseToText,
  textToMorse,
  unsupportedMorseCharacters,
  unsupportedMorseGroups,
  type MorseDirection,
} from "./morse-code"

const directionLabels: Record<MorseDirection, string> = {
  "text-morse": "Text to Morse",
  "morse-text": "Morse to Text",
}

function convert(direction: MorseDirection, input: string): string {
  return direction === "text-morse" ? textToMorse(input) : morseToText(input)
}

function unsupported(direction: MorseDirection, input: string): string[] {
  return direction === "text-morse"
    ? unsupportedMorseCharacters(input)
    : unsupportedMorseGroups(input)
}

export default function MorseCodeTranslator() {
  const [direction, setDirection] = useState<MorseDirection>("text-morse")
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [dropped, setDropped] = useState<string[]>([])
  const [status, setStatus] = useState("")

  function handleConvert() {
    setOutput(convert(direction, input))
    setDropped(unsupported(direction, input))
  }

  function handleClear() {
    setInput("")
    setOutput("")
    setDropped([])
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Direction">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Translation direction</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {morseDirections.map((candidate) => (
              <label
                className={`flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-medium ${
                  direction === candidate
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={candidate}
              >
                <input
                  checked={direction === candidate}
                  className="sr-only"
                  name="morse-direction"
                  onChange={() => setDirection(getMorseDirection(candidate))}
                  type="radio"
                  value={candidate}
                />
                {directionLabels[candidate]}
              </label>
            ))}
          </div>
        </fieldset>
      </ToolPanel>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleConvert} variant="secondary">
          Convert
        </Button>
        <Button onClick={handleClear} variant="quiet">
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ToolPanel
          action={
            input === "" ? null : (
              <CopyButton label="Copy input" onStatus={setStatus} value={input} />
            )
          }
          title="Input"
        >
          <label className="sr-only" htmlFor="morse-input">
            Input text
          </label>
          <textarea
            className="app-input min-h-40 font-mono"
            id="morse-input"
            maxLength={10000}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              direction === "text-morse"
                ? "Enter text..."
                : "Enter morse code (use . - / and spaces)..."
            }
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
          <label className="sr-only" htmlFor="morse-output">
            Converted output
          </label>
          <textarea
            aria-readonly="true"
            className="app-input min-h-40 font-mono"
            id="morse-output"
            readOnly
            value={output}
          />
        </ToolPanel>
      </div>

      {dropped.length > 0 ? (
        <p
          className="rounded-2xl border border-[var(--warning-border,var(--border))] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text)]"
          role="status"
        >
          Some characters could not be translated and were dropped: {dropped.join(" ")}
        </p>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Spaces separate letters, and a slash separates words in the Morse output. The audio playback
        preview is not included in this version.
      </p>
    </div>
  )
}
