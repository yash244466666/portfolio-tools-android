import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { createRegexRunner } from "@/tools/regex-tester/regex-client"
import type { RegexRunResult } from "@/tools/regex-tester/regex"
import {
  applyReplacements,
  buildFlags,
  buildRegexPattern,
  findLiteralMatches,
  maximumFindLength,
  maximumSourceLength,
  matchesFromRegexResult,
  type FoundMatch,
} from "./find-replace"

interface FindReplaceState {
  matches: FoundMatch[]
  output: string
  matchCount: number
  running: boolean
  invalidMessage: string
  timedOut: boolean
  truncated: boolean
}

const clearedState: FindReplaceState = {
  matches: [],
  output: "",
  matchCount: 0,
  running: false,
  invalidMessage: "",
  timedOut: false,
  truncated: false,
}

const runDebounceMs = 250

export default function FindReplace() {
  const [find, setFind] = useState("")
  const [replaceWith, setReplaceWith] = useState("")
  const [source, setSource] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [regexMode, setRegexMode] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [state, setState] = useState<FindReplaceState>(clearedState)
  const [status, setStatus] = useState("")

  // Regex mode reuses the terminable evaluation Worker: a hostile pattern is
  // terminated by wall-clock deadline instead of ever freezing the interface.
  const runner = useMemo(() => createRegexRunner(), [])
  useEffect(() => () => runner.dispose(), [runner])

  const findOverLimit = find.length > maximumFindLength
  const sourceOverLimit = source.length > maximumSourceLength
  const searchActive = find !== "" && source !== "" && !findOverLimit && !sourceOverLimit

  // Literal mode is plain string scanning (bounded work by construction), so it
  // is derived during render instead of stored in state.
  const literal = useMemo(() => {
    if (!searchActive || regexMode) return null
    const matches = findLiteralMatches(source, find, caseSensitive, wholeWord)
    const { output, matchCount } = applyReplacements(source, matches, replaceWith)
    return { matches, output, matchCount, truncated: false }
  }, [searchActive, regexMode, source, find, replaceWith, caseSensitive, wholeWord])

  // Regex mode keeps asynchronous results in state; the run is debounced through
  // the Worker with in-flight cancellation and stale-result guarding.
  useEffect(() => {
    if (!searchActive || !regexMode) return
    let stale = false
    const timeout = window.setTimeout(() => {
      setState((previous) => ({ ...previous, running: true }))
      void runner
        .run({
          pattern: buildRegexPattern(find, wholeWord),
          flags: buildFlags(caseSensitive),
          input: source,
        })
        .then((outcome: RegexRunResult) => {
          if (stale) return
          if (outcome.status === "ok") {
            const matches = matchesFromRegexResult(source, outcome.matches)
            const { output, matchCount } = applyReplacements(source, matches, replaceWith)
            setState({
              matches,
              output,
              matchCount,
              running: false,
              invalidMessage: "",
              timedOut: false,
              truncated: outcome.truncated,
            })
            return
          }
          if (outcome.status === "invalid") {
            setState({ ...clearedState, invalidMessage: outcome.message })
            return
          }
          if (outcome.status === "timeout" || outcome.status === "cancelled") {
            setState({ ...clearedState, timedOut: outcome.status === "timeout" })
            return
          }
          // "over-limit" carries a message; "unsupported" means the runtime has
          // no Worker path at all.
          setState({
            ...clearedState,
            invalidMessage:
              outcome.status === "over-limit"
                ? outcome.message
                : "Regex evaluation is unavailable in this environment.",
          })
        })
    }, runDebounceMs)
    return () => {
      stale = true
      window.clearTimeout(timeout)
      runner.cancel()
    }
  }, [searchActive, regexMode, source, find, replaceWith, caseSensitive, wholeWord, runner])

  const regexFailed = regexMode && (state.invalidMessage !== "" || state.timedOut)
  const activeState: FindReplaceState =
    literal !== null ? { ...clearedState, ...literal } : regexFailed ? clearedState : state

  function applyChanges() {
    setSource(activeState.output)
    setFind("")
    setReplaceWith("")
    setState(clearedState)
    setStatus(
      `Applied ${activeState.matchCount} replacement${activeState.matchCount === 1 ? "" : "s"} to the source text.`,
    )
  }

  function reset() {
    setFind("")
    setReplaceWith("")
    setSource("")
    setCaseSensitive(false)
    setRegexMode(false)
    setWholeWord(false)
    setState(clearedState)
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Find and replace">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={
              findOverLimit
                ? `Find patterns are limited to ${maximumFindLength} characters.`
                : undefined
            }
            hint={
              regexMode ? "Interpreted as a regular expression." : "Interpreted as literal text."
            }
            htmlFor="find-replace-find"
            label="Find"
          >
            <textarea
              className="app-input min-h-20 font-mono"
              id="find-replace-find"
              maxLength={maximumSourceLength}
              onChange={(event) => setFind(event.target.value)}
              placeholder="Text or pattern to find..."
              spellCheck={false}
              value={find}
            />
          </Field>
          <Field htmlFor="find-replace-replace" label="Replace with">
            <textarea
              className="app-input min-h-20 font-mono"
              id="find-replace-replace"
              maxLength={maximumSourceLength}
              onChange={(event) => setReplaceWith(event.target.value)}
              placeholder="Replacement text..."
              value={replaceWith}
            />
          </Field>
        </div>
        <fieldset className="mt-4 grid gap-2 sm:grid-cols-3">
          <legend className="sr-only">Search options</legend>
          <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
            <input
              aria-label="Case sensitive"
              checked={caseSensitive}
              className="h-5 w-5 accent-[var(--primary)]"
              id="find-replace-case"
              onChange={(event) => setCaseSensitive(event.target.checked)}
              type="checkbox"
            />
            Case sensitive
          </label>
          <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
            <input
              aria-label="Regex mode"
              checked={regexMode}
              className="h-5 w-5 accent-[var(--primary)]"
              id="find-replace-regex"
              onChange={(event) => setRegexMode(event.target.checked)}
              type="checkbox"
            />
            Regex mode
          </label>
          <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
            <input
              aria-label="Whole word"
              checked={wholeWord}
              className="h-5 w-5 accent-[var(--primary)]"
              id="find-replace-whole-word"
              onChange={(event) => setWholeWord(event.target.checked)}
              type="checkbox"
            />
            Whole word
          </label>
        </fieldset>
      </ToolPanel>

      <ToolPanel
        title="Source text"
        action={
          source === "" ? null : (
            <CopyButton label="Copy source" onStatus={setStatus} value={source} />
          )
        }
      >
        <label className="sr-only" htmlFor="find-replace-source">
          Source text
        </label>
        <textarea
          className="app-input min-h-40 font-mono"
          id="find-replace-source"
          maxLength={maximumSourceLength}
          onChange={(event) => setSource(event.target.value)}
          placeholder="Paste your text here..."
          value={source}
        />
      </ToolPanel>

      {findOverLimit ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          Find patterns are limited to {maximumFindLength} characters. Shorten the pattern.
        </p>
      ) : null}
      {sourceOverLimit ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          The source text is limited to {maximumSourceLength.toLocaleString()} characters. Shorten
          the text.
        </p>
      ) : null}
      {state.invalidMessage && searchActive && regexMode ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          The pattern is not a valid regular expression: {state.invalidMessage}
        </p>
      ) : null}
      {state.timedOut && searchActive && regexMode ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          The search was stopped because it exceeded the time budget. Simplify the pattern.
        </p>
      ) : null}
      {state.running && searchActive && regexMode && !state.invalidMessage ? (
        <p aria-live="polite" className="sr-only" role="status">
          Searching...
        </p>
      ) : null}

      {searchActive && !regexFailed ? (
        <ToolPanel
          title={activeState.matchCount === 1 ? "1 match" : `${activeState.matchCount} matches`}
        >
          {activeState.truncated ? (
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              Showing the first {activeState.matches.length} matches; applying replaces only those.
            </p>
          ) : null}
          <label className="sr-only" htmlFor="find-replace-output">
            Replacement result
          </label>
          <textarea
            aria-readonly="true"
            className="app-input min-h-40 font-mono"
            id="find-replace-output"
            readOnly
            value={activeState.output}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={applyChanges} variant="secondary">
              Apply changes
            </Button>
            <CopyButton label="Copy result" onStatus={setStatus} value={activeState.output} />
          </div>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Literal searches scan the text directly; regex searches run in a time-bounded worker that
        stops hostile patterns. Nothing is saved or uploaded.
      </p>

      <div>
        <Button onClick={reset} variant="quiet">
          Clear
        </Button>
      </div>
    </div>
  )
}
