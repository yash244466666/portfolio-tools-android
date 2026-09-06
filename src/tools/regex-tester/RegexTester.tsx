import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { createRegexRunner } from "./regex-client"
import {
  buildHighlightedSegments,
  isValidRegexInputSize,
  maximumInputBytes,
  maximumMatchCount,
  maximumPatternLength,
  type RegexRunResult,
} from "./regex"

const runDebounceMs = 250

/** The engine can report up to `maximumMatchCount` matches; rendering stays bounded too. */
const maximumDisplayedMatches = 50

const initialFlags = "g"

interface RegexTesterState {
  result: RegexRunResult | null
  running: boolean
}

const clearedState: RegexTesterState = { result: null, running: false }

export default function RegexTester() {
  const [pattern, setPattern] = useState("")
  const [flags, setFlags] = useState(initialFlags)
  const [input, setInput] = useState("")
  const [{ result, running }, setState] = useState<RegexTesterState>(clearedState)
  const [status, setStatus] = useState("")

  // The runner owns the evaluation Worker; it terminates a wedged Worker instead of
  // ever letting a hostile pattern freeze the interface.
  const runner = useMemo(() => createRegexRunner(), [])
  useEffect(() => () => runner.dispose(), [runner])

  const patternOverLimit = pattern.length > maximumPatternLength
  const inputOverLimit = !isValidRegexInputSize(input)
  const overLimit = patternOverLimit || inputOverLimit

  useEffect(() => {
    if (!pattern || overLimit) return
    let stale = false
    const timeout = window.setTimeout(() => {
      setState({ result: null, running: true })
      void runner.run({ pattern, flags, input }).then((outcome) => {
        if (stale) return
        setState({ result: outcome, running: false })
      })
    }, runDebounceMs)
    return () => {
      stale = true
      window.clearTimeout(timeout)
      runner.cancel()
    }
  }, [pattern, flags, input, overLimit, runner])

  const matches = useMemo(() => (result?.status === "ok" ? result.matches : []), [result])
  const segments = useMemo(
    () => (result?.status === "ok" ? buildHighlightedSegments(input, result.matches) : []),
    [result, input],
  )
  const invalidMessage = result?.status === "invalid" ? result.message : undefined
  const hasMatches = matches.length > 0
  const matchesText = useMemo(() => matches.map((match) => match.text).join("\n"), [matches])

  function clearResult() {
    setState(clearedState)
  }

  function reset() {
    setPattern("")
    setFlags(initialFlags)
    setInput("")
    setState(clearedState)
    setStatus("Regex tool reset.")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_7rem]">
            <Field
              error={
                patternOverLimit
                  ? `Patterns are limited to ${maximumPatternLength} characters.`
                  : invalidMessage
              }
              hint="Evaluated locally in a time-bounded worker. Nothing is saved or uploaded."
              htmlFor="regex-pattern"
              label="Pattern"
            >
              <input
                aria-describedby={
                  patternOverLimit || invalidMessage ? "regex-pattern-error" : "regex-pattern-hint"
                }
                className="app-input font-mono"
                id="regex-pattern"
                onChange={(event) => {
                  setPattern(event.target.value)
                  clearResult()
                }}
                placeholder="For example \b\w+@\w+\.\w+\b"
                spellCheck={false}
                type="text"
                value={pattern}
              />
            </Field>
            <Field hint="Allowed: d, g, i, m, s, u, v, y" htmlFor="regex-flags" label="Flags">
              <input
                aria-describedby="regex-flags-hint"
                className="app-input font-mono"
                id="regex-flags"
                onChange={(event) => {
                  setFlags(event.target.value)
                  clearResult()
                }}
                spellCheck={false}
                type="text"
                value={flags}
              />
            </Field>
          </div>
          <Field
            error={
              inputOverLimit
                ? `The test string exceeds the ${Math.round(maximumInputBytes / 1024)} KiB limit. Shorten the text to evaluate it.`
                : undefined
            }
            hint={`Text to test against. Maximum ${Math.round(maximumInputBytes / 1024)} KiB.`}
            htmlFor="regex-input"
            label="Test string"
          >
            <textarea
              aria-describedby={inputOverLimit ? "regex-input-error" : "regex-input-hint"}
              className="app-input min-h-40 resize-y font-mono"
              id="regex-input"
              onChange={(event) => {
                setInput(event.target.value)
                clearResult()
              }}
              placeholder="Enter text to test against…"
              spellCheck={false}
              value={input}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <span className="min-h-12" />
            <Button onClick={reset} variant="secondary">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Highlighted matches">
        <div
          aria-busy={running}
          aria-label="Highlighted matches"
          className="min-h-24 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-[var(--text)]"
          role="region"
        >
          {segments.length > 0 ? (
            segments.map((segment, index) =>
              segment.highlighted ? (
                <mark
                  className="rounded-sm bg-[var(--surface-muted)] px-0.5 font-semibold text-[var(--text)] outline outline-1 outline-[var(--border-strong)]"
                  key={index}
                >
                  {segment.text}
                </mark>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )
          ) : running ? (
            <p className="text-[var(--text-secondary)]">Evaluating the pattern…</p>
          ) : (
            <p className="text-[var(--text-secondary)]">Matches appear here as you type.</p>
          )}
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          hasMatches ? (
            <CopyButton label="Copy matches" onStatus={setStatus} value={matchesText} />
          ) : undefined
        }
        title={`Matches (${matches.length})`}
      >
        {hasMatches ? (
          <div className="grid gap-2">
            <ol className="grid gap-2">
              {matches.slice(0, maximumDisplayedMatches).map((match, index) => (
                <li className="text-sm" key={index}>
                  <span className="text-[var(--text-secondary)]">
                    #{index + 1} at index {match.index}:{" "}
                  </span>
                  <span className="font-mono text-[var(--text)]">{match.text}</span>
                  {match.groups.length > 0 ? (
                    <span className="text-xs text-[var(--text-secondary)]">
                      {" "}
                      (groups:{" "}
                      {match.groups
                        .map((group, groupIndex) => `${groupIndex + 1}: ${group ?? "undefined"}`)
                        .join(", ")}
                      )
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className="text-xs text-[var(--text-secondary)]">
              {result?.status === "ok" && result.truncated
                ? `Stopped after ${maximumMatchCount} matches. Simplify the pattern or shorten the text for the full picture.`
                : matches.length > maximumDisplayedMatches
                  ? `Showing the first ${maximumDisplayedMatches} of ${matches.length} matches.`
                  : ""}
            </p>
          </div>
        ) : running ? (
          <p className="text-sm text-[var(--text-secondary)]">Evaluating the pattern…</p>
        ) : result?.status === "invalid" ? (
          <p className="text-sm" role="alert">
            Fix the pattern or flags to see matches.
          </p>
        ) : result?.status === "over-limit" ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Shorten the pattern or test string to see matches.
          </p>
        ) : result?.status === "timeout" ? (
          <p className="text-sm" role="alert">
            The pattern was stopped because it exceeded the time budget. Simplify the pattern or
            shorten the text.
          </p>
        ) : result?.status === "unsupported" ? (
          <p className="text-sm" role="alert">
            Regex evaluation is not available on this device.
          </p>
        ) : result?.status === "ok" ? (
          <p className="text-sm text-[var(--text-secondary)]">No matches found.</p>
        ) : overLimit ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Shorten the pattern or test string to see matches.
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Enter a pattern to see its matches.
          </p>
        )}
      </ToolPanel>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  )
}
