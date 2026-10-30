/**
 * Pure color conversion and WCAG contrast helpers.
 *
 * Upstream shipped these as `lib/tools/color-utils.ts`; here they are strict:
 * malformed input yields `null`/errors instead of NaN, and every channel is
 * clamped so conversions can never emit out-of-range values.
 */

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface HslColor {
  h: number
  s: number
  l: number
}

/** Accepts `#RGB` and `#RRGGBB`, returning 8-bit channels. */
export function hexToRgb(hex: string): RgbColor | null {
  const sixDigit = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex)
  if (sixDigit !== null) {
    return {
      r: Number.parseInt(sixDigit[1] ?? "", 16),
      g: Number.parseInt(sixDigit[2] ?? "", 16),
      b: Number.parseInt(sixDigit[3] ?? "", 16),
    }
  }
  const threeDigit = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(hex)
  if (threeDigit !== null) {
    const expand = (digit: string | undefined) => {
      const value = digit ?? "0"
      return Number.parseInt(value + value, 16)
    }
    return {
      r: expand(threeDigit[1]),
      g: expand(threeDigit[2]),
      b: expand(threeDigit[3]),
    }
  }
  return null
}

/**
 * Half-up rounding with a small absolute tolerance. The conversion formulas
 * produce exact .5 channel/hue values from integers, but the double result can
 * land a few ulps below the tie (hsl(210,100%,50%) computes 127.49999999999989,
 * where Chromium/CSS produces 128). The tolerance is 1e-9 in channel or
 * degree units, far below any real difference between neighbouring colors.
 */
const roundingTolerance = 1e-9
const roundHalfUp = (value: number): number => Math.round(value + roundingTolerance)

const clampChannel = (value: number): number => Math.min(255, Math.max(0, roundHalfUp(value)))

export function rgbToHex(color: RgbColor): string {
  const toPair = (channel: number) => clampChannel(channel).toString(16).padStart(2, "0")
  return `#${toPair(color.r)}${toPair(color.g)}${toPair(color.b)}`
}

export function rgbToHsl(color: RgbColor): HslColor {
  const r = clampChannel(color.r) / 255
  const g = clampChannel(color.g) / 255
  const b = clampChannel(color.b) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lightness = (max + min) / 2
  let hue = 0
  let saturation = 0
  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))
    switch (max) {
      case r:
        hue = ((g - b) / delta) % 6
        break
      case g:
        hue = (b - r) / delta + 2
        break
      default:
        hue = (r - g) / delta + 4
    }
    hue *= 60
    if (hue < 0) hue += 360
  }
  // Hue is circular: a value in the 359.5–360 band rounds to 360, which must
  // be reported as 0 to stay inside the tool's 0–359 input range.
  return {
    h: roundHalfUp(hue) % 360,
    s: roundHalfUp(saturation * 100),
    l: roundHalfUp(lightness * 100),
  }
}

const hue2rgb = (p: number, q: number, t: number): number => {
  let channel = t
  if (channel < 0) channel += 1
  if (channel > 1) channel -= 1
  if (channel < 1 / 6) return p + (q - p) * 6 * channel
  if (channel < 1 / 2) return q
  if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6
  return p
}

export function hslToRgb(color: HslColor): RgbColor {
  const h = (((color.h % 360) + 360) % 360) / 360
  const s = Math.min(100, Math.max(0, color.s)) / 100
  const l = Math.min(100, Math.max(0, color.l)) / 100
  if (s === 0) {
    const grey = clampChannel(l * 255)
    return { r: grey, g: grey, b: grey }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: clampChannel(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clampChannel(hue2rgb(p, q, h) * 255),
    b: clampChannel(hue2rgb(p, q, h - 1 / 3) * 255),
  }
}

export function hslToHex(color: HslColor): string {
  return rgbToHex(hslToRgb(color))
}

/**
 * WCAG 2.x relative luminance. The 0.03928 threshold follows the formula as
 * published; the sRGB-standard 0.04045 differs only for a tiny band of
 * 8-bit channel values and never changes a documented contrast verdict.
 */
export function getRelativeLuminance(color: RgbColor): number {
  const toLinear = (channel: number) => {
    const c = clampChannel(channel) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b)
}

export function getContrastRatio(foreground: RgbColor, background: RgbColor): number {
  const first = getRelativeLuminance(foreground)
  const second = getRelativeLuminance(background)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

export interface ContrastVerdict {
  ratio: number
  passesNormalAA: boolean
  passesLargeAA: boolean
  passesNormalAAA: boolean
  passesLargeAAA: boolean
}

/** Large text follows WCAG's 18pt (24 px) / 14pt-bold thresholds. */
export function evaluateContrast(
  foregroundHex: string,
  backgroundHex: string,
): ContrastVerdict | null {
  const foreground = hexToRgb(foregroundHex)
  const background = hexToRgb(backgroundHex)
  if (foreground === null || background === null) return null
  const ratio = getContrastRatio(foreground, background)
  return {
    ratio,
    passesNormalAA: ratio >= 4.5,
    passesLargeAA: ratio >= 3,
    passesNormalAAA: ratio >= 7,
    passesLargeAAA: ratio >= 4.5,
  }
}

export interface HarmonyPalette {
  complementary: string
  analogous: [string, string]
  triadic: [string, string]
  splitComplementary: [string, string]
}

export function buildHarmonyPalette(hex: string): HarmonyPalette | null {
  const rgb = hexToRgb(hex)
  if (rgb === null) return null
  const hsl = rgbToHsl(rgb)
  const shift = (degrees: number) => hslToHex({ ...hsl, h: (hsl.h + degrees + 360) % 360 })
  return {
    complementary: shift(180),
    analogous: [shift(30), shift(330)],
    triadic: [shift(120), shift(240)],
    splitComplementary: [shift(150), shift(210)],
  }
}
