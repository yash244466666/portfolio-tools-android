import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  detectInvisibleCharacters,
  invisibleCharacterDefinitions,
  maximumSourceLength,
  removeInvisibleCharacters,
} from "./invisible-characters"

const limitLabel = maximumSourceLength.toLocaleString("en-US")

export default function InvisibleCharacterDetector() {
  const [text, setText] = useState("")
  const [status, setStatus] = useState("")
  const overLimit = text.length > maximumSourceLength

  const detection = useMemo(
    () => (overLimit ? null : detectInvisibleCharacters(text)),
    [text, overLimit],
  )

  function removeAll() {
    if (detection === null || detection.totalInvisible === 0) return
    const cleaned = removeInvisibleCharacters(text)
    const removed = text.length - cleaned.length
    setText(cleaned)
    setStatus(`Removed ${removed} invisible character${removed === 1 ? "" : "s"}.`)
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${limitLabel} character limit. Shorten it to scan.`
              : undefined
          }
          hint={`Detection runs as you type, up to ${limitLabel} characters. Zero-width and bidirectional characters are counted by code point.`}
          htmlFor="invisible-character-input"
          label="Text to scan"
        >
          <textarea
            aria-describedby={
              overLimit ? "invisible-character-input-error" : "invisible-character-input-hint"
            }
            className="app-input min-h-32 resize-y"
            id="invisible-character-input"
            onChange={(event) => {
              setText(event.target.value)
              setStatus("")
            }}
            placeholder="Paste text to check for hidden characters…"
            value={text}
          />
        </Field>
      </ToolPanel>

      {overLimit ? (
        <ToolPanel muted>
          <p role="alert">The text exceeds the {limitLabel} character limit. Shorten it to scan.</p>
        </ToolPanel>
      ) : (
        <ToolPanel
          title={
            detection !== null && detection.totalInvisible === 1
              ? "1 invisible character"
              : detection === null || detection.totalInvisible === 0
                ? "Invisible characters"
                : `${detection.totalInvisible} invisible characters`
          }
          action={
            detection !== null && detection.totalInvisible > 0 ? (
              <Button onClick={removeAll} variant="secondary">
                Remove all
              </Button>
            ) : null
          }
        >
          {detection === null ? null : detection.found.length > 0 ? (
            <ul className="grid gap-3">
              {detection.found.map((found) => (
                <li
                  className="grid gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                  key={found.code}
                >
                  <p className="text-sm font-semibold text-[var(--text)]">{found.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {found.code} — {found.count} occurrence{found.count === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]" role="status">
              {text.length === 0
                ? "Enter text above to scan for zero-width characters, hidden spaces, bidirectional marks, and replacement characters."
                : "No invisible characters were detected in this text."}
            </p>
          )}
        </ToolPanel>
      )}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Detection is a bounded scan of the {invisibleCharacterDefinitions.length} characters listed
        in the tool reference. Remove all strips exactly the characters reported above — other text
        is left untouched. Nothing is saved or uploaded.
      </p>
    </div>
  )
}
