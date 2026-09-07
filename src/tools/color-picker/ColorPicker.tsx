import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildHarmonyPalette,
  evaluateContrast,
  hexToRgb,
  hslToRgb,
  rgbToHex,
  rgbToHsl,
} from "./color-utils"

interface ColorState {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
}

const initialHex = "#6366f1"
const initialRgb = hexToRgb(initialHex)
const initialHsl = rgbToHsl(initialRgb ?? { r: 0, g: 0, b: 0 })

const initialColorState: ColorState = {
  hex: initialHex,
  rgb: initialRgb ?? { r: 0, g: 0, b: 0 },
  hsl: initialHsl,
}

/** Normalises `#RGB` to `#RRGGBB` and lower-cases; returns null when invalid. */
export function normalizeHex(input: string): string | null {
  const trimmed = input.trim()
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  const six = /^#([0-9a-fA-F]{6})$/.exec(withHash)
  if (six !== null) return `#${six[1]?.toLowerCase()}`
  const three = /^#([0-9a-fA-F]{3})$/.exec(withHash)
  if (three !== null) {
    const digits = (three[1] ?? "")
      .split("")
      .map((digit) => digit + digit)
      .join("")
    return `#${digits.toLowerCase()}`
  }
  return null
}

function ChannelField({
  id,
  label,
  max,
  onValueChange,
  value,
}: {
  id: string
  label: string
  max: number
  onValueChange: (value: number) => void
  value: number
}) {
  return (
    <div className="grid gap-1">
      <label className="text-xs font-semibold text-[var(--text-secondary)]" htmlFor={id}>
        {label}
      </label>
      <input
        className="app-input font-mono"
        id={id}
        inputMode="numeric"
        max={max}
        min={0}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10)
          if (!Number.isNaN(parsed)) onValueChange(parsed)
        }}
        step={1}
        type="number"
        value={value}
      />
    </div>
  )
}

function SwatchButton({
  color,
  label,
  onPick,
}: {
  color: string
  label: string
  onPick: (hex: string) => void
}) {
  return (
    <button
      aria-label={`Use ${label} ${color}`}
      className="flex h-12 min-w-12 flex-col items-center justify-end rounded-2xl border border-[var(--border)] p-1"
      onClick={() => onPick(color)}
      style={{ background: color }}
      type="button"
    >
      <span className="rounded-full bg-[var(--surface-raised)] px-1.5 font-mono text-[10px] leading-4 text-[var(--text)]">
        {color}
      </span>
    </button>
  )
}

