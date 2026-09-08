import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { buildGridCss, clampGridGap, gridGapBounds, type GridPlacement } from "./grid"

interface GridItem {
  id: string
  label: string
  column: string
  row: string
}

const initialItems: GridItem[] = [1, 2, 3, 4, 5, 6].map((number) => ({
  id: `grid-item-${number}`,
  label: `Item ${number}`,
  column: "auto",
  row: "auto",
}))

function SliderControl({
  id,
  label,
  onValueChange,
  value,
}: {
  id: string
  label: string
  onValueChange: (value: number) => void
  value: number
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-[var(--text)]" htmlFor={id}>
          {label}
        </label>
        <span aria-hidden="true" className="font-mono text-sm text-[var(--text-secondary)]">
          {value}
        </span>
      </div>
      <input
        className="min-h-12 accent-[var(--primary)]"
        id={id}
        max={gridGapBounds.max}
        min={gridGapBounds.min}
        onChange={(event) => onValueChange(Number(event.target.value))}
        step={1}
        type="range"
        value={value}
      />
    </div>
  )
}

export default function GridGenerator() {
  const [columns, setColumns] = useState("1fr 1fr 1fr")
  const [rows, setRows] = useState("auto")
  const [gap, setGap] = useState(8)
  const [items, setItems] = useState<GridItem[]>(initialItems)
  const [nextItemId, setNextItemId] = useState(initialItems.length + 1)
  const [status, setStatus] = useState("")

  const placements: GridPlacement[] = items.map((item) => ({
    label: item.label,
    column: item.column,
    row: item.row,
  }))
  const css = buildGridCss({ columns, rows, gap }, placements)

  function updateItem(id: string, patch: Partial<GridItem>) {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div
          aria-hidden="true"
          className="min-h-40 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
          style={{
            display: "grid",
            gridTemplateColumns: columns.trim() === "" ? "none" : columns,
            gridTemplateRows: rows.trim() === "" ? "none" : rows,
            gap: `${clampGridGap(gap)}px`,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 text-center text-xs text-[var(--text)]"
              style={{
                gridColumn: item.column.trim() === "" ? "auto" : item.column,
                gridRow: item.row.trim() === "" ? "auto" : item.row,
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel title="Template">
        <Field
          hint="Any valid grid-template-columns value, for example 1fr 1fr 1fr or repeat(3, minmax(0, 1fr))."
          htmlFor="grid-columns"
          label="Columns"
        >
          <input
            className="app-input font-mono"
            id="grid-columns"
            onChange={(event) => setColumns(event.target.value)}
            placeholder="1fr 1fr 1fr"
            spellCheck={false}
            value={columns}
          />
        </Field>
        <div className="mt-4">
          <Field
            hint="Any valid grid-template-rows value, for example auto or 100px 2fr."
            htmlFor="grid-rows"
            label="Rows"
          >
            <input
              className="app-input font-mono"
              id="grid-rows"
              onChange={(event) => setRows(event.target.value)}
              placeholder="auto"
              spellCheck={false}
              value={rows}
            />
          </Field>
        </div>
        <div className="mt-4">
          <SliderControl
            id="grid-gap"
            label="Gap (px)"
            onValueChange={(value) => setGap(clampGridGap(value))}
            value={clampGridGap(gap)}
          />
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          <Button
            onClick={() => {
              setItems((previous) => [
                ...previous,
                {
                  id: `grid-item-${nextItemId}`,
                  label: `Item ${nextItemId}`,
                  column: "auto",
                  row: "auto",
                },
              ])
              setNextItemId((previous) => previous + 1)
            }}
            variant="secondary"
          >
            Add item
          </Button>
        }
        title="Grid items"
      >
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-2xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--text)]">{item.label}</span>
                {items.length > 1 ? (
                  <Button
                    aria-label={`Remove ${item.label}`}
                    onClick={() =>
                      setItems((previous) =>
                        previous.filter((candidate) => candidate.id !== item.id),
                      )
                    }
                    variant="quiet"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  hint="auto or a grid-column value such as 1 / 3."
                  htmlFor={`grid-column-${item.id}`}
                  label={`grid-column for ${item.label}`}
                >
                  <input
                    className="app-input font-mono"
                    id={`grid-column-${item.id}`}
                    onChange={(event) => updateItem(item.id, { column: event.target.value })}
                    placeholder="auto"
                    spellCheck={false}
                    value={item.column}
                  />
                </Field>
                <Field
                  hint="auto or a grid-row value such as 2 / 4."
                  htmlFor={`grid-row-${item.id}`}
                  label={`grid-row for ${item.label}`}
                >
                  <input
                    className="app-input font-mono"
                    id={`grid-row-${item.id}`}
                    onChange={(event) => updateItem(item.id, { row: event.target.value })}
                    placeholder="auto"
                    spellCheck={false}
                    value={item.row}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel
        action={<CopyButton label="Copy CSS" onStatus={setStatus} value={css} />}
        title="CSS"
      >
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
          {css}
        </pre>
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Template text is copied verbatim, so an emptied template is skipped instead of emitting a
        dangling declaration, and placements equal to auto are omitted. The preview renders inside
        this WebView, so exotic template values may lay out differently in older browsers. Nothing
        is saved or uploaded; this tool has no network access.
      </p>
    </div>
  )
}
