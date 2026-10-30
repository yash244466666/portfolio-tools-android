import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import {
  formatScaleFactor,
  maximumIngredientLineChars,
  maximumIngredients,
  maximumRecipeChars,
  maximumServings,
  minimumServings,
  scaleRecipe,
} from "./recipe"

export default function RecipeScaler() {
  const [originalServings, setOriginalServings] = useState("4")
  const [desiredServings, setDesiredServings] = useState("4")
  const [text, setText] = useState("")
  const [status, setStatus] = useState("")

  const result = useMemo(() => {
    if (text.trim() === "") return null
    return scaleRecipe({ originalServings, desiredServings, text })
  }, [desiredServings, originalServings, text])

  const output = result?.status === "ok" ? result.lines.map((line) => line.scaled).join("\n") : ""
  const empty = text.trim() === ""

  return (
    <div className="grid gap-4">
      <ToolPanel title="Scale a recipe">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            hint={`Between ${minimumServings} and ${maximumServings} servings.`}
            htmlFor="recipe-original-servings"
            label="Original servings"
          >
            <input
              autoComplete="off"
              className="app-input font-mono"
              id="recipe-original-servings"
              inputMode="decimal"
              onChange={(event) => setOriginalServings(event.target.value)}
              value={originalServings}
            />
          </Field>
          <Field
            hint={`Between ${minimumServings} and ${maximumServings} servings.`}
            htmlFor="recipe-desired-servings"
            label="Desired servings"
          >
            <input
              autoComplete="off"
              className="app-input font-mono"
              id="recipe-desired-servings"
              inputMode="decimal"
              onChange={(event) => setDesiredServings(event.target.value)}
              value={desiredServings}
            />
          </Field>
        </div>

        <Field
          hint={`One ingredient per line, up to ${maximumIngredients} lines. Metric units show decimals; kitchen units show fractions.`}
          htmlFor="recipe-ingredients"
          label="Ingredients"
        >
          <textarea
            autoComplete="off"
            className="app-input min-h-56 resize-y font-mono"
            id="recipe-ingredients"
            onChange={(event) => setText(event.target.value)}
            placeholder={"2 cups flour\n1 1/2 tsp salt\n1/2 cup sugar\nsalt to taste"}
            spellCheck={false}
            value={text}
          />
        </Field>

        {result?.status === "error" ? (
          <p className="mt-3 text-sm text-[var(--danger-text)]" role="alert">
            {result.message}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="text-link"
            onClick={() => {
              setText("")
              setStatus("")
            }}
            type="button"
          >
            Clear ingredients
          </button>
          <span className="text-xs text-[var(--text-secondary)]">
            {maximumRecipeChars.toLocaleString("en-US")} character limit ·{" "}
            {maximumIngredientLineChars} characters per line
          </span>
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          output ? (
            <CopyButton label="Copy scaled ingredients" onStatus={setStatus} value={output} />
          ) : undefined
        }
        title="Scaled ingredients"
      >
        {empty ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Add ingredient lines to see the scaled amounts. A line without a leading quantity, such
            as “salt to taste”, is left unchanged.
          </p>
        ) : result?.status === "ok" ? (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              Scale factor <strong>×{formatScaleFactor(result.factor)}</strong>
              {result.unscaledCount > 0
                ? ` · ${result.unscaledCount} line${result.unscaledCount === 1 ? "" : "s"} without a quantity left unchanged`
                : ""}
            </p>
            <ResultReveal
              token={`${result.factor}-${result.lines.length}-${result.lines[0]?.scaled ?? ""}`}
            >
              <ul className="mt-3 grid gap-1 font-mono text-sm leading-6" aria-label="Scaled list">
                {result.lines.map((line, index) => (
                  <li key={`${index}-${line.scaled}`}>{line.scaled}</li>
                ))}
              </ul>
            </ResultReveal>
            <p aria-live="polite" className="sr-only" role="status">
              Scaled {result.lines.length} ingredient line{result.lines.length === 1 ? "" : "s"} by
              ×{formatScaleFactor(result.factor)}.
            </p>
          </>
        ) : null}
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Scaling is arithmetic on this device; nothing is saved or uploaded. Units are kept as
        written. Fraction display is approximate to the nearest common kitchen fraction, so check
        large changes before cooking.
      </p>
    </div>
  )
}
