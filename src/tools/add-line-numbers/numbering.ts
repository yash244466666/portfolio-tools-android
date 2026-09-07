export const maximumNumberingChars = 1_000_000
export const minimumStartNumber = 0
export const maximumStartNumber = 999_999_999

export type NumberingSeparator = "dot" | "colon" | "bracket" | "paren" | "dash" | "custom"

export const numberingSeparatorOptions: readonly {
  id: NumberingSeparator
  label: string
  template: string | null
}[] = [
  { id: "dot", label: "Dot (1.)", template: ". " },
  { id: "colon", label: "Colon (1:)", template: ": " },
  { id: "bracket", label: "Bracket (1])", template: "] " },
  { id: "paren", label: "Paren (1))", template: ") " },
  { id: "dash", label: "Dash (1-)", template: "- " },
  { id: "custom", label: "Custom", template: null },
]

export type NumberingPadding = "auto" | "none"

export interface NumberingOptions {
  startNumber: number
  separator: NumberingSeparator
  customSeparator: string
  padding: NumberingPadding
}

export const defaultNumberingOptions: NumberingOptions = {
  startNumber: 1,
  separator: "dot",
  customSeparator: " | ",
  padding: "auto",
}

export function addLineNumbers(text: string, options: NumberingOptions): string {
  const { startNumber, separator, customSeparator, padding } = options
  if (!Number.isInteger(startNumber)) {
    throw new RangeError("The start number must be a whole number.")
  }
  if (startNumber < minimumStartNumber || startNumber > maximumStartNumber) {
    throw new RangeError(
      `The start number must be between ${minimumStartNumber} and ${maximumStartNumber}.`,
    )
  }

  const option = numberingSeparatorOptions.find((candidate) => candidate.id === separator)
  if (!option) throw new RangeError(`Unknown separator: ${separator}`)

  const lines = text.split("\n")
  const endNumber = startNumber + lines.length - 1
  const maxDigits = String(Math.max(endNumber, startNumber)).length
  const suffix = separator === "custom" ? customSeparator : (option.template ?? ". ")

  return lines
    .map((line, index) => {
      const number = startNumber + index
      const rendered = padding === "auto" ? String(number).padStart(maxDigits, " ") : String(number)
      return `${rendered}${suffix}${line}`
    })
    .join("\n")
}
