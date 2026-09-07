export interface BoxShadowInput {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: string
  opacity: number
}

export const defaultBoxShadowInput: BoxShadowInput = {
  offsetX: 4,
  offsetY: 4,
  blur: 12,
  spread: 0,
  color: "#6366f1",
  opacity: 0.3,
}

export const boxShadowBounds = {
  offsetX: { min: -50, max: 50 },
  offsetY: { min: -50, max: 50 },
  blur: { min: 0, max: 100 },
  spread: { min: -50, max: 50 },
  opacity: { min: 0, max: 1 },
} as const

/** Parses a strict `#RRGGBB` color into its 8-bit channels. */
export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return null
  }
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

/** Formats the alpha channel the way `rgba()` expects, without trailing noise. */
function formatAlpha(opacity: number): string {
  return String(Math.round(opacity * 1000) / 1000)
}

/**
 * Converts a validated `#RRGGBB` color plus an alpha value into a `rgba()`
 * string. Returns `null` when the color is malformed so callers can show a
 * validation error instead of emitting `rgba(NaN, ...)`.
 */
export function hexToRgba(hex: string, opacity: number): string | null {
  const rgb = parseHexColor(hex)
  if (rgb === null) {
    return null
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${formatAlpha(opacity)})`
}

/**
 * Builds the `box-shadow` declaration from bounded slider values. The value
 * order follows the CSS longhand order: offset-x, offset-y, blur, spread.
 */
export function buildBoxShadowCss(input: BoxShadowInput): string | null {
  const rgba = hexToRgba(input.color, input.opacity)
  if (rgba === null) {
    return null
  }
  return `box-shadow: ${input.offsetX}px ${input.offsetY}px ${input.blur}px ${input.spread}px ${rgba};`
}

/** The inline-style shadow value for the live preview (declaration without the prefix). */
export function buildBoxShadowValue(input: BoxShadowInput): string | null {
  const declaration = buildBoxShadowCss(input)
  return declaration === null ? null : declaration.slice("box-shadow: ".length, -1)
}

export function formatOpacityPercent(opacity: number): string {
  return `${Math.round(opacity * 100)}%`
}
