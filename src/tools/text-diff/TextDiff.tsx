import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  checkDiffSide,
  diffText,
  markLines,
  maximumSideLineCount,
  maximumSideLength,
} from "./text-diff"

const limitLabel = maximumSideLength.toLocaleString("en-US")
const lineLimitLabel = maximumSideLineCount.toLocaleString("en-US")

export default function TextDiff() {
  const [original, setOriginal] = useState("")
  const [modified, setModified] = useState("")
  const [status, setStatus] = useState("")

  const originalCheck = useMemo(() => checkDiffSide(original), [original])
  const modifiedCheck = useMemo(() => checkDiffSide(modified), [modified])

  const blocked =
    originalCheck.overChars ||
    originalCheck.overLines ||
    modifiedCheck.overChars ||
    modifiedCheck.overLines

  const result = useMemo(() => {
    if (original === "" && modified === "") return null
    if (blocked) return null
    return diffText(original, modified)
  }, [original, modified, blocked])

  function reset() {
    setOriginal("")
    setModified("")
    setStatus("")
  }

  function sideError(name: string, text: string): string | undefined {
    if (text.length > maximumSideLength) {
      return `${name} is limited to ${limitLabel} characters.`
    }
    if (text.split("\n").length > maximumSideLineCount) {
      return `${name} is limited to ${lineLimitLabel} lines.`
    }
    return undefined
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Compare two texts line by line">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={sideError("The original text", original)}
            hint={`Up to ${limitLabel} characters or ${lineLimitLabel} lines.`}
            htmlFor="text-diff-original"
            label="Original text"
          >
            <textarea
              className="app-input min-h-40 font-mono"
              id="text-diff-original"
              onChange={(event) => setOriginal(event.target.value)}
              placeholder="Paste the original text…"
              spellCheck={false}
              value={original}
            />
          </Field>
          <Field
            error={sideError("The modified text", modified)}
            hint={`Up to ${limitLabel} characters or ${lineLimitLabel} lines.`}
            htmlFor="text-diff-modified"
            label="Modified text"
          >
            <textarea
              className="app-input min-h-40 font-mono"
              id="text-diff-modified"
              onChange={(event) => setModified(event.target.value)}
              placeholder="Paste the modified text…"
              spellCheck={false}
              value={modified}
            />
          </Field>
        </div>
      </ToolPanel>

      {result !== null ? (
        <ToolPanel
          title={
            result.addedLines === 0 && result.removedLines === 0
              ? "Result — no line differences"
              : "Result"
          }
          action={
            result.parts.length === 0 ? null : (
              <CopyButton
                label="Copy diff"
                onStatus={setStatus}
                value={result.parts
                  .map((part) =>
                    markLines(
                      part.value,
                      part.type === "added" ? "+" : part.type === "removed" ? "-" : " ",
                    ),
                  )
                  .join("\n")}
              />
            )
          }
        >
          <p
            aria-live="polite"
            className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm font-semibold"
            role="status"
          >
            {result.addedLines} line{result.addedLines === 1 ? "" : "s"} added,{" "}
            {result.removedLines} line{result.removedLines === 1 ? "" : "s"} removed,{" "}
            {result.unchangedLines} line{result.unchangedLines === 1 ? "" : "s"} unchanged.
          </p>
          <div
            className="max-h-96 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5"
            role="figure"
            aria-label="Line-by-line difference"
          >
            {result.addedLines === 0 && result.removedLines === 0 ? (
              <p className="text-sm">The texts are identical.</p>
            ) : (
              result.parts.map((part, index) => (
                <pre
                  className={
                    part.type === "added"
                      ? "whitespace-pre-wrap text-[var(--success-text)]"
                      : part.type === "removed"
                        ? "whitespace-pre-wrap text-[var(--danger-text)]"
                        : "whitespace-pre-wrap text-[var(--text-secondary)]"
                  }
                  key={`${part.type}-${index}`}
                >
                  {markLines(
                    part.value,
                    part.type === "added" ? "+" : part.type === "removed" ? "-" : " ",
                  )}
                </pre>
              ))
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Added lines are marked with + and removed lines with -, so the difference does not rely
            on color alone.
          </p>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Diffing runs on this device line by line, bounded to {limitLabel} characters and{" "}
        {lineLimitLabel} lines per side. Nothing is saved or uploaded.
      </p>

      <div>
        <Button variant="quiet" onClick={reset}>
          Clear
        </Button>
      </div>
    </div>
  )
}
