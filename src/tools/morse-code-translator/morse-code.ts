export const letterToMorse: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "'": ".----.",
  "!": "-.-.--",
  "/": "-..-.",
  "(": "-.--.",
  ")": "-.--.-",
  "&": ".-...",
  ":": "---...",
  ";": "-.-.-.",
  "=": "-...-",
  "+": ".-.-.",
  "-": "-....-",
  _: "..--.-",
  '"': ".-..-.",
  $: "...-..-",
  "@": ".--.-.",
}

export const morseToLetter: Record<string, string> = Object.fromEntries(
  Object.entries(letterToMorse).map(([letter, morse]) => [morse, letter]),
)

export const morseDirections = ["text-morse", "morse-text"] as const
export type MorseDirection = (typeof morseDirections)[number]

export function getMorseDirection(id: string): MorseDirection {
  return morseDirections.includes(id as MorseDirection) ? (id as MorseDirection) : "text-morse"
}

/**
 * Encodes text: spaces become word separators (`/`), letters become their
 * Morse code, and characters outside the supported set are dropped.
 */
export function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((char) => (char === " " ? "/" : (letterToMorse[char] ?? "")))
    .filter((code) => code !== "" && code !== undefined)
    .join(" ")
}

/**
 * The characters that `textToMorse` cannot represent (after uppercasing).
 * The UI uses this to disclose what was dropped instead of failing silently.
 */
export function unsupportedMorseCharacters(text: string): string[] {
  return [
    ...new Set([...text.toUpperCase()].filter((char) => char !== " " && !(char in letterToMorse))),
  ]
}

/** Decodes Morse back to text; unrecognized code groups are dropped. */
export function morseToText(morse: string): string {
  return morse
    .split("/")
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter((token) => token !== "")
        .map((code) => morseToLetter[code] ?? "")
        .join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * The code groups that `morseToText` could not decode. The UI uses this to
 * disclose what was dropped instead of failing silently.
 */
export function unsupportedMorseGroups(morse: string): string[] {
  const unsupported = new Set<string>()
  for (const word of morse.split("/")) {
    for (const token of word.trim().split(/\s+/)) {
      if (token !== "" && !(token in morseToLetter)) {
        unsupported.add(token)
      }
    }
  }
  return [...unsupported]
}
