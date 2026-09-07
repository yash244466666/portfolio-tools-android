import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  clampLoremCount,
  generateLoremIpsum,
  loremUnitBounds,
  loremUnitLabels,
  loremUnits,
  type LoremUnit,
} from "./lorem"

export default function LoremIpsumGenerator() {
  const [count, setCount] = useState("3")
  const [unit, setUnit] = useState<LoremUnit>("paragraphs")
  const [output, setOutput] = useState("")
  const [status, setStatus] = useState("")

  const bounds = loremUnitBounds[unit]
  const parsedCount = Number.parseInt(count, 10)
  const countInvalid = count.trim() === "" || !Number.isFinite(parsedCount)

  function generate() {
    if (countInvalid) return
    const text = generateLoremIpsum(parsedCount, unit)
    setOutput(text)
    setStatus(
      `Generated ${clampLoremCount(parsedCount, unit)} ${loremUnitLabels[unit].toLowerCase()}.`,
    )
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Generator">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={countInvalid ? "Enter a whole number of 1 or more." : undefined}
            hint={`Between ${bounds.min} and ${bounds.max} ${loremUnitLabels[unit].toLowerCase()}.`}
            htmlFor="lorem-count"
            label="Count"
          >
            <input
              className="app-input"
              id="lorem-count"
              inputMode="numeric"
              onChange={(event) => {
                setCount(event.target.value)
                setOutput("")
              }}
              value={count}
            />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium text-[var(--text)]">Unit</legend>
            {loremUnits.map((option) => (
              <label className="flex min-h-12 items-center gap-2 text-sm" key={option}>
                <input
                  checked={unit === option}
                  name="lorem-unit"
                  onChange={() => {
                    setUnit(option)
                    setOutput("")
                  }}
                  type="radio"
                  value={option}
                />
                {loremUnitLabels[option]}
              </label>
            ))}
          </fieldset>
        </div>
        <div className="mt-4">
          <Button disabled={countInvalid} onClick={generate} variant="secondary">
            Generate
          </Button>
        </div>
      </ToolPanel>

      <ToolPanel
        title="Output"
        action={
          output === "" ? null : (
            <CopyButton label="Copy generated text" onStatus={setStatus} value={output} />
          )
        }
      >
        <label className="sr-only" htmlFor="lorem-output">
          Generated text
        </label>
        <textarea
          aria-readonly="true"
          className="app-input min-h-48 resize-y"
          id="lorem-output"
          readOnly
          value={output}
        />
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Words are drawn on this device from the standard lorem ipsum vocabulary. Generation is
        random and nothing is saved or uploaded.
      </p>
    </div>
  )
}
