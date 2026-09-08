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

  const ranked = useMemo(
    () =>
      rankUnitPrices(
        rows.map((row, index) => ({
          label: row.label.trim() || `Item ${index + 1}`,
          price: parsePrice(row.price) ?? Number.NaN,
          quantity: parseQuantity(row.quantity) ?? Number.NaN,
          unit: row.unit,
        })),
      ),
    [rows],
  )

  const anyInvalid = rows.some(
    (row) =>
      (row.price.trim() !== "" && parsePrice(row.price) === null) ||
      (row.quantity.trim() !== "" && parseQuantity(row.quantity) === null),
  )

  function updateRow(index: number, patch: Partial<RowState>) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    )
  }

  function reset() {
    setRows(initialRows.map((row) => ({ ...row })))
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title={`Items (up to ${maximumItems})`}>
        <div className="grid gap-6">
          {rows.map((row, index) => (
            <div className="grid gap-3" key={index}>
              <p className="text-sm font-semibold text-[var(--text)]">Item {index + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  hint="Optional."
                  htmlFor={`unit-price-label-${index + 1}`}
                  label={`Item ${index + 1} label`}
                >
                  <input
                    className="app-input"
                    id={`unit-price-label-${index + 1}`}
                    onChange={(event) => updateRow(index, { label: event.target.value })}
                    placeholder="Big box"
                    value={row.label}
                  />
                </Field>
                <div className="grid gap-2">
                  <label
                    className="text-sm font-semibold text-[var(--text)]"
                    htmlFor={`unit-price-unit-${index + 1}`}
                  >
                    Item {index + 1} unit
                  </label>
                  <select
                    className="app-input"
                    id={`unit-price-unit-${index + 1}`}
                    onChange={(event) =>
                      updateRow(index, { unit: event.target.value as MeasureUnit })
                    }
                    value={row.unit}
                  >
                    {measureUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  error={
                    row.price.trim() !== "" && parsePrice(row.price) === null
                      ? "Enter a price of at most 2 decimals."
                      : undefined
                  }
                  htmlFor={`unit-price-price-${index + 1}`}
                  label={`Item ${index + 1} price`}
                >
                  <input
                    className="app-input font-mono"
                    id={`unit-price-price-${index + 1}`}
                    inputMode="decimal"
                    onChange={(event) => updateRow(index, { price: event.target.value })}
                    placeholder="4.50"
                    value={row.price}
                  />
                </Field>
                <Field
                  error={
                    row.quantity.trim() !== "" && parseQuantity(row.quantity) === null
                      ? "Enter a quantity greater than 0."
                      : undefined
                  }
                  htmlFor={`unit-price-quantity-${index + 1}`}
                  label={`Item ${index + 1} quantity (${row.unit})`}
                >
                  <input
                    className="app-input font-mono"
                    id={`unit-price-quantity-${index + 1}`}
                    inputMode="decimal"
                    onChange={(event) => updateRow(index, { quantity: event.target.value })}
                    placeholder="1.5"
                    value={row.quantity}
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
              ? `${ranked[0]?.label ?? ""} is the cheapest at ${formatUnitPrice(ranked[0]?.pricePerBaseUnit ?? 0)} per ${baseUnitFor(ranked[0]?.unit ?? "pc")}${ranked.length > 1 ? `; ${ranked.length - 1} more item${ranked.length > 2 ? "s" : ""} compared below.` : "."}`
              : "Enter a price and a quantity for at least one item to compare."}
        </p>
        {ranked.length > 0 ? (
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">
              Items ranked cheapest per normalized base unit; ties share a rank
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
              {ranked.map((item) => (
                <tr className="border-t border-[var(--border)]" key={`${item.label}-${item.price}`}>
                  <td className="py-2">
                    {item.label}{" "}
                    <span className="text-[var(--text-secondary)]">
                      ({item.quantity} {item.unit})
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">{item.price}</td>
                  <td className="py-2 text-right font-mono">
                    {formatUnitPrice(item.pricePerBaseUnit)} per {baseUnitFor(item.unit)}
                  </td>
                  <td className="py-2 text-right font-mono">{item.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
          Volumes normalize to ml, weights to g, lengths to m, and counts to pc. Equal per-unit
          prices share the same rank in input order.
        </p>
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Everything runs on this device; nothing is stored, logged, or uploaded.
      </p>
    </div>
  )
}
