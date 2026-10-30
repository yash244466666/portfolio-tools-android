export const maximumPasswordChars = 256

export type PasswordStrengthBand = "very-weak" | "weak" | "fair" | "strong" | "very-strong"

export interface PasswordCheck {
  id: string
  label: string
  pass: boolean
}

export interface PasswordAnalysis {
  length: number
  entropy: number
  poolSize: number
  score: number
  band: PasswordStrengthBand
  bandLabel: string
  crackTime: string
  checks: PasswordCheck[]
}

const bandLabels: Record<PasswordStrengthBand, string> = {
  "very-weak": "Very Weak",
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
  "very-strong": "Very Strong",
}

/**
 * Strength bands follow the upstream entropy thresholds; the labels are
 * distinct even where two adjacent bands share a crack-time estimate.
 */
function bandFor(entropy: number): PasswordStrengthBand {
  if (entropy < 36) return "very-weak"
  if (entropy < 60) return "weak"
  if (entropy < 80) return "fair"
  if (entropy < 100) return "strong"
  return "very-strong"
}

function crackTimeFor(entropy: number): string {
  if (entropy === 0) return "Instant"
  if (entropy < 28) return "Less than a second"
  if (entropy < 36) return "A few seconds"
  if (entropy < 60) return "Minutes to hours"
  if (entropy < 80) return "Days to months"
  if (entropy < 100) return "Years"
  return "Centuries+"
}

/**
 * Analyzes a password with the upstream length/classes/score model. The
 * upstream empty-password state collapsed into an "Instant" result with an
 * empty strength band; here an empty password yields entropy 0 with an
 * explicit very-weak band and "instant" crack time instead of blank labels.
 */
export function analyzePassword(password: string): PasswordAnalysis {
  // Canonically equivalent input must score identically: "é" typed as one
  // code point and "e" + U+0301 are the same password to a login form. The
  // length is counted in code points, matching the app's character tools, so
  // an emoji is one character rather than a surrogate pair.
  const normalized = password.normalize("NFC")
  const length = [...normalized].length
  const hasLowercase = /[a-z]/.test(normalized)
  const hasUppercase = /[A-Z]/.test(normalized)
  const hasNumbers = /[0-9]/.test(normalized)
  const hasSymbols = /[^a-zA-Z0-9]/.test(normalized)

  let poolSize = 0
  if (hasLowercase) poolSize += 26
  if (hasUppercase) poolSize += 26
  if (hasNumbers) poolSize += 10
  if (hasSymbols) poolSize += 33

  const entropy = poolSize > 0 ? length * Math.log2(poolSize) : 0

  let score = 0
  if (length > 0) score += 0.1
  if (length >= 8) score += 0.15
  if (length >= 12) score += 0.1
  if (length >= 16) score += 0.1
  if (hasLowercase) score += 0.1
  if (hasUppercase) score += 0.1
  if (hasNumbers) score += 0.1
  if (hasSymbols) score += 0.15
  if (entropy > 60) score += 0.1
  score = Math.min(1, score)

  const band = bandFor(entropy)
  const crackTime = crackTimeFor(entropy)

  return {
    length,
    entropy: Math.round(entropy),
    poolSize,
    score,
    band,
    bandLabel: bandLabels[band],
    crackTime,
    checks: [
      { id: "uppercase", label: "Uppercase letter (A-Z)", pass: hasUppercase },
      { id: "lowercase", label: "Lowercase letter (a-z)", pass: hasLowercase },
      { id: "number", label: "Number (0-9)", pass: hasNumbers },
      { id: "symbol", label: "Symbol (!@#$...)", pass: hasSymbols },
      { id: "length8", label: "At least 8 characters", pass: length >= 8 },
      { id: "length12", label: "At least 12 characters", pass: length >= 12 },
      { id: "length16", label: "At least 16 characters", pass: length >= 16 },
    ],
  }
}
