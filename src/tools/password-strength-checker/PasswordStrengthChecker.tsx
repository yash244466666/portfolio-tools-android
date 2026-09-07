import { useMemo, useState } from "react"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { analyzePassword, maximumPasswordChars } from "./password-strength"

export default function PasswordStrengthChecker() {
  const [password, setPassword] = useState("")

  const analysis = useMemo(() => analyzePassword(password), [password])
  const overLimit = password.length > maximumPasswordChars
  const active = password.length > 0 && !overLimit
  // Only the repo's success/danger tokens are used; the middle bands keep the
  // plain text color so no ad-hoc palette enters the shell.
  const bandColor = analysis.score < 0.5 ? "var(--danger-text)" : "var(--success-text)"

  return (
    <div className="grid gap-4">
      <ToolPanel title="Password">
        <Field
          error={
            overLimit
              ? `The password exceeds the ${maximumPasswordChars.toLocaleString("en-US")} character limit.`
              : undefined
          }
          hint="Analyzed on the device only; nothing is sent or stored. The input clears when you leave the tool."
          htmlFor="password-input"
          label="Password to analyze"
        >
          <input
            autoComplete="off"
            className="app-input font-mono"
            id="password-input"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Type a password to analyze…"
            spellCheck={false}
            type="password"
            value={password}
          />
        </Field>
        <div className="mt-3 grid gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Strength</span>
            <span className="font-semibold" style={active ? { color: bandColor } : undefined}>
              {active ? analysis.bandLabel : "—"}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"
          >
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${active ? analysis.score * 100 : 0}%`,
                backgroundColor: active ? bandColor : "var(--border)",
              }}
            />
          </div>
          <p aria-live="polite" className="sr-only" role="status">
            {active ? `Strength ${analysis.bandLabel}, ${analysis.entropy} bits of entropy.` : ""}
          </p>
        </div>
      </ToolPanel>

      {active ? (
        <>
          <ToolPanel title="Estimate">
            <dl className="grid gap-2">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-[var(--text-secondary)]">Estimated crack time</dt>
                <dd className="font-mono text-sm">{analysis.crackTime}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-[var(--text-secondary)]">Entropy</dt>
                <dd className="font-mono text-sm">{analysis.entropy} bits</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-[var(--text-secondary)]">Length</dt>
                <dd className="font-mono text-sm">{analysis.length}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              The crack-time figure is a rough character-pool estimate, not a promise. Real attacks
              use dictionaries and leaked passwords, so a password that scores well can still be
              weak if it is a known phrase.
            </p>
          </ToolPanel>

          <ToolPanel title="Requirements">
            <ul className="grid gap-2">
              {analysis.checks.map((check) => (
                <li className="flex items-center gap-3" key={check.id}>
                  <span
                    aria-hidden="true"
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      check.pass
                        ? "bg-[var(--surface-muted)] text-[var(--success-text)]"
                        : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {check.pass ? "✓" : "·"}
                  </span>
                  <span className={check.pass ? "font-medium" : "text-[var(--text-secondary)]"}>
                    {check.label}
                  </span>
                  <span className="sr-only">{check.pass ? "met" : "not met"}</span>
                </li>
              ))}
            </ul>
          </ToolPanel>
        </>
      ) : (
        <ToolPanel muted title="Analysis">
          <p className="text-sm text-[var(--text-secondary)]">
            {overLimit
              ? "Shorten the password to analyze it."
              : "Enter a password above to see its strength. The input never leaves the device."}
          </p>
        </ToolPanel>
      )}
    </div>
  )
}
