import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { gcdList, gcdSteps, lcmList, maximumNumberCount, parseIntegerList } from "./gcd-lcm"

export default function GcdLcmCalculator() {
  const [input, setInput] = useState("")

  const outcome = useMemo(() => {
    if (input.trim() === "") return null
    const parsed = parseIntegerList(input)
    if (!parsed.ok) return { parsed, gcd: null, lcm: null, steps: [] }
    return {
      parsed,
      gcd: gcdList(parsed.values),
      lcm: lcmList(parsed.values),
      steps: gcdSteps(parsed.values[0] ?? 0n, parsed.values[1] ?? 0n),
    }
  }, [input])

  const parseError = outcome !== null && !outcome.parsed.ok ? outcome.parsed.error : null
  const gcd = outcome !== null && outcome.parsed.ok ? outcome.gcd : null
  const lcm = outcome !== null && outcome.parsed.ok ? outcome.lcm : null
  const steps = outcome !== null && outcome.parsed.ok ? outcome.steps : []
  const values = outcome !== null && outcome.parsed.ok ? outcome.parsed.values : []

  return (
    <div className="grid gap-4">
      <ToolPanel title="Numbers">
        <Field
          error={parseError ?? undefined}
          hint={`Whole numbers separated by commas, up to ${maximumNumberCount} values of 15 digits each. Results update as you type.`}
          htmlFor="gcd-input"
          label="Numbers"
        >
          <input
            aria-describedby={parseError ? "gcd-input-error" : "gcd-input-hint"}
            className="app-input font-mono"
            id="gcd-input"
            inputMode="numeric"
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. 48, 18, 12"
            value={input}
          />
        </Field>
      </ToolPanel>

      {gcd !== null && lcm !== null ? (
        <>
          <ToolPanel action={<CopyButton label="Copy" value={gcd.toString()} />} title="GCD">
            <p className="font-mono text-3xl font-bold text-[var(--text)]" aria-live="polite">
              {gcd.toString()}
            </p>
          </ToolPanel>

          <ToolPanel action={<CopyButton label="Copy" value={lcm.toString()} />} title="LCM">
            <p className="font-mono text-3xl font-bold text-[var(--text)]" aria-live="polite">
              {lcm.toString()}
            </p>
            {values.some((value) => value === 0n) ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]" role="alert">
                The LCM is 0 because one of the values is 0.
              </p>
            ) : null}
          </ToolPanel>

          <ToolPanel title="Euclidean steps">
            <p className="mb-2 text-xs leading-5 text-[var(--text-secondary)]">
              Shown for the first two numbers; the listed GCD and LCM use all of them.
            </p>
            <ol className="grid gap-1">
              {steps.map((step) => (
                <li className="font-mono text-sm break-all text-[var(--text-secondary)]" key={step}>
                  {step}
                </li>
              ))}
            </ol>
          </ToolPanel>

          <ToolPanel title="Values used" muted>
            <ul className="flex flex-wrap gap-2">
              {values.map((value) => (
                <li
                  className="rounded-xl border border-[var(--border)] px-2 py-1 font-mono text-sm"
                  key={value.toString()}
                >
                  {value.toString()}
                </li>
              ))}
            </ul>
          </ToolPanel>
        </>
      ) : (
        <ToolPanel muted>
          <p className="text-sm text-[var(--text-secondary)]">
            {parseError !== null
              ? "Correct the input above to see the GCD and LCM."
              : "Enter at least two whole numbers to compute their GCD and LCM. All arithmetic is exact."}
          </p>
        </ToolPanel>
      )}

      <p className="text-sm text-[var(--text-secondary)]">
        All arithmetic happens on this device only. Exact big-integer arithmetic avoids the
        floating-point overflow that affects very large products.
      </p>
    </div>
  )
}
