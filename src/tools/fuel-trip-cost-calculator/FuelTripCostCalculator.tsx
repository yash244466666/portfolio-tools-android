import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { formatCents } from "@/tools/_shared/money"
import {
  computeTripCost,
  efficiencyToOppositeMode,
  formatLitres,
  parseDistanceKm,
  parseEfficiency,
  parseFuelPrice,
  parsePassengers,
  type EfficiencyMode,
} from "./fuel-trip"

export default function FuelTripCostCalculator() {
  const [distanceText, setDistanceText] = useState("")
  const [efficiencyText, setEfficiencyText] = useState("")
  const [mode, setMode] = useState<EfficiencyMode>("km-per-litre")
  const [priceText, setPriceText] = useState("")
  const [passengersText, setPassengersText] = useState("1")
  const [roundTrip, setRoundTrip] = useState(false)

  const distance = useMemo(() => parseDistanceKm(distanceText), [distanceText])
  const efficiency = useMemo(() => parseEfficiency(efficiencyText, mode), [efficiencyText, mode])
  const price = useMemo(() => parseFuelPrice(priceText), [priceText])
  const passengers = useMemo(() => parsePassengers(passengersText), [passengersText])
  const distanceInvalid = distanceText.trim() !== "" && distance === null
  const efficiencyInvalid = efficiencyText.trim() !== "" && efficiency === null
  const priceInvalid = priceText.trim() !== "" && price === null
  const passengersInvalid = passengersText.trim() !== "" && passengers === null

  // Clamped inputs disclose their effective values (shared bounded-parse flag).
  const clampedNotes: string[] = []
  if (distance?.clamped) {
    clampedNotes.push(`Distance clamped to ${distance.value} km.`)
  }
  if (efficiency?.clamped) {
    clampedNotes.push(
      mode === "km-per-litre"
        ? `Efficiency clamped to ${efficiency.value} km per litre.`
        : `Efficiency clamped to ${efficiency.value} l per 100 km.`,
    )
  }
  if (passengers?.clamped) {
    clampedNotes.push(`Passenger count clamped to ${passengers.value}.`)
  }

  const result =
    distance !== null &&
    efficiency !== null &&
    price !== null &&
    passengers !== null &&
    !distanceInvalid &&
    !efficiencyInvalid &&
    !priceInvalid &&
    !passengersInvalid
      ? computeTripCost({
          distanceKm: roundTrip ? distance.value * 2 : distance.value,
          efficiency: efficiency.value,
          mode,
          fuelPricePerLitre: price.value,
          passengers: passengers.value,
        })
      : null

  function convertEfficiency() {
    const current = parseEfficiency(efficiencyText, mode)
    if (!current) return
    const nextMode: EfficiencyMode = mode === "km-per-litre" ? "litres-per-100km" : "km-per-litre"
    // The helper clamps into the destination mode's bounds BEFORE the value
    // lands in the field, so the text always matches the effective value.
    const converted = efficiencyToOppositeMode(current.value, mode)
    if (converted !== null) {
      setEfficiencyText(String(converted))
      setMode(nextMode)
    }
  }

  function reset() {
    setDistanceText("")
    setEfficiencyText("")
    setPriceText("")
    setPassengersText("1")
    setRoundTrip(false)
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Trip">
        <div className="grid gap-4">
          <Field
            error={distanceInvalid ? "Enter a distance between 0.1 and 100,000 km." : undefined}
            hint="One-way distance; the round-trip toggle doubles it."
            htmlFor="fuel-distance"
            label="Distance (km)"
          >
            <input
              className="app-input font-mono"
              id="fuel-distance"
              inputMode="decimal"
              onChange={(event) => setDistanceText(event.target.value)}
              placeholder="150"
              value={distanceText}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-[var(--text)]" htmlFor="fuel-mode">
                Efficiency mode
              </label>
              <select
                className="app-input"
                id="fuel-mode"
                onChange={(event) => setMode(event.target.value as EfficiencyMode)}
                value={mode}
              >
                <option value="km-per-litre">Kilometres per litre (km/l)</option>
                <option value="litres-per-100km">Litres per 100 km</option>
              </select>
            </div>
            <Field
              error={
                efficiencyInvalid ? "Enter a valid efficiency for the selected mode." : undefined
              }
              htmlFor="fuel-efficiency"
              label={
                mode === "km-per-litre" ? "Efficiency (km per litre)" : "Efficiency (l per 100 km)"
              }
            >
              <div className="flex gap-2">
                <input
                  className="app-input font-mono"
                  id="fuel-efficiency"
                  inputMode="decimal"
                  onChange={(event) => setEfficiencyText(event.target.value)}
                  placeholder={mode === "km-per-litre" ? "6.5" : "7.5"}
                  value={efficiencyText}
                />
                <Button onClick={convertEfficiency} variant="secondary">
                  Convert
                </Button>
              </div>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={priceInvalid ? "Enter a fuel price of at most 2 decimals." : undefined}
              hint="Price for one litre of fuel."
              htmlFor="fuel-price"
              label="Fuel price per litre"
            >
              <input
                className="app-input font-mono"
                id="fuel-price"
                inputMode="decimal"
                onChange={(event) => setPriceText(event.target.value)}
                placeholder="1.85"
                value={priceText}
              />
            </Field>
            <Field
              error={
                passengersInvalid ? "Enter a whole number of passengers from 1 to 99." : undefined
              }
              htmlFor="fuel-passengers"
              label="Passengers (cost split)"
            >
              <input
                className="app-input font-mono"
                id="fuel-passengers"
                inputMode="numeric"
                onChange={(event) => setPassengersText(event.target.value)}
                value={passengersText}
              />
            </Field>
          </div>
          {clampedNotes.length > 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{clampedNotes.join(" ")}</p>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={roundTrip}
              id="fuel-round-trip"
              onChange={(event) => setRoundTrip(event.target.checked)}
              type="checkbox"
            />
            Round trip (double the distance)
          </label>
          <div>
            <Button onClick={reset} variant="quiet">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Cost result">
        <p aria-live="polite" className="text-sm" role="status">
          {result
            ? `That trip needs ${formatLitres(result.litres)} of fuel, costing ${formatCents(result.totalCostCents)} total — ${formatCents(result.perPassengerCents)} per passenger across ${result.passengers}.`
            : distanceInvalid || efficiencyInvalid || priceInvalid || passengersInvalid
              ? "Fix the highlighted input to compute the cost."
              : "Enter the trip details to see the fuel cost."}
        </p>
        {result ? (
          <dl className="mt-3 grid gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Fuel needed</dt>
              <dd className="font-mono">{formatLitres(result.litres)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Total cost</dt>
              <dd className="font-mono">{formatCents(result.totalCostCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Per passenger</dt>
              <dd className="font-mono">{formatCents(result.perPassengerCents)}</dd>
            </div>
          </dl>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Costs are estimates for the entered numbers — real consumption varies with traffic, terrain,
        and vehicle condition. Everything runs on this device; nothing is stored, logged, or
        uploaded.
      </p>
    </div>
  )
}
