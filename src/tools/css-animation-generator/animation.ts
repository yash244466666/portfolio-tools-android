/**
 * Pure CSS animation declaration and keyframes generation.
 *
 * Upstream interpolated the iterations number input straight into the
 * animation shorthand, so any text typed there reached a CSS property. Here
 * every numeric part is clamped to its slider/number bounds and the timing
 * function and animation name come from closed lists, so the emitted CSS is
 * always well-formed.
 */

export const animationTypeOptions = [
  { id: "fadeIn", label: "Fade In" },
  { id: "fadeOut", label: "Fade Out" },
  { id: "slideIn", label: "Slide In" },
  { id: "slideOut", label: "Slide Out" },
  { id: "bounce", label: "Bounce" },
  { id: "rotate", label: "Rotate" },
  { id: "pulse", label: "Pulse" },
  { id: "scale", label: "Scale" },
] as const

export type AnimationTypeId = (typeof animationTypeOptions)[number]["id"]

export const timingFunctionOptions = [
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
] as const
export type TimingFunction = (typeof timingFunctionOptions)[number]

export const animationDurationBounds = { min: 0.1, max: 5 } as const
export const animationDelayBounds = { min: 0, max: 3 } as const
export const maximumAnimationIterations = 1000

export interface AnimationInput {
  type: AnimationTypeId
  duration: number
  delay: number
  iterations: number
  timing: TimingFunction
}

const keyframes: Record<AnimationTypeId, string> = {
  fadeIn: `@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
  fadeOut: `@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}`,
  slideIn: `@keyframes slideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
  slideOut: `@keyframes slideOut {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(20px); opacity: 0; }
}`,
  bounce: `@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-30px); }
  60% { transform: translateY(-15px); }
}`,
  rotate: `@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`,
  pulse: `@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}`,
  scale: `@keyframes scale {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}`,
}

export function getKeyframes(type: AnimationTypeId): string {
  return keyframes[type]
}

function clamp(value: number, bounds: { readonly min: number; readonly max: number }): number {
  if (!Number.isFinite(value)) return bounds.min
  return Math.min(bounds.max, Math.max(bounds.min, value))
}

export function clampDuration(value: number): number {
  return clamp(value, animationDurationBounds)
}

export function clampDelay(value: number): number {
  return clamp(value, animationDelayBounds)
}

/**
 * Parses the iterations field. Zero means `infinite`. Anything that is not a
 * non-negative integer falls back to a single iteration.
 */
export function parseIterations(value: string): number {
  if (value.trim() === "") return 1
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return 1
  return Math.min(maximumAnimationIterations, parsed)
}

export function buildAnimationValue(input: AnimationInput): string {
  const duration = clamp(input.duration, animationDurationBounds)
  const delay = clamp(input.delay, animationDelayBounds)
  const iterations = input.iterations === 0 ? "infinite" : String(input.iterations)
  return `${input.type} ${duration}s ${input.timing} ${delay}s ${iterations}`
}

export function buildAnimationShorthand(input: AnimationInput): string {
  return `animation: ${buildAnimationValue(input)};`
}

export function buildAnimationCss(input: AnimationInput): string {
  return `.animated-element {
  ${buildAnimationShorthand(input)}
}

${getKeyframes(input.type)}`
}
