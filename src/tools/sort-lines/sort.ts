export const maximumSortChars = 1_000_000

export type SortMode = "az" | "za" | "numeric" | "reverse" | "shuffle"

export const sortOptions: readonly {
  id: SortMode
  label: string
  description: string
}[] = [
  {
    id: "az",
    label: "A → Z",
    description: "Alphabetical order using the device locale comparison.",
  },
  {
    id: "za",
    label: "Z → A",
    description: "Reverse alphabetical order using the device locale comparison.",
  },
  {
    id: "numeric",
    label: "Numeric",
    description:
      "Orders by the first number found in each line; lines without a number go last in alphabetical order.",
  },
  {
    id: "reverse",
    label: "Reverse",
    description: "Reverses the current line order without comparing content.",
  },
  {
    id: "shuffle",
    label: "Shuffle",
    description:
      "Randomly reorders lines with a Fisher–Yates shuffle; each run can produce a different order.",
  },
]

export function getSortOption(mode: string): (typeof sortOptions)[number] {
  const option = sortOptions.find((candidate) => candidate.id === mode)
  if (!option) throw new RangeError(`Unknown sort mode: ${mode}`)
  return option
}

export interface SortOptions {
  removeBlank: boolean
  removeDuplicates: boolean
  /** Deterministic injection point for tests; production shuffling uses Math.random. */
  rng?: () => number
}

export interface SortResult {
  output: string
  total: number
  removed: number
}

/**
 * Extracts the first number appearing anywhere in a line. The upstream tool
 * stripped every non-digit character and parsed the remainder, so "v2 note 10"
 * sorted as 210, and its `|| 0` fallback made the comparator unstable for
 * non-numeric lines (an ordering that varies by engine). Here a missing number
 * is a defined key that sorts last, with a deterministic tie-break.
 */
function numericKey(line: string): { value: number | null; text: string } {
  const match = /-?\d*\.?\d+/.exec(line)
  if (!match) return { value: null, text: line }
  return { value: Number.parseFloat(match[0]), text: line }
}

export function sortLines(
  text: string,
  mode: SortMode,
  options: SortOptions = { removeBlank: false, removeDuplicates: false },
): SortResult {
  const lines = text.split("\n")
  const total = lines.length

  let working = lines
  if (options.removeBlank) {
    working = working.filter((line) => line.trim() !== "")
  }
  if (options.removeDuplicates) {
    const seen = new Set<string>()
    working = working.filter((line) => {
      if (seen.has(line)) return false
      seen.add(line)
      return true
    })
  }

  switch (mode) {
    case "az":
      working = [...working].sort((a, b) => a.localeCompare(b))
      break
    case "za":
      working = [...working].sort((a, b) => b.localeCompare(a))
      break
    case "numeric": {
      const keyed = working.map(numericKey)
      keyed.sort((a, b) => {
        if (a.value !== null && b.value !== null) {
          if (a.value !== b.value) return a.value - b.value
          return a.text.localeCompare(b.text)
        }
        if (a.value !== null) return -1
        if (b.value !== null) return 1
        return a.text.localeCompare(b.text)
      })
      working = keyed.map((entry) => entry.text)
      break
    }
    case "reverse":
      working = [...working].reverse()
      break
    case "shuffle": {
      const rng = options.rng ?? Math.random
      for (let i = working.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        const temp = working[i] ?? ""
        working[i] = working[j] ?? temp
        working[j] = temp
      }
      break
    }
  }

  return { output: working.join("\n"), total, removed: total - working.length }
}
