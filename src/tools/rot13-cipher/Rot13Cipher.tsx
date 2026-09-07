import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { caesarDecode, caesarShift, caesarShiftBounds, clampCaesarShift } from "./caesar"

export default function Rot13Cipher() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [shift, setShift] = useState(13)
  const [status, setStatus] = useState("")

  function encode() {
    setOutput(caesarShift(input, shift))
  }

  function decode() {
    setOutput(caesarDecode(input, shift))
  }

  function clear() {
    setInput("")
    setOutput("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Shift">
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-[var(--text)]" htmlFor="rot13-shift">
              Shift amount
            </label>
            <span className="font-mono text-sm text-[var(--text-secondary)]" aria-hidden="true">
              {shift}
            </span>
          </div>
          <input
            aria-valuetext={`ROT${shift}`}
            className="min-h-12 accent-[var(--primary)]"
            id="rot13-shift"
            max={caesarShiftBounds.max}
            min={caesarShiftBounds.min}
            onChange={(event) => setShift(clampCaesarShift(Number(event.target.value)))}
            step={1}
            type="range"
            value={shift}
          />
          <p className="text-xs text-[var(--text-secondary)]">
            Current mode: ROT{shift}. The classic ROT13 is the default.
          </p>
        </div>
      </ToolPanel>

      <div className="flex flex-wrap gap-2">
        <Button onClick={encode} variant="secondary">
          Encode
        </Button>
        <Button onClick={decode} variant="secondary">
          Decode
        </Button>
        <Button onClick={clear} variant="quiet">
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
          <label className="sr-only" htmlFor="rot13-input">
            Input text
          </label>
          <textarea
            className="app-input min-h-40 font-mono"
            id="rot13-input"
            maxLength={10000}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Enter text to encode/decode..."
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
          <label className="sr-only" htmlFor="rot13-output">
            Converted output
          </label>
          <textarea
            aria-readonly="true"
            className="app-input min-h-40 font-mono"
            id="rot13-output"
            readOnly
            value={output}
          />
        </ToolPanel>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Caesar ciphers are reversible by anyone who knows the shift. Do not use this tool to protect
        secrets.
      </p>
    </div>
  )
}
