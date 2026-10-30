import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CoinFlip, ResultReveal } from "@/components/motion/primitives"
import { useReducedMotion } from "@/components/motion/use-reduced-motion"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { toSafeErrorMessage } from "@/platform/errors"
import { usePlatform } from "@/platform/platform-context"
import {
  flipCoin,
  maximumItems,
  maximumListChars,
  maximumRangeSpan,
  parseList,
  parseRange,
  pickFromList,
  randomInteger,
  type RandomByteSource,
} from "./random-picker"

type PickMode = "list" | "coin" | "number"

const modeLabels: Record<PickMode, string> = {
  list: "List",
  coin: "Coin flip",
  number: "Number",
}

export default function RandomPicker() {
  const { random } = usePlatform()
  const reducedMotion = useReducedMotion()
  const [mode, setMode] = useState<PickMode>("list")
  const [listText, setListText] = useState("")
  const [minimum, setMinimum] = useState("1")
  const [maximum, setMaximum] = useState("10")
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [flipping, setFlipping] = useState(false)
  const [flipId, setFlipId] = useState(0)
  const [pickId, setPickId] = useState(0)
  const flipTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (flipTimer.current !== null) window.clearTimeout(flipTimer.current)
    }
  }, [])

  function changeMode(next: PickMode) {
    setMode(next)
    setResult("")
    setError("")
    setFlipping(false)
    if (flipTimer.current !== null) window.clearTimeout(flipTimer.current)
  }

  function pick() {
    setError("")
    const source: RandomByteSource = { bytes: (length) => random.bytes(length) }
    try {
      if (mode === "list") {
        const parsed = parseList(listText)
        if (parsed.status === "error") {
          setResult("")
          setError(parsed.message)
          return
        }
        setResult(pickFromList(parsed.items, source))
        setPickId((previous) => previous + 1)
        return
      }
      if (mode === "coin") {
        const face = flipCoin(source)
        setResult(face)
        setFlipId((previous) => previous + 1)
        if (reducedMotion) {
          setFlipping(false)
        } else {
          setFlipping(true)
          if (flipTimer.current !== null) window.clearTimeout(flipTimer.current)
          flipTimer.current = window.setTimeout(() => setFlipping(false), 600)
        }
        return
      }
      const range = parseRange(minimum, maximum)
      if (range.status === "error") {
        setResult("")
        setError(range.message)
        return
      }
      setResult(String(randomInteger(range.minimum, range.maximum, source)))
      setPickId((previous) => previous + 1)
    } catch (pickError: unknown) {
      setResult("")
      setError(toSafeErrorMessage(pickError))
    }
  }

  const actionLabel =
    mode === "list" ? "Pick an item" : mode === "coin" ? "Flip coin" : "Pick a number"

  return (
    <div className="grid gap-4">
      <ToolPanel title="Pick something">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Mode</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(modeLabels) as PickMode[]).map((id) => (
              <button
                aria-pressed={mode === id}
                className="segment"
                key={id}
                onClick={() => changeMode(id)}
                type="button"
              >
                {modeLabels[id]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-4">
          {mode === "list" ? (
            <Field
              hint={`One item per line, up to ${maximumItems} items; duplicates count separately.`}
              htmlFor="random-picker-list"
              label="Items"
            >
              <textarea
                autoComplete="off"
                className="app-input min-h-48 resize-y font-mono"
                id="random-picker-list"
                onChange={(event) => setListText(event.target.value)}
                placeholder={"Pizza\nSushi\nTacos"}
                spellCheck={false}
                value={listText}
              />
            </Field>
          ) : null}

          {mode === "number" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="random-picker-minimum" label="Minimum">
                <input
                  autoComplete="off"
                  className="app-input font-mono"
                  id="random-picker-minimum"
                  inputMode="numeric"
                  onChange={(event) => setMinimum(event.target.value)}
                  value={minimum}
                />
              </Field>
              <Field htmlFor="random-picker-maximum" label="Maximum">
                <input
                  autoComplete="off"
                  className="app-input font-mono"
                  id="random-picker-maximum"
                  inputMode="numeric"
                  onChange={(event) => setMaximum(event.target.value)}
                  value={maximum}
                />
              </Field>
            </div>
          ) : null}

          {mode === "coin" ? (
            <div className="grid gap-3">
              <CoinFlip
                flipping={flipping}
                flipId={flipId}
                result={result === "Heads" || result === "Tails" ? result : null}
              />
              <p className="text-center text-sm leading-6 text-[var(--text-secondary)]">
                One fair coin, drawn from the device&apos;s secure random source.
              </p>
            </div>
          ) : null}

          <div>
            <Button aria-busy={flipping || undefined} disabled={flipping} onClick={pick}>
              {flipping ? "Flipping…" : actionLabel}
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          result ? (
            <CopyButton label="Copy result" onStatus={setStatus} value={result} />
          ) : undefined
        }
        title="Result"
      >
        {result ? (
          <ResultReveal token={`${mode}-${pickId}-${flipping ? "flipping" : result}`}>
            <output
              className="block break-words font-mono text-2xl font-semibold"
              id="random-picker-result"
            >
              {flipping && mode === "coin" ? "Flipping…" : result}
            </output>
            <p aria-live="polite" className="sr-only" role="status">
              {flipping && mode === "coin" ? "Flipping the coin." : `Result: ${result}.`}
            </p>
          </ResultReveal>
        ) : (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {mode === "list"
              ? "Add at least two items, then pick one."
              : mode === "coin"
                ? "Flip the coin to see Heads or Tails."
                : "Choose a range, then pick a number."}
          </p>
        )}
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Draws use the platform secure random source with rejection sampling, so no list position or
        range value is favored. List input stays in memory only; nothing is saved or uploaded.
        Number ranges may span at most {maximumRangeSpan.toLocaleString("en-US")} values, and the
        list is limited to {maximumListChars.toLocaleString("en-US")} characters.
      </p>
    </div>
  )
}
