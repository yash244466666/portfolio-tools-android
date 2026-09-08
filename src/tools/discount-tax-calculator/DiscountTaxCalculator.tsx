import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  computeDiscountTax,
  formatCents,
  maximumPrice,
  parsePercent,
  parsePriceToCents,
  type DiscountMode,
} from "./discount-tax"

export default function DiscountTaxCalculator() {
  const [priceText, setPriceText] = useState("")
  const [mode, setMode] = useState<DiscountMode>("percent")
  const [discountPercentText, setDiscountPercentText] = useState("")
  const [discountAmountText, setDiscountAmountText] = useState("")
  const [taxText, setTaxText] = useState("")

  const priceCents = useMemo(() => parsePriceToCents(priceText), [priceText])
  const discountPercent = useMemo(() => parsePercent(discountPercentText), [discountPercentText])
  const discountCents = useMemo(
    () => (mode === "flat" ? parsePriceToCents(discountAmountText) : null),
    [discountAmountText, mode],
  )
  const taxPercent = useMemo(() => parsePercent(taxText), [taxText])

  const priceInvalid = priceText.trim() !== "" && priceCents === null
  const discountInvalid =
    mode === "percent"
      ? discountPercentText.trim() !== "" && discountPercent === null
      : discountAmountText.trim() !== "" && discountCents === null
  const taxInvalid = taxText.trim() !== "" && taxPercent === null

  const result =
    priceCents !== null && !priceInvalid && !discountInvalid && !taxInvalid && taxPercent !== null
      ? computeDiscountTax(
          mode === "percent"
            ? {
                priceCents,
                mode,
                discountPercent: discountPercent ?? 0,
                taxPercent,
              }
            : { priceCents, mode, discountCents: discountCents ?? 0, taxPercent },
        )
      : null

  function reset() {
    setPriceText("")
    setMode("percent")
    setDiscountPercentText("")
    setDiscountAmountText("")
    setTaxText("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Price">
        <Field
          error={
            priceInvalid
              ? `Enter an amount between 0 and ${maximumPrice.toLocaleString("en-US")}, with at most 2 decimals.`
              : undefined
          }
          hint="Plain number without a currency symbol."
          htmlFor="discount-price"
          label="Original price"
        >
          <input
            className="app-input font-mono"
            id="discount-price"
            inputMode="decimal"
            onChange={(event) => setPriceText(event.target.value)}
            placeholder="100.00"
            value={priceText}
          />
        </Field>
      </ToolPanel>

      <ToolPanel title="Discount">
        <div className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-[var(--text)]">Discount type</legend>
            <div className="flex flex-wrap gap-2">
              <Button
                aria-pressed={mode === "percent"}
                onClick={() => setMode("percent")}
                variant={mode === "percent" ? "primary" : "secondary"}
              >
                Percent off
              </Button>
              <Button
                aria-pressed={mode === "flat"}
                onClick={() => setMode("flat")}
                variant={mode === "flat" ? "primary" : "secondary"}
              >
                Flat amount off
              </Button>
            </div>
          </fieldset>
          {mode === "percent" ? (
            <Field
              error={discountInvalid ? "Enter a discount percent between 0 and 100." : undefined}
              htmlFor="discount-percent"
              label="Discount percent"
            >
              <input
                className="app-input font-mono"
                id="discount-percent"
                inputMode="decimal"
                onChange={(event) => setDiscountPercentText(event.target.value)}
                placeholder="25"
                value={discountPercentText}
              />
            </Field>
          ) : (
            <Field
              error={discountInvalid ? "Enter a flat discount amount." : undefined}
              hint="A flat discount larger than the price saves the whole price."
              htmlFor="discount-amount"
              label="Flat discount amount"
            >
              <input
                className="app-input font-mono"
                id="discount-amount"
                inputMode="decimal"
                onChange={(event) => setDiscountAmountText(event.target.value)}
                placeholder="20.00"
                value={discountAmountText}
              />
            </Field>
          )}
        </div>
      </ToolPanel>

      <ToolPanel title="Tax">
        <Field
          error={taxInvalid ? "Enter a tax percent between 0 and 100." : undefined}
          hint="Applied after the discount, as stores do."
          htmlFor="discount-tax-percent"
          label="Tax percent"
        >
          <input
            className="app-input font-mono"
            id="discount-tax-percent"
            inputMode="decimal"
            onChange={(event) => setTaxText(event.target.value)}
            placeholder="8"
            value={taxText}
          />
        </Field>
        <div className="mt-3">
          <Button onClick={reset} variant="quiet">
            Reset
          </Button>
        </div>
      </ToolPanel>

      <ToolPanel title="Result">
        <p aria-live="polite" className="text-sm" role="status">
          {result
            ? `You save ${formatCents(result.savedCents)}; the subtotal after discount is ${formatCents(result.subtotalCents)}, tax adds ${formatCents(result.taxCents)}, and the total is ${formatCents(result.totalCents)}.`
            : priceInvalid || discountInvalid || taxInvalid
              ? "Fix the highlighted input to compute the total."
              : "Enter the price, discount, and tax to see each step."}
        </p>
        {result ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Discount and tax computation steps</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <th scope="col" className="py-2">
                  Step
                </th>
                <th scope="col" className="py-2 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Original price</td>
                <td className="py-2 text-right font-mono">{formatCents(priceCents ?? 0)}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Saved by discount</td>
                <td className="py-2 text-right font-mono">{formatCents(result.savedCents)}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Subtotal after discount</td>
                <td className="py-2 text-right font-mono">{formatCents(result.subtotalCents)}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2">Tax added</td>
                <td className="py-2 text-right font-mono">{formatCents(result.taxCents)}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-2 font-semibold">Total to pay</td>
                <td className="py-2 text-right font-mono">{formatCents(result.totalCents)}</td>
              </tr>
            </tbody>
          </table>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Every amount is rounded to whole cents exactly once, so the displayed steps always add up.
        Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
