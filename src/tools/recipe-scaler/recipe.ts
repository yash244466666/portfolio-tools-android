/**
 * Pure recipe scaling for the Recipe Scaler.
 *
 * Quantities are parsed from the start of each ingredient line (whole numbers,
 * decimals, fractions, mixed numbers, vulgar fractions, and simple ranges) and
 * multiplied by the serving factor. Units are kept exactly as written; only
 * their formatting class decides whether the result is shown as a kitchen
 * fraction (1 1/2 cups) or a metric decimal (125 g). Lines without a leading
 * quantity — "salt to taste", "For the sauce" — pass through unchanged and are
 * counted so the interface can disclose them.
 *
 * Original work for this repository; no upstream code is copied.
 */

export const maximumIngredients = 100
export const maximumIngredientLineChars = 200
export const maximumRecipeChars = 20_000
export const minimumServings = 0.1
export const maximumServings = 1000
export const minimumScaleFactor = 0.01
export const maximumScaleFactor = 100
export const maximumIngredientQuantity = 1_000_000

type UnitKind = "metric" | "fractional"

interface UnitDefinition {
  kind: UnitKind
}

const unitDefinitions: Record<string, UnitDefinition> = {
  // Metric mass and volume: decimals are the natural display.
  g: { kind: "metric" },
  gram: { kind: "metric" },
  grams: { kind: "metric" },
  kg: { kind: "metric" },
  kilogram: { kind: "metric" },
  kilograms: { kind: "metric" },
  mg: { kind: "metric" },
  milligram: { kind: "metric" },
  milligrams: { kind: "metric" },
  ml: { kind: "metric" },
  milliliter: { kind: "metric" },
  milliliters: { kind: "metric" },
  millilitre: { kind: "metric" },
  millilitres: { kind: "metric" },
  l: { kind: "metric" },
  liter: { kind: "metric" },
  liters: { kind: "metric" },
  litre: { kind: "metric" },
  litres: { kind: "metric" },
  // Kitchen measures, imperial mass, and countable items: fractions read best.
  tsp: { kind: "fractional" },
  teaspoon: { kind: "fractional" },
  teaspoons: { kind: "fractional" },
  tbsp: { kind: "fractional" },
  tablespoon: { kind: "fractional" },
  tablespoons: { kind: "fractional" },
  cup: { kind: "fractional" },
  cups: { kind: "fractional" },
  "fl oz": { kind: "fractional" },
  "fluid ounce": { kind: "fractional" },
  "fluid ounces": { kind: "fractional" },
  oz: { kind: "fractional" },
  ounce: { kind: "fractional" },
  ounces: { kind: "fractional" },
  lb: { kind: "fractional" },
  pound: { kind: "fractional" },
  pounds: { kind: "fractional" },
  clove: { kind: "fractional" },
  cloves: { kind: "fractional" },
  slice: { kind: "fractional" },
  slices: { kind: "fractional" },
  can: { kind: "fractional" },
  cans: { kind: "fractional" },
  piece: { kind: "fractional" },
  pieces: { kind: "fractional" },
  pinch: { kind: "fractional" },
  pinches: { kind: "fractional" },
  dash: { kind: "fractional" },
  dashes: { kind: "fractional" },
  packet: { kind: "fractional" },
  packets: { kind: "fractional" },
  bunch: { kind: "fractional" },
  bunches: { kind: "fractional" },
  sprig: { kind: "fractional" },
  sprigs: { kind: "fractional" },
  sheet: { kind: "fractional" },
  sheets: { kind: "fractional" },
  stalk: { kind: "fractional" },
  stalks: { kind: "fractional" },
  head: { kind: "fractional" },
  heads: { kind: "fractional" },
}

const vulgarFractions: Record<string, [number, number]> = {
  "½": [1, 2],
  "⅓": [1, 3],
  "⅔": [2, 3],
  "¼": [1, 4],
  "¾": [3, 4],
  "⅕": [1, 5],
  "⅖": [2, 5],
  "⅗": [3, 5],
  "⅘": [4, 5],
  "⅙": [1, 6],
  "⅚": [5, 6],
  "⅐": [1, 7],
  "⅛": [1, 8],
  "⅜": [3, 8],
  "⅝": [5, 8],
  "⅞": [7, 8],
  "⅑": [1, 9],
  "⅒": [1, 10],
}

