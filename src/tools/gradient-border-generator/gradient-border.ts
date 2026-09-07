export interface GradientBorderInput {
  startColor: string
  endColor: string
  angle: number
  borderWidth: number
  borderRadius: number
}

export const defaultGradientBorderInput: GradientBorderInput = {
  startColor: "#6366f1",
  endColor: "#06b6d4",
  angle: 135,
  borderWidth: 3,
  borderRadius: 12,
}

export const gradientBorderBounds = {
  angle: { min: 0, max: 360 },
  borderWidth: { min: 1, max: 20 },
  borderRadius: { min: 0, max: 50 },
} as const

/**
 * Builds the copyable CSS snippet: a positioned element whose `::before`
 * ring paints the gradient and is masked down to the border width.
 */
export function buildGradientBorderCss(input: GradientBorderInput): string {
  const { startColor, endColor, angle, borderWidth, borderRadius } = input
  return `.gradient-border {
  position: relative;
  background: hsl(0 0% 100%);
  border-radius: ${borderRadius}px;
  padding: 1rem;
}

.gradient-border::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${borderRadius}px;
  padding: ${borderWidth}px;
  background: linear-gradient(${angle}deg, ${startColor}, ${endColor});
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}`
}

/**
 * The live preview reproduces the same visual with nested elements and
 * inline styles instead of injecting a `<style>` element or relying on
 * mask-composite support: the outer element paints the gradient and an
 * opaque inner box reveals only the ring.
 */
export function buildGradientBorderPreviewStyles(input: GradientBorderInput): {
  outer: React.CSSProperties
  inner: React.CSSProperties
} {
  const { angle, startColor, endColor, borderWidth, borderRadius } = input
  return {
    outer: {
      padding: `${borderWidth}px`,
      background: `linear-gradient(${angle}deg, ${startColor}, ${endColor})`,
      borderRadius: `${borderRadius}px`,
    },
    inner: {
      borderRadius: `${Math.max(borderRadius - borderWidth, 0)}px`,
    },
  }
}
