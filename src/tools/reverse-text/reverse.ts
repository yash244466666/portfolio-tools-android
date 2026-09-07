/**
 * Pure reversal logic for the Reverse Text tool.
 *
 * Reversal is grapheme-cluster aware via `Intl.Segmenter` (with a code-point
 * fallback), so emoji with modifiers and other multi-unit clusters are not torn
 * apart the way naive UTF-16 reversal did. That divergence from upstream is
 * recorded in `docs/SOURCE_PROVENANCE.md`. Nothing here touches React or
 * platform services.
 */

/** Input bound; the three modes run per keystroke, so the input is rejected above it. */
export const maximumReverseChars = 1_000_000

export type ReverseMode = "characters" | "words" | "lines"

export interface ReverseOption {
  id: ReverseMode
  label: string
  description: string
}

export const reverseOptions: readonly ReverseOption[] = [
  {
    id: "characters",
    label: "Characters",
    description: "Reverse the whole text, character by character (graphemes kept intact).",
  },
  {
    id: "words",
    label: "Words",
    description: "Reverse word order within each line; inner whitespace is collapsed.",
  },
  {
    id: "lines",
    label: "Lines",
    description: "Reverse the order of lines.",
  },
]

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : undefined

/** Grapheme clusters (or code points where Segmenter is unavailable), in order. */
function graphemes(text: string): string[] {
  if (segmenter) {
    return [...segmenter.segment(text)].map((segment) => segment.segment)
  }
  return [...text]
}

export function getReverseOption(mode: ReverseMode): ReverseOption {
  const option = reverseOptions.find((entry) => entry.id === mode)
  if (!option) throw new RangeError(`Unknown reverse mode: ${mode}`)
  return option
}

export function reverseText(text: string, mode: ReverseMode): string {
  switch (mode) {
    case "characters":
      return graphemes(text).reverse().join("")
    case "words":
      // Mirror the upstream per-line semantics: reverse word order per line and
      // collapse inner whitespace runs to single spaces.
      return text
        .split(/\r?\n/)
        .map((line) =>
          line
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .reverse()
            .join(" "),
        )
        .join("\n")
    case "lines":
      return text
        .split(/\r?\n/)
        .reverse()
        .join("\n")
  }
}