/** Rewrites vulgar fractions as spacing-separated ASCII fractions. */
function normalizeVulgarFractions(text: string): string {
  return text.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/g, (character) => {
    const fraction = vulgarFractions[character]
    return fraction === undefined ? character : ` ${fraction[0]}/${fraction[1]}`
  })
}

const quantityAtom = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|\.\d+)`
const quantityPattern = new RegExp(
  String.raw`^(${quantityAtom})(?:\s*[-–]\s*(${quantityAtom}))?(?=\s|$)`,
)

function parseQuantityAtom(atom: string): number | null {
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(atom)
  if (mixed !== null) {
    const whole = Number(mixed[1])
    const numerator = Number(mixed[2])
    const denominator = Number(mixed[3])
    if (denominator === 0) return null
    const value = whole + numerator / denominator
    return Number.isFinite(value) ? value : null
  }
  const fraction = /^(\d+)\/(\d+)$/.exec(atom)
  if (fraction !== null) {
    const denominator = Number(fraction[2])
    if (denominator === 0) return null
    return Number(fraction[1]) / denominator
  }
  const decimal = /^(?:\d+(?:\.\d*)?|\.\d+)$/.exec(atom)
  if (decimal === null) return null
  const value = Number(atom)
  return Number.isFinite(value) ? value : null
}

/** Parses a single quantity atom (no range) in a serving field or line. */
export function parseQuantity(value: string): number | null {
  const normalized = normalizeVulgarFractions(value).trim()
  if (normalized === "" || /\s*[-–]\s*/.test(normalized)) return null
  const parsed = parseQuantityAtom(normalized)
  if (parsed === null || parsed < 0 || parsed > maximumIngredientQuantity) return null
  return parsed
}

function classifyUnit(unitToken: string): UnitKind {
  const normalized = unitToken.toLowerCase().replace(/\.$/u, "")
  return unitDefinitions[normalized]?.kind ?? "fractional"
}

function trimDecimal(value: number): string {
  // Half-up with the same relative guard as the shared money helper: a
  // decimal-to-float product can land just below the half boundary (0.67 g
  // scaled by 1.5 is exactly 1.005 but stores as 1.0049999999999999).
  return String(Math.round(value * 100 * (1 + 8 * Number.EPSILON)) / 100)
}

function formatQuantity(value: number, kind: UnitKind): string {
  if (!Number.isFinite(value)) return ""
  if (value === 0) return "0"
  if (kind === "metric" || value >= 1000) {
    return value < 0.01 ? "<0.01" : trimDecimal(value)
  }

  const whole = Math.floor(value + 1e-9)
  const remainder = value - whole
  for (const denominator of [2, 3, 4, 5, 6, 8, 10, 12, 16]) {
    const numerator = Math.round(remainder * denominator)
    if (Math.abs(remainder - numerator / denominator) > 1e-6) continue
    if (numerator === 0) return String(whole)
    if (numerator === denominator) return String(whole + 1)
    const fraction = `${numerator}/${denominator}`
    return whole > 0 ? `${whole} ${fraction}` : fraction
  }
  return trimDecimal(value)
}

interface IngredientLine {
  scaled: string
  scaledQuantity: boolean
}

function parseAndScaleLine(line: string, factor: number): IngredientLine | { error: string } {
  const normalized = normalizeVulgarFractions(line).trim()
  const match = quantityPattern.exec(normalized)
  if (match === null) {
    // A line that does not begin with a number is a header or an unmeasured
    // ingredient ("salt to taste"); only a line that starts with a digit but
    // still failed to parse is an error.
    if (/^\d|^[./]/u.test(normalized)) {
      return {
        error: "the leading quantity is not a supported whole number, decimal, or fraction.",
      }
    }
    return { scaled: line.trim(), scaledQuantity: false }
  }

  const first = parseQuantityAtom(match[1] ?? "")
  const second = match[2] === undefined ? null : parseQuantityAtom(match[2])
  if (
    first === null ||
    first > maximumIngredientQuantity ||
    (match[2] !== undefined && (second === null || second > maximumIngredientQuantity))
  ) {
    return { error: "the leading quantity is not a supported whole number, decimal, or fraction." }
  }
  const rest = normalized.slice(match[0].length).trim()
  const words = rest === "" ? [] : rest.split(/\s+/)
  const twoWordUnit = words.slice(0, 2).join(" ").toLowerCase().replace(/\.$/u, "")
  const oneWordUnit = (words[0] ?? "").toLowerCase().replace(/\.$/u, "")
  let unit = ""
  let nameWords = words
  if (words.length >= 2 && unitDefinitions[twoWordUnit] !== undefined) {
    unit = words.slice(0, 2).join(" ")
    nameWords = words.slice(2)
  } else if (words.length >= 1 && unitDefinitions[oneWordUnit] !== undefined) {
    unit = words[0] ?? ""
    nameWords = words.slice(1)
  }
  const name = nameWords.join(" ")
  const kind = unit === "" ? "fractional" : classifyUnit(unit)

  if (factor === 1) {
    return { scaled: line.trim(), scaledQuantity: true }
  }
  const scaledFirst = formatQuantity(first * factor, kind)
  const scaledSecond = second === null ? null : formatQuantity(second * factor, kind)
  const quantity = scaledSecond === null ? scaledFirst : `${scaledFirst}–${scaledSecond}`
  const parts = [quantity, unit, name].filter((part) => part !== "")
  for (const part of parts) {
    if (part.includes("\n") || part.includes("\r")) {
      return { error: "the line contains an unsupported line break." }
    }
  }
  return { scaled: parts.join(" "), scaledQuantity: true }
}

export interface ScaledIngredient {
  original: string
  scaled: string
  /** True when a leading quantity was recognized and scaled. */
  scaledQuantity: boolean
}

export type RecipeScaleResult =
  | {
      status: "ok"
      factor: number
      lines: ScaledIngredient[]
      unscaledCount: number
    }
  | { status: "error"; message: string }

/**
 * Scales every quantified ingredient line by desired / original servings.
 * Range endpoints scale independently and keep an en dash. Lines without a
 * leading quantity pass through unchanged.
 */
export function scaleRecipe(input: {
  originalServings: string
  desiredServings: string
  text: string
}): RecipeScaleResult {
  const original = parseQuantity(input.originalServings)
  if (original === null || original < minimumServings || original > maximumServings) {
    return {
      status: "error",
      message: `Enter original servings between ${minimumServings} and ${maximumServings}.`,
    }
  }
  const desired = parseQuantity(input.desiredServings)
  if (desired === null || desired < minimumServings || desired > maximumServings) {
    return {
      status: "error",
      message: `Enter desired servings between ${minimumServings} and ${maximumServings}.`,
    }
  }
  const factor = desired / original
  if (!Number.isFinite(factor) || factor < minimumScaleFactor || factor > maximumScaleFactor) {
    return {
      status: "error",
      message: `The serving change must be between ×${minimumScaleFactor} and ×${maximumScaleFactor}.`,
    }
  }
  if (input.text.length > maximumRecipeChars) {
    return {
      status: "error",
      message: `The ingredient list is limited to ${maximumRecipeChars.toLocaleString("en-US")} characters.`,
    }
  }

  const rawLines = input.text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "")
  if (rawLines.length > maximumIngredients) {
    return {
      status: "error",
      message: `Scale at most ${maximumIngredients} ingredient lines at a time.`,
    }
  }

  const lines: ScaledIngredient[] = []
  let unscaledCount = 0
  for (const [index, line] of rawLines.entries()) {
    if (line.length > maximumIngredientLineChars) {
      return {
        status: "error",
        message: `Line ${index + 1} exceeds ${maximumIngredientLineChars} characters.`,
      }
    }
    const result = parseAndScaleLine(line, factor)
    if ("error" in result) {
      return { status: "error", message: `Line ${index + 1}: ${result.error}` }
    }
    if (!result.scaledQuantity) unscaledCount += 1
    lines.push({ original: line, scaled: result.scaled, scaledQuantity: result.scaledQuantity })
  }

  return { status: "ok", factor, lines, unscaledCount }
}

/** Formats the scale factor without trailing float noise. */
export function formatScaleFactor(factor: number): string {
  if (!Number.isFinite(factor)) return ""
  return Number(factor.toFixed(3)).toString()
}
