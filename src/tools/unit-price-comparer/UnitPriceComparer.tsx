import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  baseUnitFor,
  formatUnitPrice,
  maximumItems,
  measureUnits,
  parsePrice,
  parseQuantity,
  rankUnitPrices,
  type MeasureUnit,
} from "./unit-price"

interface RowState {
  label: string
  price: string
  quantity: string
  unit: MeasureUnit
}

const initialRows: RowState[] = Array.from({ length: maximumItems }, () => ({
  label: "",
  price: "",
  quantity: "",
  unit: "pc",
}))

export default function UnitPriceComparer() {
  const [rows, setRows] = useState<RowState[]>(initialRows)

  // One parsed view of the rows feeds ranking, validation, and the error
  // props, so every render parses each row exactly once.
  const parsedRows = useMemo(
    () =>
      rows.map((row, index) => {
        const price = row.price.trim() === "" ? null : parsePrice(row.price)
        const quantity = row.quantity.trim() === "" ? null : parseQuantity(row.quantity)
        const priceClamped =
          row.price.trim() !== "" &&
          price !== null &&
          parsePrice(row.price) !== null &&
          row.price.trim() !== "" &&
          Number(row.price) !== price
        return {
          row,
          index,
          price,
          quantity,
          priceClamped,
          quantityInvalid: row.quantity.trim() !== "" && quantity === null,
          priceInvalid: row.price.trim() !== "" && price === null,
          participates: price !== null && quantity !== null,
        }
      }),
    [rows],
  )

  const ranked = useMemo(
    () =>
      rankUnitPrices(
        parsedRows
          .filter((parsed) => parsed.participates)
          .map((parsed) => ({
            label: parsed.row.label.trim() || `Item ${parsed.index + 1}`,
            price: parsed.price as number,
            quantity: parsed.quantity as number,
            unit: parsed.row.unit,
          })),
      ),
    [parsedRows],
  )

  const anyInvalid = parsedRows.some((parsed) => parsed.priceInvalid || parsed.quantityInvalid)

  function updateRow(index: number, patch: Partial<RowState>) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    )
  }

  function reset() {
    setRows(initialRows.map((row) => ({ ...row })))
  }

  const familyRanges = new Map<string, { minimum: number; maximum: number }>()
  for (const item of ranked) {
    const current = familyRanges.get(item.family)
    familyRanges.set(item.family, {
      minimum: Math.min(current?.minimum ?? item.pricePerBaseUnit, item.pricePerBaseUnit),
      maximum: Math.max(current?.maximum ?? item.pricePerBaseUnit, item.pricePerBaseUnit),
    })
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title={`Items (up to ${maximumItems})`}>
        <div className="grid gap-6">
          {parsedRows.map((parsed) => (
            <div className="grid gap-3" key={parsed.index}>
              <p className="text-sm font-semibold text-[var(--text)]">Item {parsed.index + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  hint="Optional."
                  htmlFor={`unit-price-label-${parsed.index + 1}`}
                  label={`Item ${parsed.index + 1} label`}
                >
                  <input
                    className="app-input"
                    id={`unit-price-label-${parsed.index + 1}`}
                    onChange={(event) => updateRow(parsed.index, { label: event.target.value })}
                    placeholder="Big box"
                    value={parsed.row.label}
                  />
                </Field>
                <div className="grid gap-2">
                  <label
                    className="text-sm font-semibold text-[var(--text)]"
                    htmlFor={`unit-price-unit-${parsed.index + 1}`}
                  >
                    Item {parsed.index + 1} unit
                  </label>
                  <select
                    className="app-input"
                    id={`unit-price-unit-${parsed.index + 1}`}
                    onChange={(event) =>
                      updateRow(parsed.index, {
                        unit: event.target.value as MeasureUnit,
                      })
                    }
                    value={parsed.row.unit}
                  >
                    {measureUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  error={parsed.priceInvalid ? "Enter a price of at most 2 decimals." : undefined}
                  hint={parsed.priceClamped ? "Price clamped to the supported maximum." : undefined}
                  htmlFor={`unit-price-price-${parsed.index + 1}`}
                  label={`Item ${parsed.index + 1} price`}
                >
                  <input
                    className="app-input font-mono"
                    id={`unit-price-price-${parsed.index + 1}`}
                    inputMode="decimal"
                    onChange={(event) => updateRow(parsed.index, { price: event.target.value })}
                    placeholder="4.50"
                    value={parsed.row.price}
                  />
                </Field>
                <Field
                  error={parsed.quantityInvalid ? "Enter a quantity greater than 0." : undefined}
                  htmlFor={`unit-price-quantity-${parsed.index + 1}`}
                  label={`Item ${parsed.index + 1} quantity (${parsed.row.unit})`}
                >
                  <input
                    className="app-input font-mono"
                    id={`unit-price-quantity-${parsed.index + 1}`}
                    inputMode="decimal"
                    onChange={(event) => updateRow(parsed.index, { quantity: event.target.value })}
                    placeholder="1.5"
                    value={parsed.row.quantity}
                  />
                </Field>
              </div>
            </div>
          ))}
          <div>
            <Button onClick={reset} variant="quiet">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel title="Cheapest per unit">
        <p aria-live="polite" className="text-sm" role="status">
          {anyInvalid
            ? "Fix the highlighted price or quantity to compare."
            : ranked.length > 0
              ? `Cheapest within each measure family: ${ranked
                  .filter((item) => item.rank === 1)
                  .map(
                    (item) =>
                      `${item.label} at ${formatUnitPrice(item.pricePerBaseUnit)} per ${baseUnitFor(item.unit)}`,
                  )
                  .join(
                    ", ",
                  )}. Families (volume, mass, length, count) are not comparable with each other.`
              : "Enter a price and a quantity for at least one item to compare."}
        </p>
        {ranked.length > 0 && !anyInvalid ? (
          <>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">
                Items ranked cheapest per normalized base unit within each measure family; ties
                share a rank
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  <th scope="col" className="py-2">
                    Item
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Price
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Per base unit
                  </th>
                  <th scope="col" className="py-2 text-right">
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((item, index) => (
                  <tr className="border-t border-[var(--border)]" key={`ranked-${index}`}>
                    <td className="py-2">
                      {item.label}{" "}
                      <span className="text-[var(--text-secondary)]">
                        ({item.quantity} {item.unit})
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono">{item.price}</td>
                    <td className="py-2 text-right font-mono">
                      {formatUnitPrice(item.pricePerBaseUnit)} per {baseUnitFor(item.unit)}
                      {(() => {
                        const range = familyRanges.get(item.family)
                        const span = range ? range.maximum - range.minimum : 0
                        const ratio =
                          span === 0 ? 1 : (range!.maximum - item.pricePerBaseUnit) / span
                        return (
                          <span aria-hidden="true" className="motion-rank">
                            <span
                              className="motion-rank-fill"
                              style={{ transform: `scaleX(${Math.max(0.08, ratio)})` }}
                            />
                          </span>
                        )
                      })()}
                    </td>
                    <td className="py-2 text-right font-mono">{item.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Volumes normalize to ml, weights to g, lengths to m, and counts to pc. Items rank only
              within their own family because milliliters, grams, meters, and pieces cannot be
              compared with each other. Equal per-unit prices share the same rank in input order.
            </p>
          </>
        ) : null}
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
