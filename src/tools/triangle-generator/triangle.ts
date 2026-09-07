export type TriangleDirection = "up" | "down" | "left" | "right"

export interface TriangleDirectionOption {
  id: TriangleDirection
  label: string
}

export const triangleDirections: readonly TriangleDirectionOption[] = [
  { id: "up", label: "Up" },
  { id: "down", label: "Down" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
]

export function getTriangleDirection(id: string): TriangleDirection {
  return triangleDirections.find((option) => option.id === id)?.id ?? "up"
}

export const triangleBounds = {
  width: { min: 10, max: 300 },
  height: { min: 10, max: 300 },
} as const

interface TriangleGeometry {
  halfWidth: number
  halfHeight: number
}

/**
 * Builds the zero-size box with three transparent borders that renders the
 * triangle. The border order matches the CSS box model order for each
 * direction; half widths come from halving the requested size.
 */
export function buildTriangleCss(
  direction: TriangleDirection,
  width: number,
  height: number,
  color: string,
): string {
  const geometry: TriangleGeometry = { halfWidth: width / 2, halfHeight: height / 2 }
  const { halfWidth, halfHeight } = geometry
  switch (direction) {
    case "up":
      return `width: 0;\nheight: 0;\nborder-left: ${halfWidth}px solid transparent;\nborder-right: ${halfWidth}px solid transparent;\nborder-bottom: ${height}px solid ${color};`
    case "down":
      return `width: 0;\nheight: 0;\nborder-left: ${halfWidth}px solid transparent;\nborder-right: ${halfWidth}px solid transparent;\nborder-top: ${height}px solid ${color};`
    case "left":
      return `width: 0;\nheight: 0;\nborder-top: ${halfHeight}px solid transparent;\nborder-bottom: ${halfHeight}px solid transparent;\nborder-right: ${width}px solid ${color};`
    case "right":
      return `width: 0;\nheight: 0;\nborder-top: ${halfHeight}px solid transparent;\nborder-bottom: ${halfHeight}px solid transparent;\nborder-left: ${width}px solid ${color};`
  }
}

/** The React inline style for the live preview triangle. */
export function buildTrianglePreviewStyle(
  direction: TriangleDirection,
  width: number,
  height: number,
  color: string,
): React.CSSProperties {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const base: React.CSSProperties = { width: 0, height: 0 }
  switch (direction) {
    case "up":
      return {
        ...base,
        borderLeft: `${halfWidth}px solid transparent`,
        borderRight: `${halfWidth}px solid transparent`,
        borderBottom: `${height}px solid ${color}`,
      }
    case "down":
      return {
        ...base,
        borderLeft: `${halfWidth}px solid transparent`,
        borderRight: `${halfWidth}px solid transparent`,
        borderTop: `${height}px solid ${color}`,
      }
    case "left":
      return {
        ...base,
        borderTop: `${halfHeight}px solid transparent`,
        borderBottom: `${halfHeight}px solid transparent`,
        borderRight: `${width}px solid ${color}`,
      }
    case "right":
      return {
        ...base,
        borderTop: `${halfHeight}px solid transparent`,
        borderBottom: `${halfHeight}px solid transparent`,
        borderLeft: `${width}px solid ${color}`,
      }
  }
}
