/**
 * Pure CSS gradient builder. Upstream joined whatever stops the user typed;
 * here colors are validated and at least two stops are required, because a
 * one-stop `linear-gradient(135deg, #6366f1)` is not valid CSS.
 */

export const gradientTypes = ["linear", "radial", "conic"] as const
export type GradientType = (typeof gradientTypes)[number]

export const gradientAngleBounds = { min: 0, max: 360 } as const

export interface GradientInput {
  type: GradientType
  angle: number
  colors: string[]
}

export interface GradientResult {
  css: string | null
  message: string
}

/** Accepts `#RGB` and `#RRGGBB`; returns the canonical six-digit lowercase form. */
export function normalizeGradientColor(input: string): string | null {
  const trimmed = input.trim()
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  const six = /^#([0-9a-fA-F]{6})$/.exec(withHash)
  if (six !== null) return `#${(six[1] ?? "").toLowerCase()}`
  const three = /^#([0-9a-fA-F]{3})$/.exec(withHash)
  if (three !== null) {
    return (
      "#" +
      (three[1] ?? "")
        .split("")
        .map((digit) => digit + digit)
        .join("")
        .toLowerCase()
    )
  }
  return null
}

const clampAngle = (angle: number): number =>
  Math.min(gradientAngleBounds.max, Math.max(gradientAngleBounds.min, Math.round(angle)))

/** Builds the `background` gradient value, or an error for the UI to show. */
export function buildGradient(input: GradientInput): GradientResult {
  const normalized: string[] = []
  for (const color of input.colors) {
    if (color.trim() === "") continue
    const value = normalizeGradientColor(color)
    if (value === null) {
      return { css: null, message: "Colors must be six-digit hex values such as #6366f1." }
    }
    normalized.push(value)
  }
  if (normalized.length < 2) {
    return { css: null, message: "Add at least two colors." }
  }
  const angle = clampAngle(input.angle)
  switch (input.type) {
    case "linear":
      return { css: `linear-gradient(${angle}deg, ${normalized.join(", ")})`, message: "" }
    case "radial":
      return { css: `radial-gradient(circle, ${normalized.join(", ")})`, message: "" }
    case "conic":
      return { css: `conic-gradient(from ${angle}deg, ${normalized.join(", ")})`, message: "" }
  }
}

/** The one-line declaration a user would paste into a stylesheet. */
export function buildGradientDeclaration(css: string | null): string {
  return css === null ? "" : `background: ${css};`
}
