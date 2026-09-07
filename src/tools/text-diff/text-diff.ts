/**
 * Pure line-level text diffing over jsdiff.
 *
 * Upstream rendered `Diff.diffLines` spans directly and computed its counts
 * with `p.count || 0` inside an `s +` expression, so operator precedence
 * turned per-part counts into wrong totals. Here the counts are accumulated
 * explicitly over the change list, and each part carries a +/- marker so the
 * difference is readable without relying on color alone.
 */

import { diffLines, type Change } from "diff"

export const maximumSideLength = 10_000
export const maximumSideLineCount = 2_000

export type DiffPartType = "added" | "removed" | "unchanged"

export interface DiffPart {
  type: DiffPartType
  value: string
  lines: number
}

export interface DiffResult {
  parts: DiffPart[]
  addedLines: number
  removedLines: number
  unchangedLines: number
}

export interface DiffSideCheck {
  overChars: boolean
  overLines: boolean
}

export function checkDiffSide(text: string): DiffSideCheck {
  return {
    overChars: text.length > maximumSideLength,
    overLines: text === "" ? false : text.split("\n").length > maximumSideLineCount,
  }
}

/** Marks every line of a change value with its sign for color-free reading. */
function markLines(value: string, marker: "+" | "-" | " "): string {
  const lines = value.split("\n")
  // A trailing "\n" produces a final empty element; drop it from marking.
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop()
  return lines.map((line) => `${marker} ${line}`).join("\n")
}

export function diffText(original: string, modified: string): DiffResult {
  const changes: Change[] = diffLines(original, modified)
  const parts: DiffPart[] = changes.map((change) => {
    const type: DiffPartType = change.added ? "added" : change.removed ? "removed" : "unchanged"
    return { type, value: change.value, lines: change.count ?? 0 }
  })
  let addedLines = 0
  let removedLines = 0
  let unchangedLines = 0
  for (const part of parts) {
    if (part.type === "added") addedLines += part.lines
    else if (part.type === "removed") removedLines += part.lines
    else unchangedLines += part.lines
  }
  return { parts, addedLines, removedLines, unchangedLines }
}

export { markLines }
