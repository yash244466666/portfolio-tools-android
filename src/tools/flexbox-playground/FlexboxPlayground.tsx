import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  alignItemsOptions,
  buildFlexContainerCss,
  clampFlexFactor,
  clampFlexGap,
  createFlexItem,
  flexFactorBounds,
  flexGapBounds,
  flexDirectionOptions,
  flexWrapOptions,
  justifyContentOptions,
  normalizeFlexBasis,
  type FlexContainerInput,
  type FlexItemInput,
  type FlexWrap,
} from "./flexbox"

type FlexDirection = FlexContainerInput["direction"]
type JustifyContent = FlexContainerInput["justifyContent"]
type AlignItems = FlexContainerInput["alignItems"]

const initialItems = [createFlexItem(1), createFlexItem(2), createFlexItem(3)]

function OptionGroup({
  legend,
  name,
  options,
  value,
  onSelect,
}: {
  legend: string
  name: string
  options: readonly string[]
  value: string
  onSelect: (option: string) => void
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold text-[var(--text)]">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border px-3 text-sm font-medium ${
              value === option
                ? "border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text)]"
                : "border-[var(--border)] text-[var(--text-secondary)]"
            }`}
          >
            <input
              checked={value === option}
              name={name}
              onChange={() => onSelect(option)}
              type="radio"
              value={option}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function SliderControl({
  id,
  label,
  max,
  min,
  onValueChange,
  value,
}: {
  id: string
  label: string
  max: number
  min: number
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
        max={max}
        min={min}
        onChange={(event) => onValueChange(Number(event.target.value))}
        step={1}
        type="range"
        value={value}
      />
    </div>
  )
}

export default function FlexboxPlayground() {
  const [direction, setDirection] = useState<FlexDirection>("row")
  const [justifyContent, setJustifyContent] = useState<JustifyContent>("flex-start")
  const [alignItems, setAlignItems] = useState<AlignItems>("stretch")
  const [flexWrap, setFlexWrap] = useState<FlexWrap>("nowrap")
  const [gap, setGap] = useState(8)
  const [items, setItems] = useState<FlexItemInput[]>(initialItems)
  const [nextItemId, setNextItemId] = useState(initialItems.length + 1)
  const [status, setStatus] = useState("")

  const css = buildFlexContainerCss({ direction, justifyContent, alignItems, flexWrap, gap })

  function updateItem(id: string, patch: Partial<FlexItemInput>) {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div
          aria-hidden="true"
          className="flex min-h-40 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
          style={{
            display: "flex",
            flexDirection: direction,
            justifyContent,
            alignItems,
            flexWrap,
            gap: `${clampFlexGap(gap)}px`,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex min-h-10 min-w-14 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 text-xs text-[var(--text)]"
              style={{
                flexGrow: item.flexGrow,
                flexShrink: item.flexShrink,
                flexBasis: normalizeFlexBasis(item.flexBasis),
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel title="Container">
        <OptionGroup
          legend="Direction"
          name="flexbox-direction"
          onSelect={(option) => setDirection(option as FlexDirection)}
          options={flexDirectionOptions}
          value={direction}
        />
        <div className="mt-4">
          <OptionGroup
            legend="Justify content"
            name="flexbox-justify-content"
            onSelect={(option) => setJustifyContent(option as JustifyContent)}
            options={justifyContentOptions}
            value={justifyContent}
          />
        </div>
        <div className="mt-4">
          <OptionGroup
            legend="Align items"
            name="flexbox-align-items"
            onSelect={(option) => setAlignItems(option as AlignItems)}
            options={alignItemsOptions}
            value={alignItems}
          />
        </div>
        <div className="mt-4">
          <OptionGroup
            legend="Flex wrap"
            name="flexbox-flex-wrap"
            onSelect={(option) => setFlexWrap(option as FlexWrap)}
            options={flexWrapOptions}
            value={flexWrap}
          />
        </div>
        <div className="mt-4">
          <SliderControl
            id="flexbox-gap"
            label="Gap (px)"
            max={flexGapBounds.max}
            min={flexGapBounds.min}
            onValueChange={(value) => setGap(clampFlexGap(value))}
            value={clampFlexGap(gap)}
          />
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          <Button
            onClick={() => {
              setItems((previous) => [...previous, createFlexItem(nextItemId)])
              setNextItemId((previous) => previous + 1)
            }}
            variant="secondary"
          >
            Add item
          </Button>
        }
        title="Flex items"
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
              <div className="grid gap-3 sm:grid-cols-3">
                <SliderControl
                  id={`flex-grow-${item.id}`}
                  label={`Grow for ${item.label}`}
                  max={flexFactorBounds.max}
                  min={flexFactorBounds.min}
                  onValueChange={(value) =>
                    updateItem(item.id, { flexGrow: clampFlexFactor(value) })
                  }
                  value={item.flexGrow}
                />
                <SliderControl
                  id={`flex-shrink-${item.id}`}
                  label={`Shrink for ${item.label}`}
                  max={flexFactorBounds.max}
                  min={flexFactorBounds.min}
                  onValueChange={(value) =>
                    updateItem(item.id, { flexShrink: clampFlexFactor(value) })
                  }
                  value={item.flexShrink}
                />
                <Field
                  hint="auto, 0, up to 1000px, or up to 100%."
                  htmlFor={`flex-basis-${item.id}`}
                  label={`Basis for ${item.label}`}
                >
                  <input
                    className="app-input font-mono"
                    id={`flex-basis-${item.id}`}
                    inputMode="text"
                    maxLength={12}
                    onChange={(event) => updateItem(item.id, { flexBasis: event.target.value })}
                    placeholder="auto"
                    spellCheck={false}
                    value={item.flexBasis}
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
        The declaration covers the flex container; item grow, shrink, and basis values only shape
        the live preview. Flex-basis text is limited to auto, 0, pixels up to 1000, or percentages
        up to 100 so arbitrary text never reaches a CSS property. Nothing is saved or uploaded; this
        tool has no network access.
      </p>
    </div>
  )
}
