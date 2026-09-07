export const maximumTrimChars = 1_000_000

export interface TrimOptions {
  trimLeading: boolean
  trimTrailing: boolean
  collapseSpaces: boolean
  removeBlankLines: boolean
}

export const defaultTrimOptions: TrimOptions = {
  trimLeading: true,
  trimTrailing: true,
  collapseSpaces: false,
  removeBlankLines: false,
}

export interface TrimResult {
  output: string
  beforeChars: number
  afterChars: number
}

/**
 * Collapsing intentionally affects runs of plain spaces only (matching the
 * option label); tabs and other indentation whitespace are preserved.
 */
export function trimWhitespace(text: string, options: TrimOptions): TrimResult {
  const beforeChars = text.length
  let output = text

  if (options.trimLeading) {
    output = output
      .split("\n")
      .map((line) => line.replace(/^\s+/, ""))
      .join("\n")
  }

  if (options.trimTrailing) {
    output = output
      .split("\n")
      .map((line) => line.replace(/\s+$/, ""))
      .join("\n")
  }

  if (options.collapseSpaces) {
    output = output
      .split("\n")
      .map((line) => line.replace(/ {2,}/g, " "))
      .join("\n")
  }

  if (options.removeBlankLines) {
    output = output
      .split("\n")
      .filter((line) => line.trim() !== "")
      .join("\n")
  }

  return { output, beforeChars, afterChars: output.length }
}
