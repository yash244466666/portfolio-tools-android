/**
 * Pure dice-notation parsing and unbiased rolling for the Dice Roller.
 * Original work for this repository; no upstream code is copied.
 *
 * Randomness contract: die values come exclusively from the platform
 * RandomService byte stream — never Math.random, never a bare modulo of a
 * byte (which is biased for die sizes that do not divide 256). Uniformity
 * comes from rejection sampling: for an s-sided die the accepted byte range
 * is the largest multiple of s within one byte (for s <= 128) or two bytes
 * (for s = 100), so every face is exactly equally likely.
 */

export const maximumGroups = 10
export const maximumDicePerGroup = 20
export const maximumModifier = 999
/** The die sizes the grammar accepts. */
export const allowedSides: readonly number[] = [2, 4, 6, 8, 10, 12, 20, 100]

export type DiceRoll = {
  status: "ok"
  groups: Array<{
    label: string
    dice: Array<{ sides: number; value: number }>
    groupTotal: number
  }>
  /** Sum of all groups plus the modifier. */
  total: number
  modifier: number
}

export type DiceParse =
  | { status: "ok"; groups: Array<{ diceCount: number; sides: number }>; modifier: number }
  | { status: "error"; message: string }

/**
 * Strict dice-notation parser: groups of `NdS` joined by `+`, at most one
 * trailing constant modifier (`+ N`), at most {@link maximumGroups} groups,
 * 1-{@link maximumDicePerGroup} dice per group, sides from the allowed set,
 * and a modifier below {@link maximumModifier}. Whitespace around terms is
 * allowed; everything else fails with a typed message.
 */
export function parseDiceNotation(input: string): DiceParse {
  const trimmed = input.trim()
  if (trimmed === "") {
    return { status: "error", message: "Enter dice notation such as 2d6 + 1d20 + 3." }
  }

  const terms = trimmed.split("+").map((term) => term.trim())
  if (terms.length > maximumGroups + 1) {
    return { status: "error", message: `Use at most ${maximumGroups} dice groups.` }
  }

  const groups: Array<{ diceCount: number; sides: number }> = []
  let modifier = 0
  for (const [index, term] of terms.entries()) {
    const isLast = index === terms.length - 1
    if (/^\d+$/.test(term)) {
      // A bare constant is only allowed as the final modifier term.
      const value = Number(term)
      if (!isLast || !Number.isInteger(value) || value < 0 || value > maximumModifier) {
        return {
          status: "error",
          message: `"${term}" must be a modifier between 0 and ${maximumModifier} after the dice groups.`,
        }
      }
      modifier = value
      continue
    }
    const groupMatch = /^(\d+)d(\d+)$/i.exec(term)
    if (groupMatch === null) {
      return {
        status: "error",
        message: `"${term.slice(0, 32)}" is not valid dice notation. Use groups like 2d6.`,
      }
    }
    const diceCount = Number(groupMatch[1])
    const sides = Number(groupMatch[2])
    if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > maximumDicePerGroup) {
      return {
        status: "error",
        message: `Each group needs 1-${maximumDicePerGroup} dice ("${term.slice(0, 32)}" has ${groupMatch[1]}).`,
      }
    }
    if (!allowedSides.includes(sides)) {
      return {
        status: "error",
        message: `Dice must have ${allowedSides.join(", ")} sides ("d${groupMatch[2]}" is not available).`,
      }
    }
    groups.push({ diceCount, sides })
  }

  if (groups.length === 0) {
    return { status: "error", message: "Add at least one dice group, such as 2d6." }
  }
  if (groups.length > maximumGroups) {
    return { status: "error", message: `Use at most ${maximumGroups} dice groups.` }
  }
  return { status: "ok", groups, modifier }
}

/**
 * Draws one uniform value for an s-sided die from the shared byte stream.
 * Rejection sampling: bytes (or byte pairs) at or above the largest multiple
 * of s within the single-byte (s <= 64) or two-byte (s > 64) range are
 * redrawn, so no face is over-represented. `drawByte` must return a fresh
 * uniformly distributed 0-255 byte.
 */
export function rollDie(sides: number, drawByte: () => number): number {
  if (sides <= 64) {
    const accepted = 256 - (256 % sides)
    for (;;) {
      const byte = drawByte()
      if (byte < accepted) return (byte % sides) + 1
    }
  }
  // d100 widens to two bytes: 65536 / 100 leaves 36 values to reject.
  const range = 65_536
  const accepted = range - (range % sides)
  for (;;) {
    const high = drawByte()
    const low = drawByte()
    const value = high * 256 + low
    if (value < accepted) return (value % sides) + 1
  }
}

/** Rolls every parsed group and totals the result. */
export function rollGroups(
  groups: ReadonlyArray<{ diceCount: number; sides: number }>,
  modifier: number,
  drawByte: () => number,
): DiceRoll {
  let total = modifier
  const rolled = groups.map((group) => {
    const dice: Array<{ sides: number; value: number }> = []
    for (let index = 0; index < group.diceCount; index += 1) {
      const value = rollDie(group.sides, drawByte)
      dice.push({ sides: group.sides, value })
      total += value
    }
    return {
      label: `${group.diceCount}d${group.sides}`,
      dice,
      groupTotal: dice.reduce((sum, die) => sum + die.value, 0),
    }
  })
  return { status: "ok", groups: rolled, total, modifier }
}
