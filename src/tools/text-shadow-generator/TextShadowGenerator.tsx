import { useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildTextShadowDeclaration,
  buildTextShadowValue,
  createTextShadowLayer,
  maximumTextShadowLayers,
  textShadowBounds,
  type TextShadowLayer,
} from "./text-shadow"

function LayerSlider({
  bounds,
  id,
  label,
  onValueChange,
  value,
}: {
  bounds: { readonly min: number; readonly max: number }
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
        <span className="font-mono text-sm text-[var(--text-secondary)]" aria-hidden="true">
          {value}
        </span>
      </div>
      <input
        aria-valuetext={`${value} pixels`}
        className="min-h-12 accent-[var(--primary)]"
        id={id}
        max={bounds.max}
        min={bounds.min}
        onChange={(event) => onValueChange(Number(event.target.value))}
        step={1}
        type="range"
        value={value}
      />
    </div>
  )
}

export default function TextShadowGenerator() {
  const [layers, setLayers] = useState<TextShadowLayer[]>(() => [createTextShadowLayer("layer-1")])
  const [previewText, setPreviewText] = useState("Text Shadow")
  const [status, setStatus] = useState("")
  const nextLayerNumber = useRef(2)

  const declaration = buildTextShadowDeclaration(layers)
  const previewValue = buildTextShadowValue(layers)
  const atLayerLimit = layers.length >= maximumTextShadowLayers

  function updateLayer(id: string, patch: Partial<Omit<TextShadowLayer, "id">>) {
    setLayers((previous) =>
      previous.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    )
  }

  function addLayer() {
    if (atLayerLimit) {
      return
    }
    setLayers((previous) => [
      ...previous,
      createTextShadowLayer(`layer-${nextLayerNumber.current++}`),
    ])
  }

  function removeLayer(id: string) {
    setLayers((previous) =>
      previous.length > 1 ? previous.filter((layer) => layer.id !== id) : previous,
    )
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <span
            aria-hidden="true"
            className="px-4 text-center text-3xl font-bold text-[var(--text)]"
            style={{ textShadow: previewValue }}
          >
            {previewText || "Text Shadow"}
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          The preview text shows the current shadow. Exact rendering depends on your device's
          WebView.
        </p>
      </ToolPanel>

      <ToolPanel title="Preview text">
        <Field htmlFor="text-shadow-preview-text" label="Preview text">
          <input
            className="app-input"
            id="text-shadow-preview-text"
            maxLength={40}
            onChange={(event) => setPreviewText(event.target.value)}
            placeholder="Text Shadow"
            value={previewText}
          />
        </Field>
      </ToolPanel>

      <ToolPanel title="Shadow layers">
        <div className="grid gap-4">
          {layers.map((layer, index) => (
            <fieldset
              className="grid gap-3 rounded-2xl border border-[var(--border)] p-3"
              key={layer.id}
            >
              <legend className="sr-only">Layer {index + 1}</legend>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--text)]">Layer {index + 1}</span>
                {layers.length > 1 ? (
                  <Button
                    aria-label={`Remove layer ${index + 1}`}
                    onClick={() => removeLayer(layer.id)}
                    variant="quiet"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LayerSlider
                  bounds={textShadowBounds.offsetX}
                  id={`text-shadow-${layer.id}-offset-x`}
                  label="Offset X"
                  onValueChange={(offsetX) => updateLayer(layer.id, { offsetX })}
                  value={layer.offsetX}
                />
                <LayerSlider
                  bounds={textShadowBounds.offsetY}
                  id={`text-shadow-${layer.id}-offset-y`}
                  label="Offset Y"
                  onValueChange={(offsetY) => updateLayer(layer.id, { offsetY })}
                  value={layer.offsetY}
                />
                <LayerSlider
                  bounds={textShadowBounds.blur}
                  id={`text-shadow-${layer.id}-blur`}
                  label="Blur"
                  onValueChange={(blur) => updateLayer(layer.id, { blur })}
                  value={layer.blur}
                />
                <div className="flex items-center gap-3">
                  <label className="sr-only" htmlFor={`text-shadow-${layer.id}-color-picker`}>
                    Pick layer {index + 1} color
                  </label>
                  <input
                    className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
                    id={`text-shadow-${layer.id}-color-picker`}
                    onChange={(event) => updateLayer(layer.id, { color: event.target.value })}
                    type="color"
                    value={layer.color}
                  />
                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                    {layer.color}
                  </span>
                </div>
              </div>
            </fieldset>
          ))}
          <div className="grid gap-2">
            <Button
              aria-disabled={atLayerLimit}
              disabled={atLayerLimit}
              onClick={addLayer}
              variant="secondary"
            >
              Add shadow layer
            </Button>
            <p
              className="text-xs text-[var(--text-secondary)]"
              role={atLayerLimit ? "status" : undefined}
            >
              {atLayerLimit
                ? `Layer limit reached (${maximumTextShadowLayers}). Remove a layer to add another.`
                : `Up to ${maximumTextShadowLayers} layers. The first layer is painted on top.`}
            </p>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel
        action={<CopyButton label="Copy CSS" onStatus={setStatus} value={declaration} />}
        title="CSS"
      >
        <p className="break-all font-mono text-sm text-[var(--text)]">{declaration}</p>
        <p aria-live="polite" className="sr-only" role="status">
          {status}
        </p>
      </ToolPanel>
    </div>
  )
}
