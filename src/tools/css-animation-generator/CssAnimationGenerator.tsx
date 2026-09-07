import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  animationDelayBounds,
  animationDurationBounds,
  animationTypeOptions,
  buildAnimationCss,
  buildAnimationValue,
  clampDelay,
  clampDuration,
  parseIterations,
  timingFunctionOptions,
  type AnimationTypeId,
  type TimingFunction,
} from "./animation"

export default function CssAnimationGenerator() {
  const [type, setType] = useState<AnimationTypeId>("fadeIn")
  const [duration, setDuration] = useState(1)
  const [delay, setDelay] = useState(0)
  const [iterationText, setIterationText] = useState("1")
  const [timing, setTiming] = useState<TimingFunction>("ease")
  const [playing, setPlaying] = useState(true)
  const [runId, setRunId] = useState(0)
  const [status, setStatus] = useState("")

  const iterations = parseIterations(iterationText)
  const iterationsInvalid = !/^\d+$/.test(iterationText.trim())
  const css = buildAnimationCss({ type, duration, delay, iterations, timing })
  const animationValue = buildAnimationValue({ type, duration, delay, iterations, timing })

  function replay() {
    setPlaying(true)
    // Remounting the preview element restarts the CSS animation.
    setRunId((previous) => previous + 1)
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <div
            key={runId}
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--surface-raised)] text-xs text-[var(--text-secondary)]"
            style={playing ? { animation: animationValue } : undefined}
          >
            Preview
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            aria-pressed={playing}
            onClick={() => setPlaying((previous) => !previous)}
            variant={playing ? "secondary" : "quiet"}
          >
            {playing ? "Pause" : "Resume"}
          </Button>
          {!playing ? <Button onClick={replay}>Replay</Button> : null}
        </div>
      </ToolPanel>

      <ToolPanel title="Animation">
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="text-sm font-semibold text-[var(--text)]">Animation type</legend>
          {animationTypeOptions.map((candidate) => (
            <label
              key={candidate.id}
              className="flex min-h-12 items-center gap-2 text-sm font-medium"
            >
              <input
                checked={type === candidate.id}
                name="css-animation-type"
                onChange={() => setType(candidate.id)}
                type="radio"
                value={candidate.id}
              />
              {candidate.label}
            </label>
          ))}
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <label
                className="text-sm font-semibold text-[var(--text)]"
                htmlFor="css-animation-duration"
              >
                Duration (s)
              </label>
              <span aria-hidden="true" className="font-mono text-sm text-[var(--text-secondary)]">
                {duration}s
              </span>
            </div>
            <input
              className="min-h-12 accent-[var(--primary)]"
              id="css-animation-duration"
              max={animationDurationBounds.max}
              min={animationDurationBounds.min}
              onChange={(event) => setDuration(clampDuration(Number(event.target.value)))}
              step={0.1}
              type="range"
              value={duration}
            />
          </div>
          <div className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <label
                className="text-sm font-semibold text-[var(--text)]"
                htmlFor="css-animation-delay"
              >
                Delay (s)
              </label>
              <span aria-hidden="true" className="font-mono text-sm text-[var(--text-secondary)]">
                {delay}s
              </span>
            </div>
            <input
              className="min-h-12 accent-[var(--primary)]"
              id="css-animation-delay"
              max={animationDelayBounds.max}
              min={animationDelayBounds.min}
              onChange={(event) => setDelay(clampDelay(Number(event.target.value)))}
              step={0.1}
              type="range"
              value={delay}
            />
          </div>
        </div>

        <div className="mt-4">
          <Field
            error={iterationsInvalid ? "Whole iterations are used; 0 means infinite." : undefined}
            hint="0 repeats the animation infinitely."
            htmlFor="css-animation-iterations"
            label="Iterations"
          >
            <input
              className="app-input"
              id="css-animation-iterations"
              inputMode="numeric"
              max={1000}
              min={0}
              onChange={(event) => setIterationText(event.target.value)}
              step={1}
              type="number"
              value={iterationText}
            />
          </Field>
        </div>

        <fieldset className="mt-4 grid gap-2 sm:grid-cols-3">
          <legend className="text-sm font-semibold text-[var(--text)]">Timing function</legend>
          {timingFunctionOptions.map((candidate) => (
            <label key={candidate} className="flex min-h-12 items-center gap-2 text-sm font-medium">
              <input
                checked={timing === candidate}
                name="css-animation-timing"
                onChange={() => setTiming(candidate)}
                type="radio"
                value={candidate}
              />
              {candidate}
            </label>
          ))}
        </fieldset>
      </ToolPanel>

      <ToolPanel
        action={<CopyButton label="Copy CSS" onStatus={setStatus} value={css} />}
        title="CSS"
      >
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
          {css}
        </pre>
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Duration, delay, iterations, and the timing function are clamped to supported ranges, so the
        copied CSS is always well-formed. The preview runs in this WebView; frame timing may vary by
        device. Nothing is saved or uploaded; this tool has no network access.
      </p>
    </div>
  )
}
