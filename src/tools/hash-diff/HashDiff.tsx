import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildHashDiffResult,
  computeHashDiffHash,
  hashDiffAlgorithms,
  maximumSourceLength,
  type HashDiffResult,
} from "./hash-diff"

const limitLabel = maximumSourceLength.toLocaleString("en-US")

const clearedResult = {
  entries: [] as HashDiffResult["entries"],
  identical: true,
}

export default function HashDiff() {
  const [first, setFirst] = useState("")
  const [second, setSecond] = useState("")
  const [result, setResult] = useState<HashDiffResult>(clearedResult)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const firstOverLimit = first.length > maximumSourceLength
  const secondOverLimit = second.length > maximumSourceLength
  const canCompare =
    first !== "" && second !== "" && !firstOverLimit && !secondOverLimit && !running

  async function compare() {
    if (!canCompare) return
    setRunning(true)
    setErrorMessage("")
    setStatus("")
    try {
      const [firstDigests, secondDigests] = await Promise.all([
        Promise.all(
          hashDiffAlgorithms.map(async (algorithm) => {
            const digest = await computeHashDiffHash(algorithm, first)
            return [algorithm, digest] as const
          }),
        ),
        Promise.all(
          hashDiffAlgorithms.map(async (algorithm) => {
            const digest = await computeHashDiffHash(algorithm, second)
            return [algorithm, digest] as const
          }),
        ),
      ])
      setResult(
        buildHashDiffResult(
          new Map(firstDigests.map(([algorithm, digest]) => [algorithm, digest])),
          new Map(secondDigests.map(([algorithm, digest]) => [algorithm, digest])),
        ),
      )
      setStatus("Compared both texts across every algorithm.")
    } catch (error: unknown) {
      setResult(clearedResult)
      setErrorMessage(error instanceof Error ? error.message : "Hashing failed unexpectedly.")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Compare two texts">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={firstOverLimit ? `Text is limited to ${limitLabel} characters.` : undefined}
            hint="Compared as UTF-8 bytes."
            htmlFor="hash-diff-first"
            label="First text"
          >
            <textarea
              className="app-input min-h-24 font-mono"
              id="hash-diff-first"
              onChange={(event) => {
                setFirst(event.target.value)
                setResult(clearedResult)
              }}
              placeholder="Paste the first text…"
              value={first}
            />
          </Field>
          <Field
            error={secondOverLimit ? `Text is limited to ${limitLabel} characters.` : undefined}
            hint="Compared as UTF-8 bytes."
            htmlFor="hash-diff-second"
            label="Second text"
          >
            <textarea
              className="app-input min-h-24 font-mono"
              id="hash-diff-second"
              onChange={(event) => {
                setSecond(event.target.value)
                setResult(clearedResult)
              }}
              placeholder="Paste the second text…"
              value={second}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Button disabled={!canCompare} onClick={() => void compare()} variant="secondary">
            {running ? "Comparing…" : "Compare Hashes"}
          </Button>
        </div>
      </ToolPanel>

      {firstOverLimit || secondOverLimit ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          Each text is limited to {limitLabel} characters. Shorten both texts to compare.
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {result.entries.length > 0 ? (
        <ToolPanel title={result.identical ? "Result — identical" : "Result — different"}>
          <p
            aria-live="polite"
            className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm font-semibold"
            role="status"
          >
            {result.identical
              ? "IDENTICAL — every algorithm produced the same digest for both texts."
              : "DIFFERENT — at least one algorithm produced a different digest."}
          </p>
          <ul className="grid gap-3">
            {result.entries.map((entry) => (
              <li
                className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                key={entry.algorithm}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--text)]">{entry.label}</p>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">
                    {entry.match ? "MATCH" : "DIFFERENT"}
                  </p>
                </div>
                <p className="break-all font-mono text-xs">
                  <span className="sr-only">First text digest: </span>
                  {entry.first || "—"}
                </p>
                <p className="break-all font-mono text-xs">
                  <span className="sr-only">Second text digest: </span>
                  {entry.second || "—"}
                </p>
              </li>
            ))}
          </ul>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Hashes are computed on this device with Web Crypto over the UTF-8 encoding of each text.
        SHA-1 is offered only for legacy checksum lists and is not collision-secure — prefer SHA-256
        or SHA-512. Identical digests are strong evidence the texts are equal, but hashes are not
        cryptographic signatures. Nothing is saved or uploaded.
      </p>
    </div>
  )
}
