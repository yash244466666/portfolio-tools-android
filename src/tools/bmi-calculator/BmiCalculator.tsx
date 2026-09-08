import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  bmiCategory,
  bmiCategoryLabel,
  computeBmiImperial,
  computeBmiMetric,
  formatBmi,
  maximumMetricHeightCm,
  maximumMetricWeightKg,
  minimumMetricHeightCm,
  minimumMetricWeightKg,
  minimumImperialWeightLb,
  parseMeasurement,
  type BmiSystem,
} from "./bmi"

export default function BmiCalculator() {
  const [system, setSystem] = useState<BmiSystem>("metric")
  const [weightText, setWeightText] = useState("")
  const [heightCmText, setHeightCmText] = useState("")
  const [feetText, setFeetText] = useState("")
  const [inchesText, setInchesText] = useState("")

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

  const weightInvalid = weightText.trim() !== "" && weight === null
  const heightInvalid =
    system === "metric"
      ? heightCmText.trim() !== "" && heightCm === null
      : (feetText.trim() !== "" && feet === null) || (inchesText.trim() !== "" && inches === null)

  const bmi = useMemo(() => {
    if (weight === null || heightInvalid) return null
    if (system === "metric") {
      return heightCm === null ? null : computeBmiMetric(weight, heightCm)
    }
    if (feet === null || inches === null) return null
    return computeBmiImperial(weight, feet, inches)
  }, [system, weight, heightCm, feet, inches, heightInvalid])

  const category = bmi === null ? null : bmiCategory(bmi)

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
            onClick={() => setSystem("metric")}
            variant={system === "metric" ? "primary" : "secondary"}
          >
            Metric (kg, cm)
          </Button>
          <Button
            aria-pressed={system === "imperial"}
            onClick={() => setSystem("imperial")}
            variant={system === "imperial" ? "primary" : "secondary"}
          >
            Imperial (lb, ft + in)
          </Button>
        </div>
      </ToolPanel>

      <ToolPanel title="Your measurements">
        <div className="grid gap-4">
          <Field
            error={weightInvalid ? "Enter a valid weight inside the supported range." : undefined}
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
              error={heightInvalid ? "Enter a valid height inside the supported range." : undefined}
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
              ? "Fix the highlighted measurement to compute your BMI."
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
