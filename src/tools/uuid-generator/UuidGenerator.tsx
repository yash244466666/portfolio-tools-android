import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { clampUuidCount, formatUuid, uuidBounds } from "./uuid"

export default function UuidGenerator() {
  const [countInput, setCountInput] = useState("1")
  const [uppercase, setUppercase] = useState(false)
  const [withHyphens, setWithHyphens] = useState(true)
  const [uuids, setUuids] = useState<string[]>([])
  const [status, setStatus] = useState("")
  const { random } = usePlatform()

  const count = clampUuidCount(Number(countInput))

  function generate() {
    const results: string[] = []
    for (let index = 0; index < count; index += 1) {
      results.push(formatUuid(random.uuid(), uppercase, withHyphens))
    }
    setUuids(results)
  }

  const allText = uuids.join("\n")

  return (
    <div className="grid gap-4">
      <ToolPanel title="Options">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2" htmlFor="uuid-count">
            <span className="text-sm font-semibold text-[var(--text)]">Count</span>
            <input
              className="app-input"
              id="uuid-count"
              inputMode="numeric"
              max={uuidBounds.max}
              min={uuidBounds.min}
              onChange={(event) => setCountInput(event.target.value)}
              step={1}
              type="number"
              value={countInput}
            />
          </label>
          <div className="grid content-start gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Between {uuidBounds.min} and {uuidBounds.max} UUIDs per batch; other values are
              clamped.
            </p>
            <label className="flex min-h-12 items-center gap-2 text-sm font-medium text-[var(--text)]">
              <input
                aria-label="Uppercase"
                checked={uppercase}
                className="h-5 w-5 accent-[var(--primary)]"
                id="uuid-uppercase"
                onChange={(event) => setUppercase(event.target.checked)}
                type="checkbox"
              />
              Uppercase
            </label>
            <label className="flex min-h-12 items-center gap-2 text-sm font-medium text-[var(--text)]">
              <input
                aria-label="With hyphens"
                checked={withHyphens}
                className="h-5 w-5 accent-[var(--primary)]"
                id="uuid-hyphens"
                onChange={(event) => setWithHyphens(event.target.checked)}
                type="checkbox"
              />
              With hyphens
            </label>
          </div>
        </div>
      </ToolPanel>

      <Button fullWidth onClick={generate} variant="secondary">
        Generate UUIDs
      </Button>

      {uuids.length > 0 ? (
        <ToolPanel
          action={
            <CopyButton
              label={`Copy all ${uuids.length} UUIDs`}
              onStatus={setStatus}
              value={allText}
            />
          }
          title={`Generated UUIDs (${uuids.length})`}
        >
          <label className="sr-only" htmlFor="uuid-output">
            Generated UUIDs
          </label>
          <textarea
            aria-readonly="true"
            className="app-input min-h-40 font-mono"
            id="uuid-output"
            readOnly
            value={allText}
          />
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Generated values are random version-4 UUIDs from the device's secure random source. They are
        not stored anywhere.
      </p>
    </div>
  )
}
