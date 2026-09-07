/**
 * Pure password generation over the platform secure-random source.
 *
 * Upstream indexed its charset with `bytes[i % charset.length]`, which biases
 * toward earlier characters whenever the pool size does not divide 256, and
 * silently fell back to lowercase when no set was selected. Generation here
 * uses rejection sampling on random bytes for a uniform distribution, and an
 * empty selection is an explicit error state rather than a silent fallback.
 */

export const minimumPasswordLength = 4
export const maximumPasswordLength = 128

export const passwordCharacterSets = [
  { id: "lowercase", label: "Lowercase letters", characters: "abcdefghijklmnopqrstuvwxyz" },
  { id: "uppercase", label: "Uppercase letters", characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  { id: "numbers", label: "Numbers", characters: "0123456789" },
  {
    id: "symbols",
    label: "Symbols",
    characters: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
  },
] as const

export type PasswordCharacterSetId = (typeof passwordCharacterSets)[number]["id"]

export interface GenerateOptions {
  length: number
  sets: PasswordCharacterSetId[]
}

export interface PasswordGenerationResult {
  password: string
  message: string
}

export function buildCharacterSet(sets: PasswordCharacterSetId[]): string {
  const selected = passwordCharacterSets.filter((set) => sets.includes(set.id))
  return selected.map((set) => set.characters).join("")
}

/** Clamps the requested length into the supported range. */
export function clampPasswordLength(length: number): number {
  const parsed = Number.isFinite(length) ? Math.trunc(length) : minimumPasswordLength
  return Math.min(maximumPasswordLength, Math.max(minimumPasswordLength, parsed))
}

/**
 * Draws one uniform index from the charset length using rejection sampling:
 * bytes at or above the largest multiple of the pool size are discarded, so no
 * character is more likely than another.
 */
function randomIndex(charsetLength: number, randomBytes: (length: number) => Uint8Array): number {
  const threshold = Math.floor(256 / charsetLength) * charsetLength
  for (;;) {
    const [byte] = randomBytes(1)
    if (byte === undefined) throw new Error("The secure random source returned no data.")
    if (byte < threshold) return byte % charsetLength
  }
}

/**
 * Generates a password from the selected sets. Throws when no set is selected
 * so the interface can surface an explicit error instead of a silent fallback.
 */
export function generatePassword(
  options: GenerateOptions,
  randomBytes: (length: number) => Uint8Array,
): string {
  const charset = buildCharacterSet(options.sets)
  if (charset === "") {
    throw new Error("Select at least one character set.")
  }
  const length = clampPasswordLength(options.length)
  let password = ""
  for (let index = 0; index < length; index += 1) {
    password += charset[randomIndex(charset.length, randomBytes)]
  }
  return password
}
