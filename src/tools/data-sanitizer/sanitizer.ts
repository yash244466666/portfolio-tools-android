export const sanitizerOptions = [
  {
    id: "emails",
    label: "Email Addresses",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL REDACTED]",
  },
  {
    id: "phones",
    label: "Phone Numbers",
    pattern: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    replacement: "[PHONE REDACTED]",
  },
  {
    id: "ips",
    label: "IP Addresses",
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: "[IP REDACTED]",
  },
  {
    id: "ssn",
    label: "SSN Patterns (XXX-XX-XXXX)",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN REDACTED]",
  },
  {
    id: "creditCards",
    label: "Credit Card Patterns",
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: "[CC REDACTED]",
  },
] as const

export type SanitizerOptionId = (typeof sanitizerOptions)[number]["id"]

export const maximumSanitizerChars = 100_000

export interface SanitizeResult {
  text: string
  counts: Record<SanitizerOptionId, number>
}

export type EnabledMap = Record<SanitizerOptionId, boolean>

export const defaultEnabled: EnabledMap = {
  emails: true,
  phones: true,
  ips: true,
  ssn: true,
  creditCards: true,
}

/**
 * Runs each enabled replacement over the input in a fixed order. The
 * upstream pattern set is kept verbatim because these redaction patterns are
 * the audited behavior; counts report matches replaced per option.
 */
export function sanitizeText(input: string, enabled: EnabledMap): SanitizeResult {
  let result = input
  const counts: Record<SanitizerOptionId, number> = {
    emails: 0,
    phones: 0,
    ips: 0,
    ssn: 0,
    creditCards: 0,
  }
  for (const option of sanitizerOptions) {
    if (!enabled[option.id]) continue
    const matches = result.match(option.pattern)
    counts[option.id] = matches ? matches.length : 0
    result = result.replace(option.pattern, option.replacement)
  }
  return { text: result, counts }
}
