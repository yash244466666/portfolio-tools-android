import { ArrowDownUp } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  convertUnit,
  formatConvertedValue,
  unitCategories,
  units,
  type UnitCategoryId,
} from "@/tools/unit-converter/unit-data"

export default function UnitConverter() {
  const [category, setCategory] = useState<UnitCategoryId>("length")
  const [value, setValue] = useState("1")
  const [fromUnit, setFromUnit] = useState("meter")
  const [toUnit, setToUnit] = useState("kilometer")

  const categoryUnits = units[category]
  const numericValue = Number(value)
  const result = useMemo(
    () => formatConvertedValue(convertUnit(numericValue, fromUnit, toUnit, category)),
    [category, fromUnit, numericValue, toUnit],
  )

  function changeCategory(next: UnitCategoryId) {
    const nextUnits = units[next]
    setCategory(next)
    setFromUnit(nextUnits[0]?.id ?? "")
    setToUnit(nextUnits[1]?.id ?? nextUnits[0]?.id ?? "")
  }

  function swap() {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }

  return (
    <div className="grid gap-4">
      <Field htmlFor="unit-category" label="Measurement type">
        <select
          className="app-input"
          id="unit-category"
          onChange={(event) => changeCategory(event.target.value as UnitCategoryId)}
          value={category}
        >
          {unitCategories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <ToolPanel>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <Field htmlFor="from-value" label="From">
            <div className="grid gap-2">
              <input
                className="app-input font-mono"
                id="from-value"
                inputMode="decimal"
                onChange={(event) => setValue(event.target.value)}
                type="number"
                value={value}
              />
              <select
                aria-label="Source unit"
                className="app-input"
                onChange={(event) => setFromUnit(event.target.value)}
                value={fromUnit}
              >
                {categoryUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label} ({unit.symbol})
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Button
            aria-label="Swap units"
            className="self-center sm:mb-1"
            onClick={swap}
            variant="secondary"
          >
            <ArrowDownUp aria-hidden="true" size={19} />
            <span className="sm:hidden">Swap units</span>
          </Button>

          <Field htmlFor="to-value" label="To">
            <div className="grid gap-2">
              <output className="app-input block min-h-12 overflow-x-auto font-mono" id="to-value">
                {result || "—"}
              </output>
              <select
                aria-label="Destination unit"
                className="app-input"
                onChange={(event) => setToUnit(event.target.value)}
                value={toUnit}
              >
                {categoryUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label} ({unit.symbol})
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </div>
      </ToolPanel>

      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        Digital data uses binary multiples: 1 KB = 1,024 bytes. Months and years are intentionally
        excluded from duration conversion because their lengths vary.
      </p>
    </div>
  )
}
