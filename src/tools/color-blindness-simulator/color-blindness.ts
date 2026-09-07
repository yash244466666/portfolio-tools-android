/**
 * Color blindness simulation matrices, copied verbatim from the portfolio
 * tool. They are approximations of the Brettel, Viénot & Mollon (1997)
 * family of models and demonstrate approximate color confusion; they are
 * not a clinical diagnostic.
 *
 * Divergence from upstream: hex input parsing is strict. The portfolio tool
 * accepted six arbitrary characters and relied on `parseInt` returning NaN;
 * whitespace-prefixed text such as " 12345" also parsed as a channel value.
 * Only six hexadecimal digits are accepted here.
 */

const protanopiaMatrix = [
  [0.56667, 0.43333, 0.0],
  [0.55833, 0.44167, 0.0],
  [0.0, 0.24167, 0.75833],
]

const deuteranopiaMatrix = [
  [0.625, 0.375, 0.0],
  [0.7, 0.3, 0.0],
  [0.0, 0.3, 0.7],
]

const tritanopiaMatrix = [
  [0.95, 0.05, 0.0],
  [0.0, 0.43333, 0.56667],
  [0.0, 0.475, 0.525],
]

const achromatopsiaMatrix = [
  [0.299, 0.587, 0.114],
  [0.299, 0.587, 0.114],
  [0.299, 0.587, 0.114],
]

export type ColorBlindnessTypeId = "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia"

const matrices: Record<ColorBlindnessTypeId, readonly (readonly number[])[]> = {
  protanopia: protanopiaMatrix,
  deuteranopia: deuteranopiaMatrix,
  tritanopia: tritanopiaMatrix,
  achromatopsia: achromatopsiaMatrix,
}

export interface ColorBlindnessType {
  id: ColorBlindnessTypeId
  label: string
  description: string
}

export const colorBlindnessTypes: readonly ColorBlindnessType[] = [
  { id: "protanopia", label: "Protanopia", description: "Red-blind (~1% of males)" },
  { id: "deuteranopia", label: "Deuteranopia", description: "Green-blind (~1% of males)" },
  { id: "tritanopia", label: "Tritanopia", description: "Blue-blind (~0.01%)" },
  {
    id: "achromatopsia",
    label: "Achromatopsia",
    description: "Total color blindness (~0.003%)",
  },
]

export function getColorBlindnessType(id: string): ColorBlindnessType {
  const type = colorBlindnessTypes.find((candidate) => candidate.id === id)
  if (!type) throw new RangeError(`Unknown color blindness type: ${id}`)
  return type
}

const hexColorPattern = /^[0-9a-fA-F]{6}$/

export interface RgbColor {
  r: number
  g: number
  b: number
}

/** Parses "#RRGGBB" or "RRGGBB" strictly, with every channel 0–255. */
export function parseHexColor(input: string): RgbColor | null {
  const trimmed = input.trim().replace(/^#/, "")
  if (!hexColorPattern.test(trimmed)) return null
  return {
    r: Number.parseInt(trimmed.slice(0, 2), 16),
    g: Number.parseInt(trimmed.slice(2, 4), 16),
    b: Number.parseInt(trimmed.slice(4, 6), 16),
  }
}

/**
 * Applies the simulation matrix for `type` and clamps each channel to the
 * 0–255 byte range with rounding.
 */
export function simulateColorBlindness(
  r: number,
  g: number,
  b: number,
  type: ColorBlindnessTypeId,
): RgbColor {
  const matrix = matrices[type]
  const simR = matrix[0]![0]! * r + matrix[0]![1]! * g + matrix[0]![2]! * b
  const simG = matrix[1]![0]! * r + matrix[1]![1]! * g + matrix[1]![2]! * b
  const simB = matrix[2]![0]! * r + matrix[2]![1]! * g + matrix[2]![2]! * b

  return {
    r: Math.round(Math.max(0, Math.min(255, simR))),
    g: Math.round(Math.max(0, Math.min(255, simG))),
    b: Math.round(Math.max(0, Math.min(255, simB))),
  }
}

/** Lowercase padded hex like the upstream `toHex` helper. */
export function formatHexColor(color: RgbColor): string {
  const toHexByte = (value: number) => value.toString(16).padStart(2, "0")
  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`
}

/** Uppercase display form, matching the upstream presentation. */
export function formatHexColorUpper(color: RgbColor): string {
  return formatHexColor(color).toUpperCase()
}
