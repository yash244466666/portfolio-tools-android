import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { formatEffectiveValue } from "@/tools/_shared/bounded-parse"
import {
  bmiCategory,
  bmiCategoryLabel,
  computeBmiImperial,
  computeBmiMetric,
  formatBmi,
  kgToLb,
  lbToKg,
  maximumImperialTotalInches,
  maximumMetricHeightCm,
  maximumMetricWeightKg,
  minimumImperialTotalInches,
  minimumImperialWeightLb,
  minimumMetricHeightCm,
  minimumMetricWeightKg,
  parseMeasurement,
  totalInches,
  type BmiSystem,
} from "./bmi"

export default function BmiCalculator() {
  const [system, setSystem] = useState<BmiSystem>("metric")
  const [weightText, setWeightText] = useState("")
  const [heightCmText, setHeightCmText] = useState("")
  const [feetText, setFeetText] = useState("")
  const [inchesText, setInchesText] = useState("")

  // Weight uses a reject policy below its floor: a zero-weight BMI is
  // meaningless, so zero gets a real alert instead of a silent clamp.
  const weight = useMemo(() => {
    const minimum = system === "metric" ? minimumMetricWeightKg : minimumImperialWeightLb
    const maximum = system === "metric" ? maximumMetricWeightKg : 1100
    return parseMeasurement(weightText, minimum, maximum)
  }, [weightText, system])
  const heightCm = useMemo(
    () =>
      system === "metric"
        ? parseMeasurement(heightCmText, minimumMetricHeightCm, maximumMetricHeightCm)
        : null,
    [heightCmText, system],
  )
  const feet = useMemo(
    () => (system === "imperial" ? parseMeasurement(feetText, 0, 8) : null),
    [feetText, system],
  )
  const inches = useMemo(
    () => (system === "imperial" ? parseMeasurement(inchesText, 0, 11) : null),
    [inchesText, system],
  )

  // Zero (or negative) weight parses but is meaningless for a BMI; it gets
  // a real alert instead of a silent clamp to the floor.
  const weightMeaningless =
    weight !== null && /^\d+(?:\.\d+)?$/.test(weightText.trim()) && Number(weightText) <= 0
  const weightInvalid = weightText.trim() !== "" && (weight === null || weightMeaningless)
  const totalInchesValue =
    system === "imperial" && feet !== null && inches !== null
      ? totalInches(feet.value, inches.value)
      : null
  // The imperial height window is validated on the combined total, so
  // 0 ft 0 in and other out-of-window pairs get one clear alert.
  const heightInvalid =
    system === "metric"
      ? heightCmText.trim() !== "" && heightCm === null
      : (feetText.trim() !== "" && feet === null) ||
        (inchesText.trim() !== "" && inches === null) ||
        (totalInchesValue !== null &&
          (totalInchesValue < minimumImperialTotalInches ||
            totalInchesValue > maximumImperialTotalInches))

  const bmi = useMemo(() => {
    if (weight === null || heightInvalid) return null
    if (system === "metric") {
      return heightCm === null ? null : computeBmiMetric(weight.value, heightCm.value)
    }
    if (feet === null || inches === null || totalInchesValue === null) return null
    if (
      totalInchesValue < minimumImperialTotalInches ||
      totalInchesValue > maximumImperialTotalInches
    ) {
      return null
    }
    return computeBmiImperial(weight.value, feet.value, inches.value)
  }, [system, weight, heightCm, feet, inches, totalInchesValue, heightInvalid])

  const category = bmi === null ? null : bmiCategory(bmi)

  // Clamped inputs are disclosed so the effective value is never silent.
  const clampedNotes: string[] = []
  if (weight?.clamped) {
    clampedNotes.push(
      system === "metric"
        ? `Weight clamped to ${formatEffectiveValue(weight.value)} kg.`
        : `Weight clamped to ${formatEffectiveValue(weight.value)} lb.`,
    )
  }
  if (heightCm?.clamped) {
    clampedNotes.push(`Height clamped to ${formatEffectiveValue(heightCm.value)} cm.`)
  }

  function switchSystem(next: BmiSystem) {
    if (next === system) return
    // Convert the retained weight across units instead of reinterpreting it.
    const parsed = parseMeasurement(weightText, 0, Number.MAX_SAFE_INTEGER)
    if (parsed) {
      const converted = next === "imperial" ? kgToLb(parsed.value) : lbToKg(parsed.value)
      setWeightText(String(converted))
    }
    setSystem(next)
  }

  function reset() {
    setWeightText("")
    setHeightCmText("")
    setFeetText("")
    setInchesText("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Measurement system">
        <div aria-label="Measurement system" className="flex flex-wrap gap-2" role="group">
          <Button
            aria-pressed={system === "metric"}
            onClick={() => switchSystem("metric")}
            variant={system === "metric" ? "primary" : "secondary"}
          >
            Metric (kg, cm)
          </Button>
          <Button
            aria-pressed={system === "imperial"}
            onClick={() => switchSystem("imperial")}
            variant={system === "imperial" ? "primary" : "secondary"}
          >
            Imperial (lb, ft + in)
          </Button>
        </div>
      </ToolPanel>

      <ToolPanel title="Your measurements">
        <div className="grid gap-4">
          <Field
            error={
              weightInvalid
                ? system === "metric"
                  ? `Enter a weight of at least ${minimumMetricWeightKg} kg.`
                  : `Enter a weight of at least ${minimumImperialWeightLb} lb.`
                : undefined
            }
            htmlFor="bmi-weight"
            label={system === "metric" ? "Weight (kg)" : "Weight (lb)"}
          >
            <input
              className="app-input font-mono"
              id="bmi-weight"
              inputMode="decimal"
              onChange={(event) => setWeightText(event.target.value)}
              placeholder={system === "metric" ? "70" : "155"}
              value={weightText}
            />
          </Field>
          {system === "metric" ? (
            <Field
              error={
                heightInvalid
                  ? `Enter a height between ${minimumMetricHeightCm} and ${maximumMetricHeightCm} cm.`
                  : undefined
              }
              htmlFor="bmi-height-cm"
              label="Height (cm)"
            >
              <input
                className="app-input font-mono"
                id="bmi-height-cm"
                inputMode="numeric"
                onChange={(event) => setHeightCmText(event.target.value)}
                placeholder="175"
                value={heightCmText}
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                error={heightInvalid ? "Enter a valid height." : undefined}
                htmlFor="bmi-height-feet"
                label="Height (ft)"
              >
                <input
                  className="app-input font-mono"
                  id="bmi-height-feet"
                  inputMode="numeric"
                  onChange={(event) => setFeetText(event.target.value)}
                  placeholder="5"
                  value={feetText}
                />
              </Field>
              <Field
                error={heightInvalid ? "Enter inches from 0 to 11." : undefined}
                htmlFor="bmi-height-inches"
                label="Height (in)"
              >
                <input
                  className="app-input font-mono"
                  id="bmi-height-inches"
                  inputMode="numeric"
                  onChange={(event) => setInchesText(event.target.value)}
                  placeholder="9"
                  value={inchesText}
                />
              </Field>
            </div>
          )}
          {clampedNotes.length > 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{clampedNotes.join(" ")}</p>
          ) : null}
          <div>
            <Button onClick={reset} variant="quiet">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Result">
        <p aria-live="polite" className="text-sm" role="status">
          {bmi !== null && category
            ? `BMI ${formatBmi(bmi)} — ${bmiCategoryLabel(category)}.`
            : heightInvalid || weightInvalid
              ? system === "imperial" && heightInvalid && totalInchesValue !== null
                ? `Enter a height between ${minimumImperialTotalInches} and ${maximumImperialTotalInches} inches (1 ft 8 in to 8 ft 2 in).`
                : "Fix the highlighted measurement to compute your BMI."
              : "Enter your weight and height to see your BMI."}
        </p>
        {bmi !== null ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Category bands are text labels from the WHO adult ranges, shown here as words so no
            color is needed to read the result.
          </p>
        ) : null}
      </ToolPanel>

      <div
        className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 text-sm"
        role="note"
      >
        <p className="font-medium">Estimate only — not medical advice</p>
        <p className="mt-1 text-[var(--text-secondary)]">
          BMI is a rough screening estimate that ignores age, body composition, and other health
          factors. It cannot diagnose anything; talk to a clinician about your health.
        </p>
      </div>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