export default function ColorPicker() {
  const [color, setColor] = useState(initialColorState)
  const [hexDraft, setHexDraft] = useState(initialColorState.hex)
  const [contrastDraft, setContrastDraft] = useState("#ffffff")
  const [contrastHex, setContrastHex] = useState("#ffffff")
  const [status, setStatus] = useState("")

  const commitHex = (hex: string) => {
    const rgb = hexToRgb(hex)
    if (rgb === null) return
    setColor({ hex, rgb, hsl: rgbToHsl(rgb) })
    setHexDraft(hex)
  }

  const commitRgb = (r: number, g: number, b: number) => {
    const bounded = {
      r: Math.min(255, Math.max(0, r)),
      g: Math.min(255, Math.max(0, g)),
      b: Math.min(255, Math.max(0, b)),
    }
    const hex = rgbToHex(bounded)
    setColor({ hex, rgb: bounded, hsl: rgbToHsl(bounded) })
    setHexDraft(hex)
  }

  const commitHsl = (h: number, s: number, l: number) => {
    const bounded = {
      h: ((Math.round(h) % 360) + 360) % 360,
      s: Math.min(100, Math.max(0, Math.round(s))),
      l: Math.min(100, Math.max(0, Math.round(l))),
    }
    const rgb = hslToRgb(bounded)
    const hex = rgbToHex(rgb)
    setColor({ hex, rgb, hsl: bounded })
    setHexDraft(hex)
  }

  const palette = buildHarmonyPalette(color.hex)
  const verdict = evaluateContrast(color.hex, contrastHex)
  // The draft is what the user sees, so validity follows the draft; the last
  // valid comparison color stays in contrastHex for preview and ratio text.
  const contrastValid = normalizeHex(contrastDraft) !== null

  return (
    <div className="grid gap-4">
      <ToolPanel title="Pick a color">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-[var(--text)]" htmlFor="color-picker-hex">
              Hex
            </label>
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="color-picker-native">
                Pick a color with the system picker
              </label>
              <input
                className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
                id="color-picker-native"
                onChange={(event) => commitHex(event.target.value)}
                type="color"
                value={color.hex}
              />
              <input
                className="app-input font-mono"
                id="color-picker-hex"
                maxLength={7}
                onChange={(event) => {
                  setHexDraft(event.target.value)
                  const normalized = normalizeHex(event.target.value)
                  if (normalized !== null) commitHex(normalized)
                }}
                placeholder="#6366f1"
                value={hexDraft}
              />
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div
              aria-hidden="true"
              className="h-12 flex-1 rounded-2xl border border-[var(--border)]"
              style={{ background: color.hex }}
            />
            <CopyButton label="Copy hex" onStatus={setStatus} value={color.hex} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          <ChannelField
            id="color-picker-red"
            label="R"
            max={255}
            onValueChange={(r) => commitRgb(r, color.rgb.g, color.rgb.b)}
            value={color.rgb.r}
          />
          <ChannelField
            id="color-picker-green"
            label="G"
            max={255}
            onValueChange={(g) => commitRgb(color.rgb.r, g, color.rgb.b)}
            value={color.rgb.g}
          />
          <ChannelField
            id="color-picker-blue"
            label="B"
            max={255}
            onValueChange={(b) => commitRgb(color.rgb.r, color.rgb.g, b)}
            value={color.rgb.b}
          />
          <ChannelField
            id="color-picker-hue"
            label="H"
            max={359}
            onValueChange={(h) => commitHsl(h, color.hsl.s, color.hsl.l)}
            value={color.hsl.h}
          />
          <ChannelField
            id="color-picker-saturation"
            label="S %"
            max={100}
            onValueChange={(s) => commitHsl(color.hsl.h, s, color.hsl.l)}
            value={color.hsl.s}
          />
          <ChannelField
            id="color-picker-lightness"
            label="L %"
            max={100}
            onValueChange={(l) => commitHsl(color.hsl.h, color.hsl.s, l)}
            value={color.hsl.l}
          />
        </div>
      </ToolPanel>

      {palette !== null ? (
        <ToolPanel title="Harmonies">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">Complementary</p>
              <SwatchButton
                color={palette.complementary}
                label="complementary"
                onPick={commitHex}
              />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">Analogous</p>
              <div className="flex gap-2">
                <SwatchButton
                  color={palette.analogous[0] ?? "#000000"}
                  label="analogous plus"
                  onPick={commitHex}
                />
                <SwatchButton
                  color={palette.analogous[1] ?? "#000000"}
                  label="analogous minus"
                  onPick={commitHex}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">Triadic</p>
              <div className="flex gap-2">
                <SwatchButton
                  color={palette.triadic[0] ?? "#000000"}
                  label="triadic one"
                  onPick={commitHex}
                />
                <SwatchButton
                  color={palette.triadic[1] ?? "#000000"}
                  label="triadic two"
                  onPick={commitHex}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">Split complementary</p>
              <div className="flex gap-2">
                <SwatchButton
                  color={palette.splitComplementary[0] ?? "#000000"}
                  label="split complementary one"
                  onPick={commitHex}
                />
                <SwatchButton
                  color={palette.splitComplementary[1] ?? "#000000"}
                  label="split complementary two"
                  onPick={commitHex}
                />
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            Selecting a swatch makes it the current color.
          </p>
        </ToolPanel>
      ) : null}

      <ToolPanel title="Contrast check">
        <div className="grid gap-3">
          <div className="grid gap-2">
            <label
              className="text-sm font-semibold text-[var(--text)]"
              htmlFor="color-picker-contrast"
            >
              Compare against
            </label>
            <input
              className="app-input font-mono"
              id="color-picker-contrast"
              maxLength={7}
              onChange={(event) => {
                setContrastDraft(event.target.value)
                const normalized = normalizeHex(event.target.value)
                if (normalized !== null) setContrastHex(normalized)
              }}
              placeholder="#ffffff"
              value={contrastDraft}
            />
          </div>

          {contrastValid ? (
            <div>
              {verdict === null ? null : (
                <p
                  aria-label="Contrast verdict"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 font-mono text-sm"
                  role="status"
                >
                  {color.hex} on {contrastHex} — {verdict.ratio.toFixed(2)}:1. Normal text AA{" "}
                  {verdict.passesNormalAA ? "passes" : "fails"}, large text AA{" "}
                  {verdict.passesLargeAA ? "passes" : "fails"}, normal text AAA{" "}
                  {verdict.passesNormalAAA ? "passes" : "fails"}, large text AAA{" "}
                  {verdict.passesLargeAAA ? "passes" : "fails"}.
                </p>
              )}
              <div
                className="mt-3 flex min-h-16 items-center justify-center rounded-2xl border border-[var(--border)] p-3 text-base"
                style={{ background: contrastHex, color: color.hex }}
              >
                Sample text
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-[var(--text-secondary)]" role="status">
              Enter a valid hex color such as #ffffff to compare.
            </p>
          )}
        </div>
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Contrast ratios follow the WCAG relative-luminance formula: 4.5:1 for normal-size AA text,
        3:1 for large text, and 7:1 for AAA normal text. Ratios are a floor for readable text, not a
        guarantee a pairing looks good. Everything runs on this device; nothing is saved or
        uploaded.
      </p>
    </div>
  )
}
