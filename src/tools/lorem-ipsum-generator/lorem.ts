/**
 * Pure lorem ipsum text generation.
 *
 * The word list and sentence/paragraph shapes are copied from the upstream tool.
 * The random source is injectable so tests are deterministic and so a future
 * platform RandomService can replace `Math.random` without touching callers.
 */

export const loremUnits = ["paragraphs", "sentences", "words"] as const

export type LoremUnit = (typeof loremUnits)[number]

export const loremUnitLabels: Record<LoremUnit, string> = {
  paragraphs: "Paragraphs",
  sentences: "Sentences",
  words: "Words",
}

export const loremUnitBounds: Record<LoremUnit, { min: number; max: number }> = {
  paragraphs: { min: 1, max: 10 },
  sentences: { min: 1, max: 50 },
  words: { min: 1, max: 500 },
}

export const loremWords = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
  "duis",
  "aute",
  "irure",
  "in",
  "reprehenderit",
  "voluptate",
  "velit",
  "esse",
  "cillum",
  "fugiat",
  "nulla",
  "pariatur",
  "excepteur",
  "sint",
  "occaecat",
  "cupidatat",
  "non",
  "proident",
  "sunt",
  "culpa",
  "qui",
  "officia",
  "deserunt",
  "mollit",
  "anim",
  "id",
  "est",
  "laborum",
  "perspiciatis",
  "unde",
  "omnis",
  "iste",
  "natus",
  "error",
  "voluptatem",
  "accusantium",
  "doloremque",
  "laudantium",
  "totam",
  "rem",
  "aperiam",
  "eaque",
  "ipsa",
  "quae",
  "ab",
  "illo",
  "inventore",
  "veritatis",
  "quasi",
  "architecto",
  "beatae",
  "vitae",
  "dicta",
  "explicabo",
  "nemo",
  "ipsam",
  "voluptas",
  "aspernatur",
  "aut",
  "odit",
  "fugit",
  "consequuntur",
  "magni",
  "dolores",
  "eos",
  "ratione",
  "sequi",
  "nesciunt",
  "neque",
  "porro",
  "quisquam",
  "nihil",
  "impedit",
  "quo",
  "minus",
  "quod",
  "maxime",
  "placeat",
  "facere",
  "possimus",
  "assumenda",
  "repellendus",
  "temporibus",
  "quibusdam",
  "illum",
  "corporis",
  "suscipit",
  "laboriosam",
  "distinctio",
] as const

export const loremWordCount = loremWords.length

/** Clamps NaN and out-of-range counts into the unit's documented bounds. */
export function clampLoremCount(count: number, unit: LoremUnit): number {
  const bounds = loremUnitBounds[unit]
  if (!Number.isFinite(count)) return bounds.min
  return Math.min(bounds.max, Math.max(bounds.min, Math.floor(count)))
}

function randomWord(random: () => number): string {
  const index = Math.floor(random() * loremWordCount)
  return loremWords[Math.min(loremWordCount - 1, Math.max(0, index))] ?? "lorem"
}

function randomSentence(random: () => number): string {
  const length = 8 + Math.floor(random() * 12)
  const words = Array.from({ length }, () => randomWord(random))
  const first = words[0] ?? "lorem"
  words[0] = first.charAt(0).toUpperCase() + first.slice(1)
  return `${words.join(" ")}.`
}

function randomParagraph(random: () => number): string {
  const sentenceCount = 3 + Math.floor(random() * 5)
  return Array.from({ length: sentenceCount }, () => randomSentence(random)).join(" ")
}

/**
 * Generates lorem ipsum text. Every random draw goes through the injected
 * `random` function, so the same seed produces the same text.
 */
export function generateLoremIpsum(
  count: number,
  unit: LoremUnit,
  random: () => number = Math.random,
): string {
  const boundedCount = clampLoremCount(count, unit)
  switch (unit) {
    case "paragraphs":
      return Array.from({ length: boundedCount }, () => randomParagraph(random)).join("\n\n")
    case "sentences":
      return Array.from({ length: boundedCount }, () => randomSentence(random)).join(" ")
    case "words":
      return Array.from({ length: boundedCount }, () => randomWord(random)).join(" ")
  }
}
