/**
 * Pure glassmorphism declaration generation.
 *
 * Upstream silently substituted white for an unparsable hex color; here an
 * invalid color leaves the CSS suppressed so broken output is never shown or
 * copied. The declaration always includes the `-webkit-backdrop-filter`
 * prefix because older Android WebViews still need it.
 */

export const glassBlurBounds = { min: 0, max: 40 } as const
export const glassBorderWidthBounds = { min: 0, max: 5 } as const
export const glassBorderRadiusBounds = { min: 0, max: 50 } as const

export interface GlassInput {
  blur: number
  opacity: number
  bgColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
}

export function parseGlassHexColor(value: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value.trim())
  const r = match?.[1]
  const g = match?.[2]
  const b = match?.[3]
  if (r === undefined || g === undefined || b === undefined) return null
  return {
    r: Number.parseInt(r, 16),
    g: Number.parseInt(g, 16),
    b: Number.parseInt(b, 16),
  }
}

function clamp(value: number, bounds: { readonly min: number; readonly max: number }): number {
  if (!Number.isFinite(value)) return bounds.min
  return Math.min(bounds.max, Math.max(bounds.min, value))
}

/** Two-decimal opacity with trailing zeros trimmed, e.g. 0.2 -> "0.2". */
export function formatGlassOpacity(opacity: number): string {
  return String(Number(clamp(opacity, { min: 0, max: 1 }).toFixed(2)))
}

export function buildGlassDeclaration(input: GlassInput): string | null {
  const bg = parseGlassHexColor(input.bgColor)
  const border = parseGlassHexColor(input.borderColor)
  if (bg === null || border === null) return null
  const blur = clamp(input.blur, glassBlurBounds)
  const opacity = formatGlassOpacity(input.opacity)
  const borderWidth = clamp(input.borderWidth, glassBorderWidthBounds)
  const borderRadius = clamp(input.borderRadius, glassBorderRadiusBounds)
  return `.glass {
  background: rgba(${bg.r}, ${bg.g}, ${bg.b}, ${opacity});
  backdrop-filter: blur(${blur}px);
  -webkit-backdrop-filter: blur(${blur}px);
  border: ${borderWidth}px solid ${input.borderColor.trim().toLowerCase()};
  border-radius: ${borderRadius}px;
}`
}
