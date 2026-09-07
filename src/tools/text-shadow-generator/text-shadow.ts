export interface TextShadowLayer {
  id: string
  offsetX: number
  offsetY: number
  blur: number
  color: string
}

export interface TextShadowLayerValues {
  offsetX: number
  offsetY: number
  blur: number
  color: string
}

export const textShadowLayerDefaults: TextShadowLayerValues = {
  offsetX: 2,
  offsetY: 2,
  blur: 4,
  color: "#6366f1",
}

export const textShadowBounds = {
  offsetX: { min: -20, max: 20 },
  offsetY: { min: -20, max: 20 },
  blur: { min: 0, max: 30 },
} as const

export const maximumTextShadowLayers = 8

export function createTextShadowLayer(id: string): TextShadowLayer {
  return { id, ...textShadowLayerDefaults }
}

/**
 * Builds the `text-shadow` declaration by joining every layer in order, the
 * way CSS applies multiple shadows (first layer painted on top).
 */
export function buildTextShadowDeclaration(layers: readonly TextShadowLayer[]): string {
  const value = layers
    .map((layer) => `${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.color}`)
    .join(", ")
  return `text-shadow: ${value};`
}

/** The inline-style shadow value for the live preview. */
export function buildTextShadowValue(layers: readonly TextShadowLayer[]): string {
  return buildTextShadowDeclaration(layers).slice("text-shadow: ".length, -1)
}
