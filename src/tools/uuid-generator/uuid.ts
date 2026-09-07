export const uuidBounds = { min: 1, max: 100 } as const

/** RFC 4122 version-4 shape: 8-4-4-4-12 hex digits with a fixed version nibble. */
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** A UUID with hyphens removed keeps the same 32 hex digits. */
export function stripHyphens(uuid: string): string {
  return uuid.replace(/-/g, "")
}

/** The clamped, integer-validated count of UUIDs to generate. */
export function clampUuidCount(value: number): number {
  if (!Number.isFinite(value)) {
    return uuidBounds.min
  }
  return Math.min(Math.max(Math.round(value), uuidBounds.min), uuidBounds.max)
}

/** Formats one UUID per the uppercase/hyphen options. */
export function formatUuid(uuid: string, uppercase: boolean, withHyphens: boolean): string {
  const formatted = uppercase ? uuid.toUpperCase() : uuid
  return withHyphens ? formatted : stripHyphens(formatted)
}
