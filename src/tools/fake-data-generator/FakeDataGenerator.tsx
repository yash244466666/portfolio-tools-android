import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import {
  clampFakeDataCount,
  fakeDataCountBounds,
  fakeDataTypes,
  generateFakeData,
  type FakeDataTypeId,
} from "./fake-data"

export default function FakeDataGenerator() {
  const { random } = usePlatform()
  const [type, setType] = useState<FakeDataTypeId>("name")
  const [count, setCount] = useState("10")
  const [rows, setRows] = useState<string[]>([])
  const [status, setStatus] = useState("")

  function generate() {
    const randomBytes = random.bytes.bind(random)
    setRows(generateFakeData(type, clampFakeDataCount(count), { randomBytes }))
  }

  function reset() {
    setRows([])
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Choose data">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Data type</legend>
          <div className="flex flex-wrap gap-2">
            {fakeDataTypes.map((option) => (
              <label
                key={option.id}
                className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border px-3 text-sm font-medium ${
                  type === option.id
                    ? "border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text)]"
                    : "border-[var(--border)] text-[var(--text-secondary)]"
                }`}
              >
                <input
                  checked={type === option.id}
                  name="fake-data-type"
                  onChange={() => setType(option.id)}
                  type="radio"
                  value={option.id}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3">
          <Field
            hint={`Between ${fakeDataCountBounds.minimum} and ${fakeDataCountBounds.maximum} items.`}
            htmlFor="fake-data-count"
            label="How many"
          >
            <input
              className="app-input"
              id="fake-data-count"
              inputMode="numeric"
              onChange={(event) => setCount(event.target.value)}
              value={count}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={generate}>Generate</Button>
          <Button onClick={reset} variant="quiet">
            Clear
          </Button>
        </div>
      </ToolPanel>

      {rows.length > 0 ? (
        <ToolPanel
          title="Results"
          action={<CopyButton label="Copy values" onStatus={setStatus} value={rows.join("\n")} />}
        >
          <ul className="grid gap-2">
            {rows.map((row, index) => (
              <li
                className="break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5"
                key={`${row}-${index}`}
              >
                {row}
              </li>
            ))}
          </ul>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Values are invented locally from realistic datasets for test fixtures, UI mockups, and forms
        demos. They are random but not secure, and they do not describe real people, addresses, or
        companies. Nothing is saved or uploaded; this tool has no network access.
      </p>
    </div>
  )
}
