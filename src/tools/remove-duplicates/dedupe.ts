export const maximumDedupeChars = 1_000_000

export type DedupeMode = "lines" | "words"

export const dedupeOptions: readonly { id: DedupeMode; label: string; description: string }[] = [
  {
    id: "lines",
    label: "Lines",
    description:
      "Treats each line as one item and keeps the first occurrence of every unique line.",
  },
  {
    id: "words",
    label: "Words",
    description:
      "Splits on any whitespace run, keeps unique words, and joins them with single spaces.",
  },
]

export function getDedupeOption(mode: string): (typeof dedupeOptions)[number] {
  const option = dedupeOptions.find((candidate) => candidate.id === mode)
  if (!option) throw new RangeError(`Unknown dedupe mode: ${mode}`)
  return option
}

export interface DedupeOptions {
  caseSensitive: boolean
  sortOutput: boolean
}

export const defaultDedupeOptions: DedupeOptions = {
  caseSensitive: true,
  sortOutput: false,
}

export interface DedupeResult {
  output: string
  total: number
  removed: number
}

export function dedupe(
  text: string,
  mode: DedupeMode,
  options: DedupeOptions = defaultDedupeOptions,
): DedupeResult {
  const items =
    mode === "lines" ? text.split("\n") : text.split(/\s+/).filter((word) => word !== "")
  const total = items.length

  const seen = new Set<string>()
  const unique: string[] = []
  for (const item of items) {
    const key = options.caseSensitive ? item : item.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(item)
    }
  }

  const output = options.sortOutput ? [...unique].sort((a, b) => a.localeCompare(b)) : unique
  const joined = mode === "lines" ? output.join("\n") : output.join(" ")
  return { output: joined, total, removed: total - unique.length }
}
