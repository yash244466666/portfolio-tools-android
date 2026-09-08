/**
 * Pure neumorphism declaration generation.
 *
 * Shape variants follow the classic soft-UI recipe: flat keeps the base
 * color, convex/concave add a 145-degree gradient across the two shadow
 * tones, and pressed moves both shadows inset. Invalid hex colors suppress
 * the CSS rather than silently substituting a fallback color like upstream.
 */

export type NeumorphismShape = "flat" | "convex" | "concave" | "pressed"

export const neumorphismShapes: readonly { id: NeumorphismShape; label: string }[] = [
  { id: "flat", label: "Flat" },
  { id: "convex", label: "Convex" },
  { id: "concave", label: "Concave" },
  { id: "pressed", label: "Pressed" },
]

export const neumorphismSizeBounds = { min: 80, max: 250 } as const
export const neumorphismRadiusBounds = { min: 0, max: 50 } as const
export const neumorphismDistanceBounds = { min: 2, max: 30 } as const
export const neumorphismIntensityBounds = { min: 5, max: 60 } as const

export interface NeumorphismInput {
  size: number
  radius: number
  distance: number
  intensity: number
  baseColor: string
  shape: NeumorphismShape
}

export function parseNeumorphismHexColor(
  value: string,
): { r: number; g: number; b: number } | null {
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

function shift(hex: string, amount: number, up: boolean): string | null {
  const rgb = parseNeumorphismHexColor(hex)
  if (rgb === null) return null
  const channel = (value: number) =>
    up ? Math.min(255, value + amount) : Math.max(0, value - amount)
  return `rgb(${channel(rgb.r)}, ${channel(rgb.g)}, ${channel(rgb.b)})`
}

export function lighten(hex: string, amount: number): string | null {
  return shift(hex, amount, true)
}

export function darken(hex: string, amount: number): string | null {
  return shift(hex, amount, false)
}

function clamp(value: number, bounds: { readonly min: number; readonly max: number }): number {
  if (!Number.isFinite(value)) return bounds.min
  return Math.min(bounds.max, Math.max(bounds.min, value))
}

export function buildNeumorphismCss(input: NeumorphismInput): string | null {
  const light = lighten(input.baseColor, input.intensity)
  const dark = darken(input.baseColor, input.intensity)
  if (light === null || dark === null) return null

  const size = clamp(input.size, neumorphismSizeBounds)
  const radius = clamp(input.radius, neumorphismRadiusBounds)
  const distance = clamp(input.distance, neumorphismDistanceBounds)
  const intensity = clamp(input.intensity, neumorphismIntensityBounds)
  const gradientShift = Math.round(intensity * 0.4)
  const gradientLight = lighten(input.baseColor, gradientShift)
  const gradientDark = darken(input.baseColor, gradientShift)
  if (gradientLight === null || gradientDark === null) return null

  const head = `.neumorphic {
  width: ${size}px;
  height: ${size}px;
  border-radius: ${radius}%;
  background: ${input.baseColor.trim().toLowerCase()};`

  const shadow = `${distance}px ${distance}px ${distance * 2}px ${dark}, -${distance}px -${distance}px ${distance * 2}px ${light}`
  const insetShadow = `inset ${distance}px ${distance}px ${distance * 2}px ${dark}, inset -${distance}px -${distance}px ${distance * 2}px ${light}`

  switch (input.shape) {
    case "flat":
      return `${head}
  box-shadow: ${shadow};
}`
    case "convex":
      return `${head}
  background: linear-gradient(145deg, ${gradientLight}, ${gradientDark});
  box-shadow: ${shadow};
}`
    case "concave":
      return `${head}
  background: linear-gradient(145deg, ${gradientDark}, ${gradientLight});
  box-shadow: ${insetShadow};
}`
    case "pressed":
      return `${head}
  box-shadow: ${insetShadow};
}`
  }
}

export interface NeumorphismPreview {
  width: string
  height: string
  borderRadius: string
  background: string
  boxShadow: string
}

export function buildNeumorphismPreview(input: NeumorphismInput): NeumorphismPreview | null {
  const light = lighten(input.baseColor, input.intensity)
  const dark = darken(input.baseColor, input.intensity)
  if (light === null || dark === null) return null

  const size = clamp(input.size, neumorphismSizeBounds)
  const radius = clamp(input.radius, neumorphismRadiusBounds)
  const distance = clamp(input.distance, neumorphismDistanceBounds)
  const intensity = clamp(input.intensity, neumorphismIntensityBounds)
  const gradientShift = Math.round(intensity * 0.4)
  const gradientLight = lighten(input.baseColor, gradientShift)
  const gradientDark = darken(input.baseColor, gradientShift)
  if (gradientLight === null || gradientDark === null) return null

  const raised = `${distance}px ${distance}px ${distance * 2}px ${dark}, -${distance}px -${distance}px ${distance * 2}px ${light}`
  const inset = `inset ${distance}px ${distance}px ${distance * 2}px ${dark}, inset -${distance}px -${distance}px ${distance * 2}px ${light}`

  let background = input.baseColor.trim().toLowerCase()
  if (input.shape === "convex")
    background = `linear-gradient(145deg, ${gradientLight}, ${gradientDark})`
  if (input.shape === "concave")
    background = `linear-gradient(145deg, ${gradientDark}, ${gradientLight})`

  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${radius}%`,
    background,
    boxShadow: input.shape === "flat" || input.shape === "convex" ? raised : inset,
  }
}
