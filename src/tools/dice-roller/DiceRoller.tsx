import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { maximumGroups, parseDiceNotation, rollGroups, type DiceRoll } from "./dice-roller"

export default function DiceRoller() {
  const { random } = usePlatform()
  const [notation, setNotation] = useState("2d6")
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null)
  const [lastNotation, setLastNotation] = useState<string | null>(null)

  const parsed = useMemo(() => parseDiceNotation(notation), [notation])

  function roll(source: string) {
    const parsed = parseDiceNotation(source)
    if (parsed.status !== "ok") return
    // Fresh uniformly distributed bytes from the platform's secure source.
    const byteStream = () => random.bytes(1)[0] ?? 0
    setLastRoll(rollGroups(parsed.groups, parsed.modifier, byteStream))
    setLastNotation(source)
  }

  function repeatLast() {
    if (lastNotation !== null) roll(lastNotation)
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Dice notation">
        <div className="grid gap-4">
          <Field
            error={parsed.status === "error" ? parsed.message : undefined}
            hint={`Up to ${maximumGroups} groups of 1-20 dice; sides 2, 4, 6, 8, 10, 12, 20, or 100; one modifier up to 999.`}
            htmlFor="dice-notation"
            label="Dice notation"
          >
            <input
              className="app-input font-mono"
              id="dice-notation"
              onChange={(event) => setNotation(event.target.value)}
              placeholder="2d6 + 1d20 + 3"
              value={notation}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={parsed.status !== "ok"} onClick={() => roll(notation)}>
              Roll
            </Button>
            {lastRoll ? (
              <Button onClick={repeatLast} variant="secondary">
                Repeat last roll
              </Button>
            ) : null}
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Result">
        <p aria-live="polite" className="text-sm" role="status">
          {lastRoll
            ? `Total ${lastRoll.total}${lastRoll.modifier > 0 ? ` (including +${lastRoll.modifier})` : ""} from ${lastNotation ?? ""}.`
            : parsed.status === "error"
              ? "Fix the notation to roll."
              : "Enter notation and roll to see the dice."}
        </p>
        {lastRoll ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Per-die results for the last roll</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <th scope="col" className="py-2">
                  Group
                </th>
                <th scope="col" className="py-2 text-right">
                  Dice
                </th>
                <th scope="col" className="py-2 text-right">
                  Group total
                </th>
              </tr>
            </thead>
            <tbody>
              {lastRoll.groups.map((group, groupIndex) => (
                <tr className="border-t border-[var(--border)]" key={`group-${groupIndex}`}>
                  <td className="py-2">{group.label}</td>
                  <td className="py-2 text-right font-mono">
                    {group.dice.map((die) => die.value).join(", ")}
                  </td>
                  <td className="py-2 text-right font-mono">{group.groupTotal}</td>
                </tr>
              ))}
              <tr className="border-t border-[var(--border)]">
                <td className="py-2 font-semibold">Total</td>
                <td className="py-2 text-right" />
                <td className="py-2 text-right font-mono">{lastRoll.total}</td>
              </tr>
            </tbody>
          </table>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Dice come from the device's secure random source with rejection sampling, so every face is
        equally likely and nothing is biased by modulo tricks. Everything runs on this device;
        nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
