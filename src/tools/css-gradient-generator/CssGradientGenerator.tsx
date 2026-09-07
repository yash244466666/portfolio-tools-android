import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildGradient,
  buildGradientDeclaration,
  gradientAngleBounds,
  gradientTypes,
} from "./gradient"

const defaultColors = ["#6366f1", "#06b6d4", ""]

export default function CssGradientGenerator() {
  const [type, setType] = useState<(typeof gradientTypes)[number]>("linear")
  const [angle, setAngle] = useState(135)
  const [colors, setColors] = useState(defaultColors)
  const [status, setStatus] = useState("")

  const setColor = (index: number, value: string) => {
    setColors((previous) => {
      const next = [...previous]
      next[index] = value
      return next
    })
  }

  const result = buildGradient({ type, angle, colors })
  const declaration = buildGradientDeclaration(result.css)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Preview">
        <div
          aria-hidden="true"
          className="flex h-40 items-center justify-center rounded-2xl border border-[var(--border)] sm:h-56"
          style={{ background: result.css ?? "var(--surface-muted)" }}
        >
          {result.css === null ? (
            <p className="px-4 text-center text-sm text-[var(--text-secondary)]">
              {result.message}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel title="Gradient">
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="sr-only">Gradient type</legend>
          {gradientTypes.map((candidate) => (
            <label key={candidate} className="flex min-h-12 items-center gap-2 text-sm font-medium">
              <input
                checked={type === candidate}
                name="css-gradient-type"
                onChange={() => setType(candidate)}
                type="radio"
                value={candidate}
              />
              {candidate}
            </label>
          ))}
        </fieldset>

        {type !== "radial" ? (
          <div className="mt-4 grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <label
                className="text-sm font-semibold text-[var(--text)]"
                htmlFor="css-gradient-angle"
              >
                Angle
              </label>
              <span aria-hidden="true" className="font-mono text-sm text-[var(--text-secondary)]">
                {angle}°
              </span>
            </div>
            <input
              aria-valuetext={`${angle} degrees`}
              className="min-h-12 accent-[var(--primary)]"
              id="css-gradient-angle"
              max={gradientAngleBounds.max}
              min={gradientAngleBounds.min}
              onChange={(event) => setAngle(Number(event.target.value))}
              step={1}
              type="range"
              value={angle}
            />
          </div>
        ) : null}

        <div className="mt-4 grid gap-4">
          {colors.map((color, index) => (
            <div key={index} className="grid gap-2">
              <label
                className="text-sm font-semibold text-[var(--text)]"
                htmlFor={`css-gradient-color-${index}`}
              >
                {index === 2 ? "Third color" : `Color ${index + 1}`}
              </label>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor={`css-gradient-picker-${index}`}>
                  Pick {index === 2 ? "the third" : `color ${index + 1}`} with the system picker
                </label>
                <input
                  className="h-12 w-14 cursor-pointer rounded-2xl border border-[var(--border)] bg-transparent"
                  disabled={index === 2 && color === ""}
                  id={`css-gradient-picker-${index}`}
                  onChange={(event) => setColor(index, event.target.value)}
                  type="color"
                  value={color === "" ? "#000000" : color}
                />
                <input
                  className="app-input font-mono"
                  id={`css-gradient-color-${index}`}
                  maxLength={7}
                  onChange={(event) => setColor(index, event.target.value)}
                  placeholder={index === 2 ? "Optional" : "#6366f1"}
                  value={color}
                />
                {index === 2 ? (
                  <button
                    className="min-h-12 rounded-2xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)]"
                    onClick={() => setColor(2, color === "" ? "#f59e0b" : "")}
                    type="button"
                  >
                    {color === "" ? "Add" : "Remove"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          declaration === "" ? null : (
            <CopyButton label="Copy CSS" onStatus={setStatus} value={declaration} />
          )
        }
        title="CSS"
      >
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-[var(--text)]">
          {declaration === "" ? result.message : declaration}
        </pre>
        <p aria-live="polite" className="sr-only" role="status">
          {status}
        </p>
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        The preview uses the same gradient value as the copied declaration. The angle applies to
        linear and conic gradients; radial gradients always grow from their center. Everything is
        generated on this device; nothing is saved or uploaded.
      </p>
    </div>
  )
}
