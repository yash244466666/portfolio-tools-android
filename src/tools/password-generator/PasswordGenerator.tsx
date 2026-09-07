import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { analyzePassword } from "@/tools/password-strength-checker/password-strength"
import {
  clampPasswordLength,
  generatePassword,
  maximumPasswordLength,
  minimumPasswordLength,
  passwordCharacterSets,
  type PasswordCharacterSetId,
} from "./password-generator"

export default function PasswordGenerator() {
  const { random } = usePlatform()
  const [length, setLength] = useState(20)
  const [sets, setSets] = useState<PasswordCharacterSetId[]>([
    "lowercase",
    "uppercase",
    "numbers",
    "symbols",
  ])
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const noSets = sets.length === 0
  const lengthValue = clampPasswordLength(length)

  function toggleSet(id: PasswordCharacterSetId) {
    setSets((previous) =>
      previous.includes(id) ? previous.filter((set) => set !== id) : [...previous, id],
    )
    setPassword("")
    setErrorMessage("")
  }

  function generate() {
    if (noSets) {
      setErrorMessage("Select at least one character set.")
      setPassword("")
      return
    }
    try {
      const generated = generatePassword({ length: lengthValue, sets }, (count) =>
        random.bytes(count),
      )
      setPassword(generated)
      setErrorMessage("")
      setStatus("Generated a new password on this device.")
    } catch (error: unknown) {
      setPassword("")
      setErrorMessage(
        error instanceof Error ? error.message : "Password generation failed unexpectedly.",
      )
    }
  }

  const analysis = password === "" ? null : analyzePassword(password)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Generate a password">
        <Field
          error={errorMessage === "" ? undefined : errorMessage}
          hint={`Between ${minimumPasswordLength} and ${maximumPasswordLength} characters.`}
          htmlFor="password-generator-length"
          label="Length"
        >
          <input
            className="app-input max-w-32"
            id="password-generator-length"
            max={maximumPasswordLength}
            min={minimumPasswordLength}
            onChange={(event) => {
              setLength(Number.parseInt(event.target.value, 10))
              setPassword("")
              setErrorMessage("")
            }}
            type="number"
            value={Number.isFinite(length) ? length : ""}
          />
        </Field>

        <fieldset className="mt-3 grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Character sets</legend>
          {passwordCharacterSets.map((set) => (
            <label className="flex min-h-12 items-center gap-2 text-sm font-medium" key={set.id}>
              <input
                aria-label={set.label}
                checked={sets.includes(set.id)}
                className="h-5 w-5 accent-[var(--primary)]"
                onChange={() => toggleSet(set.id)}
                type="checkbox"
              />
              {set.label}
            </label>
          ))}
        </fieldset>

        <div className="mt-3">
          <Button disabled={noSets} onClick={generate} variant="secondary">
            Generate
          </Button>
        </div>
        {noSets ? (
          <p className="mt-2 text-sm text-[var(--danger-text)]" role="alert">
            Select at least one character set to generate a password.
          </p>
        ) : null}
      </ToolPanel>

      {password !== "" && analysis !== null ? (
        <ToolPanel title="Generated password">
          <p
            aria-readonly="true"
            aria-label="Generated password"
            className="break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-base"
          >
            {password}
          </p>
          <p
            aria-live="polite"
            className="mt-3 text-sm font-semibold text-[var(--text)]"
            role="status"
          >
            Strength: {analysis.bandLabel} — {analysis.entropy} bits of entropy, roughly{" "}
            {analysis.crackTime.toLowerCase()} to brute-force.
          </p>
          <div className="mt-3">
            <CopyButton label="Copy password" onStatus={setStatus} sensitive value={password} />
          </div>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Passwords are generated on this device with the platform's secure random source and every
        character is drawn uniformly, so no character is favored. Generated passwords are never
        stored, logged, or uploaded; copying is a manual action only.
      </p>
    </div>
  )
}
